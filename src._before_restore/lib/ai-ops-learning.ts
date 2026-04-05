import { api } from "./api";

export type MetricsState = {
  cpu?: number;
  latency?: number;
  errorRate?: number;
  cost?: number;
};

export async function postOpsAnalyze(body: { state: MetricsState; manualApproval?: boolean }) {
  const { data } = await api.post("/ai/ops/analyze", body);
  return data as Record<string, unknown>;
}

export async function postOpsExecute(body: {
  state: MetricsState;
  action: string;
  resource: string;
  provider?: "aws" | "gcp" | "azure";
  namespace?: string;
  manualApproval?: boolean;
}) {
  const { data } = await api.post("/ai/ops/execute", body);
  return data as Record<string, unknown>;
}

export async function postOpsFeedback(body: { experienceId: string; after: MetricsState; before?: MetricsState }) {
  const { data } = await api.post("/ai/ops/feedback", body);
  return data as Record<string, unknown>;
}

export async function getOpsMemory(limit = 40) {
  const { data } = await api.get("/ai/ops/memory", { params: { limit } });
  return data as { items: unknown[]; stats: { count: number; avgReward: number } };
}
