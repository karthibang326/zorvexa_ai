import { api } from "./api";

export interface OrchestratorDecision {
  orgId?: string;
  projectId?: string;
  environment?: string;
  module: string;
  reason: string;
  confidence: number;
  risk?: "low" | "medium" | "high";
  simulation?: string;
  impact: string;
  at: string;
}

export interface OrchestratorAction {
  module: string;
  type: string;
  status: "executed" | "skipped" | "failed";
  at: string;
  details?: string;
}

export interface OrchestratorState {
  autonomousMode: boolean;
  status: "idle" | "running" | "error";
  intervalMs: number;
  lastLoopAt: string | null;
  agents: Record<string, { healthy: boolean; lastRunAt: string | null }>;
  decisions: OrchestratorDecision[];
  actions: OrchestratorAction[];
  loops: Array<{ loopId: string; startedAt: string; completedAt?: string; status: string }>;
}

export async function getOrchestratorState() {
  const { data } = await api.get("/ai-orchestrator/state");
  return data as OrchestratorState;
}

