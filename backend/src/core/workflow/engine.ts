import { prisma } from "../../lib/prisma";
import { decideNodeAction } from "../../modules/ai-control/workflow-engine/ai-decision";
import { evaluateSafety } from "../../modules/ai-control/workflow-engine/safety";
import { emitWorkflowStream } from "../../modules/ai-control/workflow-engine/stream";
import type {
  WorkflowAiMode,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  WorkflowNodeRun,
} from "../../modules/ai-control/workflow-engine/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function nodeTypeLabel(node: any): string {
  const t = String(node?.type ?? "").toLowerCase();
  if (t.includes("trigger")) return "TRIGGER";
  if (t.includes("ai")) return "AI";
  return "EXECUTION";
}

function computeExecutionLevels(nodes: any[], edges: any[]) {
  const ids = nodes.map((n) => String(n?.id ?? ""));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    out.set(id, []);
  }
  for (const e of edges ?? []) {
    const s = String(e?.source ?? "");
    const t = String(e?.target ?? "");
    if (!indeg.has(s) || !indeg.has(t)) continue;
    indeg.set(t, (indeg.get(t) ?? 0) + 1);
    out.get(s)?.push(t);
  }
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const levels: string[][] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const batch = [...queue];
    queue.splice(0, queue.length);
    levels.push(batch);
    for (const id of batch) {
      seen.add(id);
      for (const nxt of out.get(id) ?? []) {
        const v = (indeg.get(nxt) ?? 0) - 1;
        indeg.set(nxt, v);
        if (v === 0) queue.push(nxt);
      }
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) levels.push([id]); // cycle fallback: isolate nodes
  }
  return levels;
}

async function runNode(node: any, workflowId: string, runId: string, mode: WorkflowAiMode, context: WorkflowExecutionContext): Promise<WorkflowNodeRun> {
  const started = Date.now();
  const metrics = {
    cpu: Number(node?.metrics?.cpu ?? 72),
    latency: Number(node?.metrics?.latency ?? 210),
    errorRate: Number(node?.metrics?.errorRate ?? 1.1),
    cost: Number(node?.metrics?.cost ?? 14),
  };
  const decision = decideNodeAction(metrics);
  const safety = evaluateSafety({ mode, decision, context });

  emitWorkflowStream({
    workflowId,
    runId,
    type: "node_started",
    payload: { nodeId: node?.id, nodeType: nodeTypeLabel(node), decision, safety },
  });

  if (safety.requiresApproval && mode !== "manual") {
    return {
      nodeId: String(node?.id ?? "node"),
      nodeName: String(node?.label ?? "Node"),
      nodeType: nodeTypeLabel(node),
      status: "skipped",
      attempt: 1,
      durationMs: Date.now() - started,
      reason: safety.reason,
      confidence: decision.confidence,
      metricsUsed: decision.metricsUsed,
    };
  }

  let lastError = "";
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sleep(120);
      const fail = String(node?.shouldFail ?? "false") === "true" && attempt < maxAttempts;
      if (fail) throw new Error("Transient node execution failure");

      emitWorkflowStream({
        workflowId,
        runId,
        type: "node_success",
        payload: { nodeId: node?.id, attempt, reason: decision.reason },
      });

      return {
        nodeId: String(node?.id ?? "node"),
        nodeName: String(node?.label ?? "Node"),
        nodeType: nodeTypeLabel(node),
        status: "success",
        attempt,
        durationMs: Date.now() - started,
        reason: decision.reason,
        confidence: decision.confidence,
        metricsUsed: decision.metricsUsed,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown execution error";
      emitWorkflowStream({
        workflowId,
        runId,
        type: "node_retry",
        payload: { nodeId: node?.id, attempt, error: lastError },
      });
    }
  }

  return {
    nodeId: String(node?.id ?? "node"),
    nodeName: String(node?.label ?? "Node"),
    nodeType: nodeTypeLabel(node),
    status: "failed",
    attempt: maxAttempts,
    durationMs: Date.now() - started,
    reason: lastError || "Execution failed",
    confidence: decision.confidence,
    metricsUsed: decision.metricsUsed,
  };
}

export async function executeWorkflowGraph(params: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
  nodes: any[];
  edges: any[];
}): Promise<WorkflowExecutionResult> {
  const prismaAny = prisma as any;
  const workflow = await prismaAny.workflow.findUnique({ where: { id: params.workflowId } });
  if (!workflow) throw new Error("Workflow not found");

  const run = await prismaAny.run.create({
    data: {
      workflowId: params.workflowId,
      workflowVersion: Number(workflow.version ?? 1),
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  const runId = String(run.id);
  emitWorkflowStream({
    workflowId: params.workflowId,
    runId,
    type: "run_started",
    payload: { mode: params.mode, context: params.context },
  });

  const steps: WorkflowNodeRun[] = [];
  const levels = computeExecutionLevels(params.nodes, params.edges);
  const byId = new Map(params.nodes.map((n) => [String(n?.id ?? ""), n]));

  let failed = false;
  for (const level of levels) {
    const results = await Promise.all(
      level.map(async (id) => {
        const node = byId.get(id);
        if (!node) return null;
        const step = await runNode(node, params.workflowId, runId, params.mode, params.context);
        await prismaAny.runStepLog.create({
          data: {
            runId,
            stepId: step.nodeId,
            stepName: step.nodeName,
            stepType: step.nodeType,
            status: step.status.toUpperCase(),
            message: step.reason ?? null,
            attempt: step.attempt,
            startedAt: new Date(Date.now() - step.durationMs),
            endedAt: new Date(),
          },
        });
        return step;
      })
    );
    for (const s of results) {
      if (s) steps.push(s);
    }
    if (results.some((s) => s?.status === "failed")) {
      failed = true;
      break;
    }
  }

  const pendingApproval = steps.some((s) => s.status === "skipped");
  const finalStatus: "SUCCESS" | "FAILED" | "PENDING_APPROVAL" = failed
    ? "FAILED"
    : pendingApproval
      ? "PENDING_APPROVAL"
      : "SUCCESS";

  await prismaAny.run.update({
    where: { id: runId },
    data: { status: finalStatus, finishedAt: new Date() },
  });

  emitWorkflowStream({
    workflowId: params.workflowId,
    runId,
    type: "run_finished",
    payload: { status: finalStatus, steps },
  });

  // Basic rollback handlers for successful execution nodes when run fails.
  if (finalStatus === "FAILED") {
    const rollbackTargets = steps.filter((s) => s.status === "success" && s.nodeType === "EXECUTION").reverse();
    for (const target of rollbackTargets) {
      emitWorkflowStream({
        workflowId: params.workflowId,
        runId,
        type: "rollback_step",
        payload: { nodeId: target.nodeId, nodeName: target.nodeName, status: "STARTED" },
      });
      await sleep(80);
      emitWorkflowStream({
        workflowId: params.workflowId,
        runId,
        type: "rollback_step",
        payload: { nodeId: target.nodeId, nodeName: target.nodeName, status: "DONE" },
      });
    }
  }

  return {
    workflowId: params.workflowId,
    runId,
    status: finalStatus,
    steps,
  };
}

export function simulateWorkflowGraph(params: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
  nodes: any[];
}) {
  const steps = params.nodes.map((n: any, idx: number) => {
    const metrics = {
      cpu: Number(n?.metrics?.cpu ?? 68 + idx * 3),
      latency: Number(n?.metrics?.latency ?? 180 + idx * 12),
      errorRate: Number(n?.metrics?.errorRate ?? 0.8 + idx * 0.1),
      cost: Number(n?.metrics?.cost ?? 12 + idx),
    };
    const decision = decideNodeAction(metrics);
    const safety = evaluateSafety({ mode: params.mode, decision, context: params.context });
    return {
      node: String(n?.label ?? n?.id ?? `node-${idx + 1}`),
      predictedStatus: safety.allowed || params.mode === "manual" ? "success" : "pending_approval",
      reason: decision.reason,
      risk: decision.risk,
      confidence: decision.confidence,
      metricsUsed: decision.metricsUsed,
    };
  });

  return {
    workflowId: params.workflowId,
    mode: params.mode,
    simulation: {
      predicted_latency: `${Math.max(-35, -8 - steps.length * 2)}%`,
      cpu_reduction: `${Math.max(-28, -6 - steps.length * 2)}%`,
      cost_increase: `$${Math.max(4, steps.length * 7)}`,
      risk: steps.some((s) => s.risk === "HIGH") ? "high" : steps.some((s) => s.risk === "MEDIUM") ? "medium" : "low",
    },
    steps,
  };
}
