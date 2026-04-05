import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1).transform((v) => v.toUpperCase()),
  label: z.string().min(1).optional().default("Untitled"),
  config: z.record(z.any()).optional(),
}).passthrough();

export const EdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
}).passthrough();

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
  nodes: z.array(NodeSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
});

export const SaveWorkflowSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export const RevertWorkflowSchema = z.object({
  version: z.number().int().positive(),
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type SaveWorkflowInput = z.infer<typeof SaveWorkflowSchema>;
export type RevertWorkflowInput = z.infer<typeof RevertWorkflowSchema>;

