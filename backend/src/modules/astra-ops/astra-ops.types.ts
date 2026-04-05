/** Row shape returned from `workloads` (snake_case matches DB). */
export type WorkloadRow = {
  id: string;
  environment_id: string | null;
  name: string | null;
  type: string | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  cost: number | null;
  status: string | null;
  created_at: Date | null;
};

/** AI queue job: workload plus request scope for downstream executor audit. */
export type AstraAnalyzeJobPayload = {
  workload: WorkloadRow;
  scope: { orgId: string; projectId: string; envId: string };
};

export type AiDecisionRow = {
  id: string;
  workload_id: string | null;
  action: string | null;
  reason: string | null;
  confidence: number | null;
  status: string | null;
  created_at: Date | null;
  feedback_success: boolean | null;
  improved_confidence: number | null;
};
