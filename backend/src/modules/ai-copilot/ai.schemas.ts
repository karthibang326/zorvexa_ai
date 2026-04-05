import { z } from "zod";

export const DagNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
});

export const DagEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
});

export const AnalyzeWorkflowSchema = z.object({
  nodes: z.array(DagNodeSchema).default([]),
  edges: z.array(DagEdgeSchema).default([]),
});

export const GenerateWorkflowSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export const AnomalySchema = z.object({
  metrics: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).default({}),
});

export type DagNode = z.infer<typeof DagNodeSchema>;
export type DagEdge = z.infer<typeof DagEdgeSchema>;
export type AnalyzeWorkflowInput = z.infer<typeof AnalyzeWorkflowSchema>;
export type GenerateWorkflowInput = z.infer<typeof GenerateWorkflowSchema>;
export type AnomalyInput = z.infer<typeof AnomalySchema>;

