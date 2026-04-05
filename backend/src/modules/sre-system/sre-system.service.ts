import { prisma } from "../../lib/prisma";
import { detectAnomalies } from "./detection.engine";
import { decideAction } from "./decision.engine";
import { checkSafety } from "./safety.layer";
import { executeSreAction } from "./execution.engine";
import { SreMetrics } from "./sre-system.types";
import { emitPluginEvent } from "../plugins/plugin.event-bus";

type Scope = { orgId: string; projectId?: string; envId?: string };

const mode = {
  aiCeoModeEnabled: true,
  approvalRequired: true,
  maxActionsPerHour: 12,
};

const streamSubs = new Set<(event: Record<string, unknown>) => void>();

function publish(event: Record<string, unknown>) {
  for (const sub of streamSubs) sub(event);
}

export const sreSystemService = {
  subscribe(cb: (event: Record<string, unknown>) => void) {
    streamSubs.add(cb);
    return () => streamSubs.delete(cb);
  },

  setMode(input: Partial<typeof mode>) {
    Object.assign(mode, input);
    return mode;
  },

  getMode() {
    return mode;
  },

  async evaluate(params: {
    scope: Scope;
    resource: string;
    metrics: SreMetrics;
    provider: "aws" | "gcp" | "azure";
    namespace?: string;
  }) {
    await emitPluginEvent("onMetric", {
      orgId: params.scope.orgId,
      resource: params.resource,
      metrics: params.metrics,
      ts: new Date().toISOString(),
    });
    const detection = detectAnomalies(params.metrics);
    const plan = decideAction(params.metrics, params.resource);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const actionsInLastHour = await (prisma as any).sREAction.count({
      where: { orgId: params.scope.orgId, createdAt: { gte: oneHourAgo } },
    });
    const safety = checkSafety({
      plan,
      aiCeoModeEnabled: mode.aiCeoModeEnabled,
      approvalRequired: mode.approvalRequired,
      maxActionsPerHour: mode.maxActionsPerHour,
      actionsInLastHour,
    });

    const evaluation = {
      detection,
      plan,
      safety,
      confidenceScore: plan.confidence,
      ts: new Date().toISOString(),
    };
    publish({ type: "decision", ...evaluation });
    return evaluation;
  },

  async act(params: {
    scope: Scope;
    resource: string;
    metrics: SreMetrics;
    provider: "aws" | "gcp" | "azure";
    namespace?: string;
    force?: boolean;
  }) {
    const evaluated = await this.evaluate(params);
    if (!evaluated.safety.allowed && !params.force) {
      const record = await (prisma as any).sREAction.create({
        data: {
          orgId: params.scope.orgId,
          projectId: params.scope.projectId ?? null,
          environment: params.scope.envId ?? null,
          action: evaluated.plan.action,
          resource: params.resource,
          status: "PENDING_APPROVAL",
          result: evaluated.safety.reason,
          riskScore: evaluated.plan.riskScore,
          confidence: evaluated.plan.confidence,
          metadata: evaluated as any,
        },
      });
      publish({ type: "action_pending", id: record.id, reason: evaluated.safety.reason });
      return { acted: false, pendingApproval: true, evaluation: evaluated, actionId: record.id };
    }

    const execution = await executeSreAction({
      action: evaluated.plan.action,
      resource: params.resource,
      provider: params.provider,
      namespace: params.namespace,
      replicas: evaluated.plan.replicas,
    });

    const record = await (prisma as any).sREAction.create({
      data: {
        orgId: params.scope.orgId,
        projectId: params.scope.projectId ?? null,
        environment: params.scope.envId ?? null,
        action: evaluated.plan.action,
        resource: params.resource,
        status: execution.status,
        result: execution.result,
        riskScore: evaluated.plan.riskScore,
        confidence: evaluated.plan.confidence,
        metadata: {
          evaluation: evaluated,
          provider: params.provider,
          namespace: params.namespace,
        } as any,
      },
    });

    publish({ type: "action_executed", id: record.id, execution, confidenceScore: evaluated.plan.confidence });
    return { acted: execution.status === "EXECUTED", execution, evaluation: evaluated, actionId: record.id };
  },

  async listActions(scope: Scope, limit = 50) {
    return (prisma as any).sREAction.findMany({
      where: { orgId: scope.orgId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(200, limit)),
    });
  },
};

