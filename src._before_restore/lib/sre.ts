import { api } from "./api";

export type ChaosType = "cpu_spike" | "memory_leak" | "pod_kill" | "network_latency";

export interface ChaosRunPayload {
  type: ChaosType;
  target: string;
  duration: number;
  deploymentId?: string;
  approvalMode?: "auto" | "manual";
}

export interface ChaosExperimentItem {
  id: string;
  type: ChaosType;
  target: string;
  status: string;
  durationSec: number;
  startedAt: string;
  finishedAt: string | null;
  impactSummary?: Record<string, unknown> | null;
}

export async function runChaos(payload: ChaosRunPayload) {
  const { data } = await api.post("/chaos/run", payload);
  return data as {
    id: string;
    type: ChaosType;
    target: string;
    status: string;
    durationSec: number;
    startedAt: string;
  };
}

export async function getChaosHistory(): Promise<ChaosExperimentItem[]> {
  const { data } = await api.get("/chaos/history");
  return (data?.items ?? []) as ChaosExperimentItem[];
}

export interface IncidentItem {
  id: string;
  source: string;
  issue: string;
  rootCause?: string | null;
  action?: string | null;
  status: string;
  success?: boolean | null;
  confidenceScore?: number | null;
  detectedAt: string;
  resolvedAt?: string | null;
}

export async function triggerIncident(payload: {
  source: "deploy_failure" | "run_failure" | "metrics_anomaly" | "chaos_experiment";
  issue: string;
  deploymentId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await api.post("/incident/trigger", payload);
  return data as { incidentId: string; status: string; issue: string; detectedAt: string };
}

export async function getIncidentHistory(limit = 100) {
  const { data } = await api.get("/incident/history", { params: { limit } });
  const raw = data as { items?: IncidentItem[]; stats?: { total: number; resolved: number; successRate: number } } | undefined;
  const list = Array.isArray(raw?.items) ? raw.items : [];
  return {
    items: list,
    stats: raw?.stats ?? {
      total: list.length,
      resolved: list.filter((x) => x.status === "RESOLVED").length,
      successRate: list.length ? Number((list.filter((x) => x.status === "RESOLVED").length / list.length).toFixed(2)) : 0,
    },
  };
}

