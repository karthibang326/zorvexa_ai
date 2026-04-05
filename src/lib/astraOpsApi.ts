import { api } from "./api";

export type AstraWorkload = {
  id: string;
  environment_id: string | null;
  name: string | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  cost: number | null;
  status: string | null;
  created_at: string | null;
};

export type AstraDecision = {
  id: string;
  workload_id: string | null;
  action: string | null;
  reason: string | null;
  confidence: number | null;
  status: string | null;
  created_at: string | null;
};

export async function postAstraOpsIngest(body: {
  env_id: string;
  name: string;
  cpu: number;
  memory: number;
  cost: number;
}): Promise<{ status: string; workload: AstraWorkload }> {
  const { data } = await api.post("/astra-ops/ingest", body);
  return data;
}

export async function getAstraOpsApprovals(): Promise<{ decisions: AstraDecision[] }> {
  const { data } = await api.get("/astra-ops/approvals");
  return data;
}

export async function postApproveDecision(decisionId: string): Promise<{ ok: boolean; decisionId: string; status: string }> {
  const { data } = await api.post(`/astra-ops/decisions/${encodeURIComponent(decisionId)}/approve`);
  return data;
}

export async function postRejectDecision(decisionId: string): Promise<{ ok: boolean; decisionId: string; status: string }> {
  const { data } = await api.post(`/astra-ops/decisions/${encodeURIComponent(decisionId)}/reject`);
  return data;
}

export type AstraOpsAuditEntry = {
  id: string;
  created_at: string;
  org_id: string;
  project_id: string | null;
  env_id: string | null;
  event: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  decision_id: string | null;
  workload_id: string | null;
  detail: Record<string, unknown> | null;
};

export async function getAstraOpsAuditLog(limit = 50): Promise<{ entries: AstraOpsAuditEntry[] }> {
  const { data } = await api.get("/astra-ops/audit-log", { params: { limit } });
  return data;
}

export type AutonomyPolicies = {
  mode: string;
  simulation: boolean;
  approvalRequired: boolean;
};

export async function getAstraOpsAutonomy(): Promise<{ policies: AutonomyPolicies }> {
  const { data } = await api.get("/astra-ops/autonomy");
  return data;
}

export async function getAstraOpsInfraStatus(): Promise<{
  kubernetes: { ok: boolean; message: string };
  aws: { ok: boolean; message: string };
  gcp: { ok: boolean; message: string };
}> {
  const { data } = await api.get("/astra-ops/infra-status");
  return data;
}

export async function getAstraOpsImpact(): Promise<{
  windowHours: number;
  auditEventCounts: Record<string, number>;
  estimatedAiActions: number;
  incidentsAutoResolved: number;
  costSavedNote?: string;
  mttrNote?: string;
}> {
  const { data } = await api.get("/astra-ops/impact");
  return data;
}

export async function getAstraOpsLoopStats(): Promise<{
  stats: { observed: number; anomalies: number; enqueued: number; at: string | null };
}> {
  const { data } = await api.get("/astra-ops/loop");
  return data;
}

export async function postAstraOpsLoopTick(): Promise<{
  ok: boolean;
  observed: number;
  anomalies: number;
  enqueued: number;
}> {
  const { data } = await api.post("/astra-ops/loop/tick");
  return data;
}
