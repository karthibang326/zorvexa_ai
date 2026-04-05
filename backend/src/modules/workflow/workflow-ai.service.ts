import { executeWorkflowGraph, simulateWorkflowGraph } from "../../core/workflow/engine";
import { workflowRepository } from "./workflow.repository";
import type { WorkflowAiMode, WorkflowExecutionContext } from "../ai-control/workflow-engine/types";

export const workflowAiService = {
  async execute(input: {
    workflowId: string;
    mode: WorkflowAiMode;
    context: WorkflowExecutionContext;
  }) {
    const wf = await workflowRepository.getById(input.workflowId);
    if (!wf) throw new Error("Workflow not found");
    const latest = wf.versions?.[0];
    const nodes = (latest?.nodes as any[]) ?? [];
    const edges = (latest?.edges as any[]) ?? [];
    return executeWorkflowGraph({
      workflowId: input.workflowId,
      mode: input.mode,
      context: input.context,
      nodes,
      edges,
    });
  },

  async simulate(input: {
    workflowId: string;
    mode: WorkflowAiMode;
    context: WorkflowExecutionContext;
  }) {
    const wf = await workflowRepository.getById(input.workflowId);
    if (!wf) throw new Error("Workflow not found");
    const latest = wf.versions?.[0];
    const nodes = (latest?.nodes as any[]) ?? [];
    return simulateWorkflowGraph({
      workflowId: input.workflowId,
      mode: input.mode,
      context: input.context,
      nodes,
    });
  },

  async optimize(input: { workflowId: string }) {
    const wf = await workflowRepository.getById(input.workflowId);
    if (!wf) throw new Error("Workflow not found");
    const latest = wf.versions?.[0];
    const nodes = ((latest?.nodes as any[]) ?? []).map((n) => ({ ...n }));
    const edges = ((latest?.edges as any[]) ?? []).map((e) => ({ ...e }));

    const suggestions: string[] = [];
    const aiNodes = nodes.filter((n) => String(n?.type ?? "").toLowerCase().includes("ai")).length;
    const execNodes = nodes.filter((n) => String(n?.type ?? "").toLowerCase().includes("execution")).length;
    if (aiNodes > 1) suggestions.push("Parallelize independent AI analysis nodes to reduce critical path.");
    if (execNodes > 2) suggestions.push("Batch homogeneous execution nodes into a worker group to reduce API overhead.");
    if (edges.length > nodes.length * 2) suggestions.push("Remove redundant edges to simplify graph traversal and retry blast radius.");
    if (suggestions.length === 0) suggestions.push("Workflow shape is healthy. Keep current topology.");

    return {
      workflowId: input.workflowId,
      optimizedNodes: nodes,
      optimizedEdges: edges,
      suggestions,
      estimatedLatencyReductionPct: Math.min(35, 8 + suggestions.length * 6),
      estimatedCostReductionPct: Math.min(22, 4 + suggestions.length * 4),
    };
  },
};
