import { api } from "./api";

export interface AICeoStatus {
  enabled: boolean;
  approvalMode: boolean;
  maxActionsPerHour: number;
  rollbackEnabled: boolean;
  paused: boolean;
  lastUpdatedAt: string;
}

export interface AICeoDecision {
  id: string;
  ts: string;
  type: "deploy" | "execute" | "scale" | "incident_fix" | "optimize" | "pause";
  reason: string;
  outcome: "SUCCESS" | "FAILED" | "SKIPPED";
  details?: string;
}

export async function postEnableAICeo(payload?: {
  approvalMode?: boolean;
  maxActionsPerHour?: number;
  rollbackEnabled?: boolean;
}) {
  const { data } = await api.post("/ai-ceo/enable", payload ?? {});
  return data as AICeoStatus;
}

export async function postDisableAICeo() {
  const { data } = await api.post("/ai-ceo/disable", {});
  return data as AICeoStatus;
}

export async function postPauseAICeo() {
  const { data } = await api.post("/ai-ceo/pause", {});
  return data as AICeoStatus;
}

export async function getAICeoStatus() {
  const { data } = await api.get("/ai-ceo/status");
  return data as AICeoStatus;
}

export async function getAICeoDecisions(limit = 100) {
  const { data } = await api.get(`/ai-ceo/decisions?limit=${encodeURIComponent(String(limit))}`);
  return (data?.items ?? []) as AICeoDecision[];
}

export async function postOptimizeAllSystems() {
  const { data } = await api.post("/ai-ceo/control/optimize-all", {});
  return data as Record<string, unknown>;
}

export async function postScaleCriticalServices() {
  const { data } = await api.post("/ai-ceo/control/scale-critical", {});
  return data as Record<string, unknown>;
}

export async function postStabilizeSystem() {
  const { data } = await api.post("/ai-ceo/control/stabilize", {});
  return data as {
    actionsTaken: Array<{
      service: string;
      action: "restart" | "scale_up" | "rollback";
      status: "SUCCESS" | "FAILED";
      details?: string;
    }>;
    systemRecovery: number;
    timestamp: string;
  };
}
