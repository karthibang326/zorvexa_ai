import { z } from "zod";

export const TriggerRunSchema = z.object({
  workflowId: z.string().uuid(),
  version: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8).max(120),
});

