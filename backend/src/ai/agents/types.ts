import type { getContext } from "../../services/context.service";

export type TelemetrySnapshot = Awaited<ReturnType<typeof getContext>>;

export interface LogsAgentResult {
  source: "loki-simulated";
  summary: string[];
  anomalies: string[];
  queryTerms: string[];
  error?: string;
}

export interface MetricsAgentResult {
  source: "prometheus-simulated";
  cpuPercent: number;
  memoryGb: number;
  latencyMs: number;
  cpuSpike: boolean;
  alerts: string[];
  error?: string;
}

export interface K8sAgentResult {
  source: "cluster-simulated";
  cluster: string;
  activePods: number;
  signals: string[];
  unhealthySummary: string[];
  error?: string;
}

export interface AgentBundle {
  logs: LogsAgentResult;
  metrics: MetricsAgentResult;
  k8s: K8sAgentResult;
  telemetry: TelemetrySnapshot;
}
