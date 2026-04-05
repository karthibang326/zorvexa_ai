import { api } from "./api";

export type MetricsState = {
  cpu?: number;
  latency?: number;
  errorRate?: number;
  cost?: number;
};

export type AstraDecideResponse = {
  machine: {
    orchestrator: Record<string, unknown>;
    agents: Array<{ agent: string; issue: string; recommendation: string; confidence: number }>;
    context: { collectedAt: string; signals: MetricsState };
  };
  human: string;
};

export type AstraSimulateResponse = {
  machine: {
    action: string;
    replicas: number;
    resource: string;
    predicted_latency_pct: number;
    cpu_reduction_pct: number;
    cost_delta_usd: number;
    risk: "low" | "medium" | "high";
    assumptions: Record<string, unknown>;
  };
  human: string;
};

export type AstraPredictResponse = {
  machine: {
    prediction: string;
    confidence: number;
    horizonMinutes: number;
    signals: Record<string, number | undefined>;
  };
  human: string;
};

export async function postAstraDecide(body: { state: MetricsState; manualApproval?: boolean }) {
  const { data } = await api.post("/astra/decide", body);
  return data as AstraDecideResponse;
}

export async function postAstraSimulate(body: {
  action: string;
  replicas?: number;
  resource?: string;
  state: MetricsState;
}) {
  const { data } = await api.post("/astra/simulate", body);
  return data as AstraSimulateResponse;
}

export async function postAstraPredict(body: { state: MetricsState }) {
  const { data } = await api.post("/astra/predict", body);
  return data as AstraPredictResponse;
}
