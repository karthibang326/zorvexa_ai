import { prisma } from "../../lib/prisma";
import { usePrismaPersistence } from "../../lib/prisma-env";
import { env } from "../../config/env";
import { logError } from "../../lib/logger";
import type { Prisma } from "@prisma/client";
import { compareBeforeAfter } from "../ai-ops-learning/feedback.engine";
import type { MetricsState as OpsMetricsState } from "../ai-ops-learning/types";
import type {
  ActionKind,
  DecisionResult,
  DetectionResult,
  ExecutionResult,
  LearningHints,
  MetricSnapshot,
  VerificationResult,
} from "../ai-decision-engine/types";

const WINDOW = 80;

function learningEnabled() {
  return env.AI_LEARNING_ENABLED === "true";
}

export async function getLearningHintsForResource(resource: string, orgId?: string): Promise<LearningHints | undefined> {
  if (!learningEnabled() || !usePrismaPersistence()) return undefined;
  try {
    const rows = await prisma.aiLearning.findMany({
      where: { resource, ...(orgId ? { orgId } : {}) },
      orderBy: { createdAt: "desc" },
      take: WINDOW,
      select: { action: true, executionSuccess: true, outcomeImproved: true },
    });
    const byAction: Record<string, { ok: number; n: number }> = {};
    for (const r of rows) {
      if (r.action === "none") continue;
      const b = byAction[r.action] ?? { ok: 0, n: 0 };
      b.n += 1;
      if (r.executionSuccess && r.outcomeImproved) b.ok += 1;
      byAction[r.action] = b;
    }
    const minS = env.AI_LEARNING_MIN_SAMPLES;
    const successRateByAction: Partial<Record<ActionKind, number>> = {};
    const sampleSizeByAction: Partial<Record<ActionKind, number>> = {};
    for (const [action, v] of Object.entries(byAction)) {
      if (v.n < minS) continue;
      successRateByAction[action as ActionKind] = v.ok / v.n;
      sampleSizeByAction[action as ActionKind] = v.n;
    }
    if (Object.keys(successRateByAction).length === 0) return undefined;
    return { successRateByAction, sampleSizeByAction };
  } catch {
    return undefined;
  }
}

export async function recordAiLearningOutcome(args: {
  correlationId: string;
  orgId?: string;
  resource: string;
  action: string;
  provider: string;
  detection: DetectionResult;
  decision: DecisionResult;
  execution: ExecutionResult;
  verification: VerificationResult;
  outcome: string;
  beforeMetrics: MetricSnapshot;
}): Promise<void> {
  if (!learningEnabled() || !usePrismaPersistence()) return;
  try {
    const executionSuccess = args.execution.success;
    const outcomeImproved = args.verification.improved;
    const latB = args.beforeMetrics.latencyP95Ms;
    const latA = args.verification.after.latencyP95Ms;
    let patternFlags: Record<string, unknown> | undefined = {
      latencyDeltaMs: latA - latB,
    };

    const prev = await prisma.aiLearning.findFirst({
      where: { resource: args.resource },
      orderBy: { createdAt: "desc" },
      select: { latencyAfter: true, improvementScore: true },
    });
    if (prev?.latencyAfter != null) {
      const trend = latA > prev.latencyAfter + 10 ? "up" : latA < prev.latencyAfter - 10 ? "down" : "flat";
      patternFlags = { ...patternFlags, latencyTrendVsPrior: trend };
    }

    await prisma.aiLearning.create({
      data: {
        correlationId: args.correlationId,
        orgId: args.orgId ?? "org-1",
        resource: args.resource,
        action: args.action,
        provider: args.provider,
        executionSuccess,
        outcomeImproved,
        outcome: args.outcome,
        metricsBefore: {
          cpuPct: args.beforeMetrics.cpuPct,
          memoryPct: args.beforeMetrics.memoryPct,
          latencyP95Ms: args.beforeMetrics.latencyP95Ms,
          errorRateBps: args.beforeMetrics.errorRateBps,
        },
        metricsAfter: args.verification.after,
        improvementScore: args.verification.improvementScore,
        latencyBefore: latB,
        latencyAfter: latA,
        costSignal: args.beforeMetrics.cpuPct * 0.4 + args.beforeMetrics.latencyP95Ms * 0.001,
        patternFlags: patternFlags as object,
        detection: args.detection as object,
        decision: args.decision as object,
        execution: args.execution as object,
      },
    });
  } catch (e) {
    logError("ai_learning_persist_failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

/** Persist ops-loop (observe→act→verify) outcomes into `ai_learning` for tenant-scoped analytics. */
export async function recordAiLearningFromOpsLoop(args: {
  correlationId: string;
  orgId: string;
  resource: string;
  action: string;
  provider: string;
  before: OpsMetricsState;
  after: OpsMetricsState;
  execution: { status?: string; message?: string; experienceId?: string };
  decision: { confidence: number; reason: string };
  findings: string[];
}): Promise<void> {
  if (!learningEnabled() || !usePrismaPersistence()) return;
  try {
    const fb = compareBeforeAfter(args.before, args.after);
    const st = String(args.execution.status ?? "");
    const executionSuccess = st === "EXECUTED" || st === "SIMULATED_SUCCESS";
    const outcomeImproved = fb.result === "success" || fb.result === "partial";
    const latB = Number(args.before.latency ?? 0);
    const latA = Number(args.after.latency ?? 0);
    const costB = Number(args.before.cost ?? 0);
    const costA = Number(args.after.cost ?? 0);

    const prev = await prisma.aiLearning.findFirst({
      where: { resource: args.resource, orgId: args.orgId },
      orderBy: { createdAt: "desc" },
      select: { costSignal: true, latencyAfter: true },
    });
    const patternFlags: Record<string, unknown> = {
      source: "ops_autonomous_loop",
      feedbackResult: fb.result,
      latencyDeltaPct: latB > 0 ? ((latA - latB) / latB) * 100 : null,
      costDeltaPct: costB > 0 ? ((costA - costB) / costB) * 100 : null,
    };
    if (prev?.costSignal != null && args.before.cost != null) {
      const trend = costB > prev.costSignal * 1.05 ? "up" : costB < prev.costSignal * 0.95 ? "down" : "flat";
      patternFlags.costTrendVsRolling = trend;
    }
    if (prev?.latencyAfter != null) {
      patternFlags.latencyTrendVsPrior =
        latA > (prev.latencyAfter ?? 0) + 15 ? "up" : latA < (prev.latencyAfter ?? 0) - 15 ? "down" : "flat";
    }

    const improvementScore =
      fb.result === "success" ? 0.85 : fb.result === "partial" ? 0.55 : fb.result === "failure" ? 0.2 : 0.5;

    await prisma.aiLearning.create({
      data: {
        correlationId: args.correlationId,
        orgId: args.orgId,
        resource: args.resource,
        action: args.action,
        provider: args.provider,
        executionSuccess,
        outcomeImproved,
        outcome: fb.summary,
        metricsBefore: {
          cpu: args.before.cpu,
          memory: args.before.memory,
          latency: args.before.latency,
          errorRate: args.before.errorRate,
          cost: args.before.cost,
          traffic: args.before.traffic,
        } as Prisma.InputJsonValue,
        metricsAfter: {
          cpu: args.after.cpu,
          memory: args.after.memory,
          latency: args.after.latency,
          errorRate: args.after.errorRate,
          cost: args.after.cost,
          traffic: args.after.traffic,
        } as Prisma.InputJsonValue,
        improvementScore,
        latencyBefore: latB,
        latencyAfter: latA,
        costSignal: costB * 0.5 + latB * 0.01,
        patternFlags: patternFlags as Prisma.InputJsonValue,
        detection: { findings: args.findings, phase: "ops_loop" } as Prisma.InputJsonValue,
        decision: {
          confidence: args.decision.confidence,
          reason: args.decision.reason,
          action: args.action,
        } as Prisma.InputJsonValue,
        execution: args.execution as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    logError("ai_learning_ops_persist_failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

export async function getRecentSuccessRate(
  resource: string,
  action: string,
  limit: number,
  orgId?: string
): Promise<number | null> {
  if (!learningEnabled() || !usePrismaPersistence()) return null;
  try {
    const rows = await prisma.aiLearning.findMany({
      where: { resource, action, ...(orgId ? { orgId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { executionSuccess: true, outcomeImproved: true },
    });
    if (rows.length < env.AI_LEARNING_MIN_SAMPLES) return null;
    const ok = rows.filter((r) => r.executionSuccess && r.outcomeImproved).length;
    return ok / rows.length;
  } catch {
    return null;
  }
}

export type AiLearningRecord = {
  id: string;
  correlationId: string;
  resource: string;
  action: string;
  provider: string;
  executionSuccess: boolean;
  outcomeImproved: boolean;
  outcome: string;
  improvementScore: number | null;
  createdAt: string;
  detection: unknown;
  decision: unknown;
  execution: unknown;
};

export async function listRecentAiLearning(limit: number, orgId?: string): Promise<AiLearningRecord[]> {
  if (!learningEnabled() || !usePrismaPersistence()) return [];
  try {
    let rows = await prisma.aiLearning.findMany({
      where: orgId ? { orgId } : {},
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
      select: {
        id: true,
        correlationId: true,
        resource: true,
        action: true,
        provider: true,
        executionSuccess: true,
        outcomeImproved: true,
        outcome: true,
        improvementScore: true,
        createdAt: true,
        detection: true,
        decision: true,
        execution: true,
      },
    });
    // In local/dev, org context may be a freshly-created UUID while learning samples may still be global/demo.
    // If scoped query returns no rows, fall back to returning recent rows across orgs.
    if (orgId && rows.length === 0) {
      rows = await prisma.aiLearning.findMany({
        orderBy: { createdAt: "desc" },
        take: Math.min(100, Math.max(1, limit)),
        select: {
          id: true,
          correlationId: true,
          resource: true,
          action: true,
          provider: true,
          executionSuccess: true,
          outcomeImproved: true,
          outcome: true,
          improvementScore: true,
          createdAt: true,
          detection: true,
          decision: true,
          execution: true,
        },
      });
    }
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export type LearningDashboard = {
  totalSamples: number;
  /** Mean improvement score on non-noop actions */
  aiAccuracyPct: number | null;
  /** Share of outcomes that were improved after execution succeeded */
  successRatePct: number | null;
  byAction: Record<string, { successRatePct: number; samples: number }>;
  /** Per workload / service (resource id) */
  byService: Record<string, { successRatePct: number; samples: number }>;
  latencyTrend: "rising" | "falling" | "stable" | "unknown";
  /** From rolling costSignal on recent samples */
  costTrend: "rising" | "falling" | "stable" | "unknown";
  /** Distinct action types with at least one sample */
  learnedActionsCount: number;
  /** True when rolling success rate is below AI_LEARNING_MIN_SUCCESS_RATE — align with approval guard */
  lowSuccessApprovalRecommended: boolean;
  recentLearned: Array<{
    id: string;
    resource: string;
    action: string;
    outcome: string;
    improved: boolean;
    improvementScore: number | null;
    createdAt: string;
  }>;
};

export async function getLearningDashboard(orgId?: string): Promise<LearningDashboard> {
  const empty: LearningDashboard = {
    totalSamples: 0,
    aiAccuracyPct: null,
    successRatePct: null,
    byAction: {},
    byService: {},
    latencyTrend: "unknown",
    costTrend: "unknown",
    learnedActionsCount: 0,
    lowSuccessApprovalRecommended: false,
    recentLearned: [],
  };
  if (!learningEnabled() || !usePrismaPersistence()) return empty;
  try {
    const where = orgId ? { orgId } : {};
    let recent = await prisma.aiLearning.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    // Same local/dev fallback as listRecentAiLearning: show global learning rows if org-scoped has none.
    if (orgId && recent.length === 0) {
      recent = await prisma.aiLearning.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }
    const actionable = recent.filter((r) => r.action !== "none");
    empty.totalSamples = recent.length;

    if (actionable.length) {
      const scores = actionable.map((r) => r.improvementScore).filter((s): s is number => typeof s === "number");
      empty.aiAccuracyPct =
        scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const succ = actionable.filter((r) => r.executionSuccess && r.outcomeImproved).length;
      empty.successRatePct = Math.round((succ / actionable.length) * 1000) / 10;
    }

    const byAction: Record<string, { ok: number; n: number }> = {};
    for (const r of recent) {
      if (r.action === "none") continue;
      const b = byAction[r.action] ?? { ok: 0, n: 0 };
      b.n += 1;
      if (r.executionSuccess && r.outcomeImproved) b.ok += 1;
      byAction[r.action] = b;
    }
    for (const [k, v] of Object.entries(byAction)) {
      empty.byAction[k] = {
        successRatePct: Math.round((v.ok / v.n) * 1000) / 10,
        samples: v.n,
      };
    }
    empty.learnedActionsCount = Object.keys(empty.byAction).length;

    const byService: Record<string, { ok: number; n: number }> = {};
    for (const r of recent) {
      if (r.action === "none") continue;
      const b = byService[r.resource] ?? { ok: 0, n: 0 };
      b.n += 1;
      if (r.executionSuccess && r.outcomeImproved) b.ok += 1;
      byService[r.resource] = b;
    }
    for (const [k, v] of Object.entries(byService)) {
      empty.byService[k] = {
        successRatePct: Math.round((v.ok / v.n) * 1000) / 10,
        samples: v.n,
      };
    }

    const latRows = recent
      .filter((r) => r.latencyBefore != null && r.latencyAfter != null)
      .slice(0, 12)
      .map((r) => (r.latencyAfter! - r.latencyBefore!) / (r.latencyBefore! || 1));
    if (latRows.length >= 3) {
      const avg = latRows.reduce((a, b) => a + b, 0) / latRows.length;
      empty.latencyTrend = avg > 0.02 ? "rising" : avg < -0.02 ? "falling" : "stable";
    }

    const costSignals = recent
      .filter((r) => r.costSignal != null)
      .slice(0, 16)
      .map((r) => r.costSignal!);
    if (costSignals.length >= 4) {
      const n = costSignals.length;
      const half = Math.floor(n / 2);
      // `recent` is newest-first; costSignals[0] = newest, costSignals[n-1] = oldest
      const newerAvg = costSignals.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const olderAvg = costSignals.slice(half).reduce((a, b) => a + b, 0) / (n - half);
      const rel = olderAvg > 0 ? (newerAvg - olderAvg) / olderAvg : 0;
      empty.costTrend = rel > 0.03 ? "rising" : rel < -0.03 ? "falling" : "stable";
    }

    if (empty.successRatePct != null) {
      empty.lowSuccessApprovalRecommended =
        empty.successRatePct / 100 < env.AI_LEARNING_MIN_SUCCESS_RATE &&
        actionable.length >= env.AI_LEARNING_MIN_SAMPLES;
    }

    empty.recentLearned = recent.slice(0, 10).map((r) => ({
      id: r.id,
      resource: r.resource,
      action: r.action,
      outcome: r.outcome,
      improved: r.outcomeImproved,
      improvementScore: r.improvementScore,
      createdAt: r.createdAt.toISOString(),
    }));

    return empty;
  } catch {
    return empty;
  }
}
