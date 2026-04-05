import { z } from "zod";

export const SelfHealingTriggerSchema = z.object({
  runId: z.string().optional(),
  workflowId: z.string().optional(),
  namespace: z.string().optional(),
  deploymentName: z.string().optional(),
  provider: z.enum(["aws", "gcp", "azure"]).optional(),
  metrics: z
    .object({
      cpu: z.number().optional(),
      memory: z.number().optional(),
      cost: z.number().optional(),
    })
    .default({}),
  source: z.enum(["RUN_FAILURE", "ANOMALY"]).default("ANOMALY"),
});

export type SelfHealingTriggerInput = z.infer<typeof SelfHealingTriggerSchema>;

