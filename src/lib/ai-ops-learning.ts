import { api } from "./api";

export type MetricsState = {
  cpu?: number;
  memory?: number;
  latency?: number;
  traffic?: number;
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
  return data as {
    items: unknown[];
    stats: { count: number; avgReward: number; successRate?: number };
  };
}

export async function postOpsAutonomousRun(body: {
  provider?: "aws" | "gcp" | "azure";
  namespace?: string;
  signal: {
    metrics: MetricsState;
    logs?: string[];
    events?: Array<{ type: string; message: string; severity?: "low" | "medium" | "high" }>;
  };
}) {
  const { data } = await api.post("/ai/ops/autonomous/run", body);
  return data as Record<string, unknown>;
}

export async function getOpsAutonomousLoopStatus() {
  const { data } = await api.get("/ai/ops/autonomous/loop/status");
  return data as {
    running: boolean;
    config?: { intervalMs?: number } | null;
    lastRunAt?: string | null;
    lastSummary?: {
      correlationId?: string;
      metricsSource?: "live" | "synthetic";
      reasoning?: string;
      findings?: string[];
      decision?: { action?: string; confidence?: number; resource?: string; reason?: string };
      execution?: { status?: string };
      memoryStats?: { count?: number; avgReward?: number; successRate?: number };
      observedState?: MetricsState;
      alternatives?: Array<{ option: string; rejectedBecause: string }>;
      learningInsight?: string;
    } | null;
    failures?: number;
    lastError?: string | null;
    metricsSource?: "live" | "synthetic";
    executionProfile?: {
      cloudLiveExecution: boolean;
      k8sDryRun: boolean;
      simulationMode: boolean;
      opsMetricsUrlConfigured: boolean;
    };
  };
}

export async function postOpsEmergencyStop() {
  const { data } = await api.post("/ai/ops/autonomous/emergency-stop");
  return data as { ok: boolean; stopped: string[]; opsLoopStatus: unknown };
}
