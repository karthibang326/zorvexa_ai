import { prisma } from "../../../lib/prisma";
import { decideNodeAction } from "../../../modules/ai-control/workflow-engine/ai-decision";
import { evaluateSafety } from "../../../modules/ai-control/workflow-engine/safety";
import { emitWorkflowStream } from "../../../modules/ai-control/workflow-engine/stream";
import { persistRuntimeState, readLatestRuntimeState } from "./state-store";
import type { RuntimeContext, RuntimeMode, RuntimeState } from "./types";

function topoOrder(nodes: any[], edges: any[]) {
  const idSet = new Set(nodes.map((n) => String(n?.id ?? "")));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const id of idSet) {
    indeg.set(id, 0);
    out.set(id, []);
  }
  for (const e of edges ?? []) {
    const s = String(e?.source ?? "");
    const t = String(e?.target ?? "");
    if (!idSet.has(s) || !idSet.has(t)) continue;
    indeg.set(t, (indeg.get(t) ?? 0) + 1);
    out.get(s)?.push(t);
  }
  const q = Array.from(idSet).filter((i) => (indeg.get(i) ?? 0) === 0);
  const res: string[] = [];
  while (q.length) {
    const cur = q.shift()!;
    res.push(cur);
    for (const nxt of out.get(cur) ?? []) {
      const v = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, v);
      if (v === 0) q.push(nxt);
    }
  }
  return res.length ? res : nodes.map((n) => String(n?.id ?? ""));
}

export async function runWorkflowRuntime(params: {
  runId: string;
  workflowId: string;
  mode: RuntimeMode;
  context: RuntimeContext;
}) {
  const prismaAny = prisma as any;
  const wf = await prismaAny.workflow.findUnique({ where: { id: params.workflowId }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
  if (!wf) throw new Error("Workflow not found");
  const latest = wf.versions?.[0];
  const nodes = (latest?.nodes as any[]) ?? [];
  const edges = (latest?.edges as any[]) ?? [];
  const order = topoOrder(nodes, edges);
  const byId = new Map(nodes.map((n) => [String(n?.id ?? ""), n]));

  const prev = await readLatestRuntimeState(params.runId);
  let idx = 0;
  if (prev?.currentNode) {
    const i = order.indexOf(prev.currentNode);
    idx = i >= 0 ? i : 0;
  }
  const history = prev?.history ?? [];

  for (; idx < order.length; idx += 1) {
    const nodeId = order[idx]!;
    const node = byId.get(nodeId);
    if (!node) continue;
    const metrics = {
      cpu: Number(node?.metrics?.cpu ?? 70),
      latency: Number(node?.metrics?.latency ?? 200),
      errorRate: Number(node?.metrics?.errorRate ?? 1),
      cost: Number(node?.metrics?.cost ?? 14),
    };
    const decision = decideNodeAction(metrics);
    const safety = evaluateSafety({ mode: params.mode, decision, context: params.context });
    const stateBase: RuntimeState = {
      workflowId: params.workflowId,
      runId: params.runId,
      currentNode: nodeId,
      status: "RUNNING",
      history,
    };

    emitWorkflowStream({ workflowId: params.workflowId, runId: params.runId, type: "runtime.node.start", payload: { nodeId, decision, safety } });

    if (safety.requiresApproval && params.mode !== "manual") {
      const pending: RuntimeState = { ...stateBase, status: "PENDING_APPROVAL" };
      await prismaAny.run.update({ where: { id: params.runId }, data: { status: "PENDING_APPROVAL" } });
      await persistRuntimeState(params.runId, pending);
      emitWorkflowStream({ workflowId: params.workflowId, runId: params.runId, type: "runtime.approval.required", payload: { nodeId, reason: safety.reason } });
      return pending;
    }

    const attempt = 1;
    const fail = String(node?.shouldFail ?? "false") === "true";
    if (fail) {
      history.push({ nodeId, status: "FAILED", attempt, message: "Node execution failed", ts: new Date().toISOString() });
      const failed: RuntimeState = { ...stateBase, status: "FAILED", history };
      await prismaAny.run.update({ where: { id: params.runId }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: "Node execution failed" } });
      await persistRuntimeState(params.runId, failed);
      emitWorkflowStream({ workflowId: params.workflowId, runId: params.runId, type: "runtime.node.failed", payload: { nodeId } });
      return failed;
    }

    history.push({ nodeId, status: "SUCCESS", attempt, message: decision.reason, ts: new Date().toISOString() });
    await prismaAny.runStepLog.create({
      data: {
        runId: params.runId,
        stepId: nodeId,
        stepName: String(node?.label ?? nodeId),
        stepType: String(node?.type ?? "ACTION"),
        status: "SUCCESS",
        message: `${decision.reason} (conf ${Math.round(decision.confidence * 100)}%)`,
        attempt,
        startedAt: new Date(),
        endedAt: new Date(),
      },
    });
    await persistRuntimeState(params.runId, { ...stateBase, history });
    emitWorkflowStream({ workflowId: params.workflowId, runId: params.runId, type: "runtime.node.success", payload: { nodeId, reason: decision.reason } });
  }

  const completed: RuntimeState = {
    workflowId: params.workflowId,
    runId: params.runId,
    currentNode: null,
    status: "SUCCESS",
    history,
  };
  await prismaAny.run.update({ where: { id: params.runId }, data: { status: "SUCCESS", finishedAt: new Date() } });
  await persistRuntimeState(params.runId, completed);
  emitWorkflowStream({ workflowId: params.workflowId, runId: params.runId, type: "runtime.completed", payload: { status: "SUCCESS" } });
  return completed;
}
