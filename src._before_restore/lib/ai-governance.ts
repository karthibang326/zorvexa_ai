import { api } from "./api";

export type GovernanceRisk = {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  impactedResources: string;
  riskScore: number;
  action: string;
};

export async function getGovernanceStatus() {
  const { data } = await api.get("/ai-governance/status");
  return data as {
    mode: "on" | "off";
    approvalMode: boolean;
    auditLogsRequired: boolean;
    rollbackActions: boolean;
    securityScoreGrade: "A" | "B" | "C";
    securityScoreValue: number;
    mfaCoverage: number;
    keyRotationCoverage: number;
    accessControlCoverage: number;
    vulnerabilitiesScore: number;
    maxOptimizationsPerHour: number;
  };
}

export async function postEnableGovernance() {
  const { data } = await api.post("/ai-governance/enable", {});
  return data as Record<string, unknown>;
}

export async function postDisableGovernance() {
  const { data } = await api.post("/ai-governance/disable", {});
  return data as Record<string, unknown>;
}

export async function getCriticalRisks() {
  const { data } = await api.get("/ai-governance/risks");
  return data as GovernanceRisk[];
}

export async function postStabilizeSecurity() {
  const { data } = await api.post("/ai-governance/stabilize", {});
  return data as { actionsTaken: string[]; riskReducedPct: number; score: number; grade: "A" | "B" | "C" };
}

export async function getAccessControl() {
  const { data } = await api.get("/ai-governance/access");
  return data as Array<{
    id: string;
    user: string;
    role: "Admin" | "Dev" | "Viewer";
    permissions: string[];
    lastActivity: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    inactive: boolean;
  }>;
}

export async function postEnforceLeastPrivilege() {
  const { data } = await api.post("/ai-governance/access/least-privilege", {});
  return data as Record<string, unknown>;
}

export async function postRemoveInactiveUsers() {
  const { data } = await api.post("/ai-governance/access/remove-inactive", {});
  return data as { removed: string[] };
}

export async function getGovernanceKeys() {
  const { data } = await api.get("/ai-governance/keys");
  return data as Array<{
    id: string;
    name: string;
    usage: number;
    lastUsed: string;
    riskScore: number;
    exposureRisk: "LOW" | "MEDIUM" | "HIGH";
    scopes: string[];
  }>;
}

export async function postRotateGovernanceKey(id: string) {
  const { data } = await api.post(`/ai-governance/keys/${id}/rotate`, {});
  return data as Record<string, unknown>;
}

export async function postRevokeGovernanceKey(id: string) {
  const { data } = await api.post(`/ai-governance/keys/${id}/revoke`, {});
  return data as Record<string, unknown>;
}

export async function postRestrictGovernanceKey(id: string) {
  const { data } = await api.post(`/ai-governance/keys/${id}/restrict-scope`, {});
  return data as Record<string, unknown>;
}

export async function getIntegrationHealth() {
  const { data } = await api.get("/ai-governance/integrations");
  return data as Array<{
    provider: "AWS" | "GCP" | "Azure";
    status: "healthy" | "degraded" | "disconnected";
    authHealth: "valid" | "expiring" | "invalid";
    permissions: "valid" | "limited" | "invalid";
  }>;
}

export async function getGovernancePredictions() {
  const { data } = await api.get("/ai-governance/predictions");
  return data as string[];
}

export async function postGovernanceSafety(input: {
  approvalMode?: boolean;
  auditLogsRequired?: boolean;
  rollbackActions?: boolean;
  maxOptimizationsPerHour?: number;
}) {
  const { data } = await api.post("/ai-governance/safety", input);
  return data as Record<string, unknown>;
}

