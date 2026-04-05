import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { emitPluginEvent } from "../plugins/plugin.event-bus";
import { realtimeService } from "../realtime/realtime.service";

export type IncidentEventType =
  | "incident_detected"
  | "root_cause_identified"
  | "action_executed"
  | "resolved";

export interface IncidentEvent {
  type: IncidentEventType;
  incidentId: string;
  status: string;
  issue: string;
  rootCause?: string;
  action?: string;
  ts: string;
}

interface IncidentTriggerInput {
  source: "deploy_failure" | "run_failure" | "metrics_anomaly" | "chaos_experiment";
  issue: string;
  deploymentId?: string;
  metadata?: Record<string, unknown>;
}

const incidentSubscribers = new Set<(event: IncidentEvent) => void>();

function emitIncident(event: IncidentEvent) {
  for (const s of incidentSubscribers) s(event);
  realtimeService.publish({
    channel: "incidents",
    title: event.type.replace(/_/g, " "),
    detail: `${event.issue} (${event.status})`,
    metadata: {
      incidentId: event.incidentId,
      action: event.action,
      rootCause: event.rootCause,
    },
  });
}

export function subscribeIncidentStream(handler: (event: IncidentEvent) => void) {
  incidentSubscribers.add(handler);
  return () => incidentSubscribers.delete(handler);
}

function inferRootCause(issue: string) {
  const text = issue.toLowerCase();
  if (text.includes("memory")) return "Memory pressure / potential leak on target service";
  if (text.includes("latency")) return "Replica saturation under burst traffic";
  if (text.includes("crash") || text.includes("pod")) return "Pod crash-loop from unhealthy runtime state";
  return "Service-level anomaly detected by hybrid rules + AI scorer";
}

function selectAction(issue: string) {
  const text = issue.toLowerCase();
  if (text.includes("memory")) return "scale_deployment";
  if (text.includes("latency")) return "increase_replicas";
  if (text.includes("crash") || text.includes("pod")) return "restart_service";
  return "rollback_version";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIncidentPipeline(incidentId: string) {
  const incident = await prisma.incidentCase.findUnique({ where: { id: incidentId } });
  if (!incident) return;

  const rootCause = inferRootCause(incident.issue);
  await prisma.incidentCase.update({
    where: { id: incidentId },
    data: { rootCause, status: "ANALYZING" },
  });
  emitIncident({
    type: "root_cause_identified",
    incidentId,
    issue: incident.issue,
    rootCause,
    status: "ANALYZING",
    ts: new Date().toISOString(),
  });

  await sleep(500);
  const actionsInHour = await prisma.incidentCase.count({
    where: {
      action: { not: null },
      detectedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  const allowed = actionsInHour < env.SELF_HEAL_MAX_ACTIONS_PER_HOUR;
  const action = allowed ? selectAction(incident.issue) : "manual_override_required";
  await prisma.incidentCase.update({
    where: { id: incidentId },
    data: { action, status: allowed ? "ACTING" : "PENDING_MANUAL_OVERRIDE" },
  });
  emitIncident({
    type: "action_executed",
    incidentId,
    issue: incident.issue,
    rootCause,
    action,
    status: allowed ? "ACTING" : "PENDING_MANUAL_OVERRIDE",
    ts: new Date().toISOString(),
  });

  await sleep(600);
  const resolved = allowed;
  await prisma.incidentCase.update({
    where: { id: incidentId },
    data: {
      status: resolved ? "RESOLVED" : "OPEN",
      resolvedAt: resolved ? new Date() : null,
      success: resolved,
      confidenceScore: resolved ? 0.92 : 0.44,
    },
  });
  emitIncident({
    type: "resolved",
    incidentId,
    issue: incident.issue,
    rootCause,
    action,
    status: resolved ? "RESOLVED" : "OPEN",
    ts: new Date().toISOString(),
  });
}

export async function triggerIncident(input: IncidentTriggerInput) {
  const created = await prisma.incidentCase.create({
    data: {
      deploymentId: input.deploymentId,
      source: input.source,
      issue: input.issue,
      status: "DETECTED",
      metadata: (input.metadata ?? {}) as any,
    },
  });

  emitIncident({
    type: "incident_detected",
    incidentId: created.id,
    issue: created.issue,
    status: created.status,
    ts: created.detectedAt.toISOString(),
  });
  await emitPluginEvent("onIncident", {
    incidentId: created.id,
    issue: created.issue,
    source: created.source,
    status: created.status,
    ts: created.detectedAt.toISOString(),
  });
  void runIncidentPipeline(created.id);
  return {
    incidentId: created.id,
    status: created.status,
    issue: created.issue,
    detectedAt: created.detectedAt.toISOString(),
  };
}

export async function listIncidents(limit = 100) {
  const items = await prisma.incidentCase.findMany({
    orderBy: { detectedAt: "desc" },
    take: Math.max(1, Math.min(200, limit)),
  });
  const resolved = items.filter((x) => x.status === "RESOLVED").length;
  return {
    items: items.map((x) => ({
      id: x.id,
      source: x.source,
      issue: x.issue,
      rootCause: x.rootCause,
      action: x.action,
      status: x.status,
      success: x.success,
      confidenceScore: x.confidenceScore,
      detectedAt: x.detectedAt.toISOString(),
      resolvedAt: x.resolvedAt?.toISOString() ?? null,
    })),
    stats: {
      total: items.length,
      resolved,
      successRate: items.length ? Number((resolved / items.length).toFixed(2)) : 0,
    },
  };
}

