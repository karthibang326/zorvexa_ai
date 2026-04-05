import { getAiDecisionsQueue, getAstraExecutorQueue } from "../../lib/queue";
import type { AstraExecutorJob } from "../../workers/astra-executor.worker";
import {
  getDecisionById,
  getWorkloadOrgScope,
  insertWorkload,
  listDecisionsAwaitingApproval,
  updateDecisionFeedback,
  updateDecisionStatus,
} from "./astra-ops.repository";
import type { AiDecisionRow, WorkloadRow } from "./astra-ops.types";

export async function ingestMetrics(
  body: {
    env_id: string;
    name: string;
    cpu: number;
    memory: number;
    cost: number;
  },
  scope: { orgId: string; projectId: string; envId: string }
): Promise<{ status: string; workload: WorkloadRow }> {
  const workload = await insertWorkload({
    environmentId: body.env_id,
    name: body.name,
    cpu: body.cpu,
    memory: body.memory,
    cost: body.cost,
  });

  await getAiDecisionsQueue().add(
    "analyze",
    { workload, scope },
    {
      jobId: `astra-ai-${workload.id}`,
      removeOnComplete: { age: 3600, count: 2000 },
    }
  );

  return { status: "ingested", workload };
}

export async function listPendingApprovals(): Promise<{ decisions: AiDecisionRow[] }> {
  const decisions = await listDecisionsAwaitingApproval(100);
  return { decisions };
}

export async function approveDecision(decisionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await getDecisionById(decisionId);
  if (!row) return { ok: false, error: "decision_not_found" };
  if (row.status !== "awaiting_approval") {
    return { ok: false, error: "not_awaiting_approval" };
  }
  if (row.workload_id == null || row.action == null || row.reason == null || row.confidence == null) {
    return { ok: false, error: "incomplete_decision" };
  }

  const ws = await getWorkloadOrgScope(row.workload_id);
  const payload: AstraExecutorJob = {
    decisionId: row.id,
    workloadId: row.workload_id,
    action: row.action,
    reason: row.reason,
    confidence: row.confidence,
    approved: true,
    risk: "medium",
    ...(ws
      ? { orgId: ws.orgId, projectId: ws.projectId, envId: ws.envId }
      : {}),
  };

  await getAstraExecutorQueue().add("execute", payload, {
    jobId: `astra-exec-approved-${row.id}`,
    removeOnComplete: { age: 3600, count: 2000 },
  });

  return { ok: true };
}

export async function rejectDecision(decisionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await getDecisionById(decisionId);
  if (!row) return { ok: false, error: "decision_not_found" };
  if (row.status !== "awaiting_approval") {
    return { ok: false, error: "not_awaiting_approval" };
  }

  await updateDecisionStatus(decisionId, "rejected");
  if (row.action != null && row.reason != null && row.confidence != null) {
    const { feedbackLoop } = await import("../../core/astra-ops/feedback/loop");
    const { improvedConfidence } = feedbackLoop(
      { action: row.action, reason: row.reason, confidence: row.confidence },
      { success: false }
    );
    await updateDecisionFeedback(decisionId, { success: false, improvedConfidence });
  }

  return { ok: true };
}
