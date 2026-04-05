type GovernanceMode = "on" | "off";
type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM";
type AccessRole = "Admin" | "Dev" | "Viewer";

export type GovernanceRisk = {
  id: string;
  severity: RiskSeverity;
  title: string;
  impactedResources: string;
  riskScore: number;
  action: string;
};

export type AccessRecord = {
  id: string;
  user: string;
  role: AccessRole;
  permissions: string[];
  lastActivity: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  inactive: boolean;
};

export type ApiKeyIntelligence = {
  id: string;
  name: string;
  usage: number;
  lastUsed: string;
  riskScore: number;
  exposureRisk: "LOW" | "MEDIUM" | "HIGH";
  scopes: string[];
};

export type IntegrationHealth = {
  provider: "AWS" | "GCP" | "Azure";
  status: "healthy" | "degraded" | "disconnected";
  authHealth: "valid" | "expiring" | "invalid";
  permissions: "valid" | "limited" | "invalid";
};

export type GovernanceState = {
  mode: GovernanceMode;
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
  lastUpdatedAt: string;
};

type StreamEvent = {
  type: string;
  ts: string;
  payload: Record<string, unknown>;
};

let state: GovernanceState = {
  mode: "off",
  approvalMode: true,
  auditLogsRequired: true,
  rollbackActions: true,
  securityScoreGrade: "B",
  securityScoreValue: 84,
  mfaCoverage: 89,
  keyRotationCoverage: 77,
  accessControlCoverage: 81,
  vulnerabilitiesScore: 85,
  maxOptimizationsPerHour: 8,
  lastUpdatedAt: new Date().toISOString(),
};

let risks: GovernanceRisk[] = [
  { id: "r1", severity: "CRITICAL", title: "API key expiring in 2 days", impactedResources: "CI/CD pipeline", riskScore: 95, action: "Rotate Now" },
  { id: "r2", severity: "HIGH", title: "MFA disabled for privileged users", impactedResources: "Auth + Admin Console", riskScore: 88, action: "Enforce MFA" },
  { id: "r3", severity: "MEDIUM", title: "GCP integration permission drift", impactedResources: "Cloud sync job", riskScore: 68, action: "Re-auth GCP" },
];

let access: AccessRecord[] = [
  { id: "u1", user: "karthiban.g", role: "Admin", permissions: ["*"], lastActivity: "5m ago", riskLevel: "LOW", inactive: false },
  { id: "u2", user: "alice.r", role: "Dev", permissions: ["deploy", "read", "cost:read"], lastActivity: "12m ago", riskLevel: "LOW", inactive: false },
  { id: "u3", user: "john.d", role: "Admin", permissions: ["deploy", "read", "security:read"], lastActivity: "91d ago", riskLevel: "HIGH", inactive: true },
  { id: "u4", user: "ops.viewer", role: "Viewer", permissions: ["read"], lastActivity: "2h ago", riskLevel: "LOW", inactive: false },
];

let keys: ApiKeyIntelligence[] = [
  { id: "k1", name: "CI/CD", usage: 1240, lastUsed: "4m ago", riskScore: 91, exposureRisk: "HIGH", scopes: ["deploy", "read"] },
  { id: "k2", name: "Monitoring Agent", usage: 8840, lastUsed: "20s ago", riskScore: 38, exposureRisk: "LOW", scopes: ["metrics:read", "read"] },
  { id: "k3", name: "Security Scanner", usage: 512, lastUsed: "2h ago", riskScore: 56, exposureRisk: "MEDIUM", scopes: ["security:read"] },
];

let integrations: IntegrationHealth[] = [
  { provider: "AWS", status: "healthy", authHealth: "valid", permissions: "valid" },
  { provider: "GCP", status: "degraded", authHealth: "expiring", permissions: "limited" },
  { provider: "Azure", status: "healthy", authHealth: "valid", permissions: "valid" },
];

const predictions = [
  "High risk of credential leak from over-scoped API key",
  "User access anomaly detected on privileged role",
  "GCP integration may fail soon due to expiring auth token",
];

const listeners = new Set<(event: StreamEvent) => void>();

const emit = (type: string, payload: Record<string, unknown>) => {
  const event = { type, ts: new Date().toISOString(), payload };
  for (const l of listeners) l(event);
};

const recomputeScore = () => {
  const value = Math.round((state.mfaCoverage + state.keyRotationCoverage + state.accessControlCoverage + state.vulnerabilitiesScore) / 4);
  const grade: GovernanceState["securityScoreGrade"] = value >= 90 ? "A" : value >= 80 ? "B" : "C";
  state = { ...state, securityScoreValue: value, securityScoreGrade: grade, lastUpdatedAt: new Date().toISOString() };
};

export const aiGovernanceService = {
  subscribe(handler: (event: StreamEvent) => void) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  },
  getState() {
    return state;
  },
  getCriticalRisks() {
    return risks;
  },
  getAccess() {
    return access;
  },
  getApiKeys() {
    return keys;
  },
  getIntegrations() {
    return integrations;
  },
  getPredictions() {
    return predictions;
  },
  enable() {
    state = { ...state, mode: "on", lastUpdatedAt: new Date().toISOString() };
    emit("ai_governance_enabled", { mode: state.mode });
    return state;
  },
  disable() {
    state = { ...state, mode: "off", lastUpdatedAt: new Date().toISOString() };
    emit("ai_governance_disabled", { mode: state.mode });
    return state;
  },
  stabilizeSecurity() {
    const actionsTaken = [
      "Rotated expiring keys",
      "Enforced MFA for privileged users",
      "Re-authenticated degraded integrations",
      "Patched vulnerable runtime policies",
    ];
    risks = risks.filter((r) => r.severity !== "CRITICAL");
    keys = keys.map((k) => (k.exposureRisk === "HIGH" ? { ...k, riskScore: 49, exposureRisk: "MEDIUM" } : k));
    access = access.map((u) => (u.inactive ? { ...u, role: "Viewer", permissions: ["read"], riskLevel: "MEDIUM" } : u));
    state = {
      ...state,
      mfaCoverage: Math.min(100, state.mfaCoverage + 8),
      keyRotationCoverage: Math.min(100, state.keyRotationCoverage + 14),
      accessControlCoverage: Math.min(100, state.accessControlCoverage + 10),
      vulnerabilitiesScore: Math.min(100, state.vulnerabilitiesScore + 6),
      lastUpdatedAt: new Date().toISOString(),
    };
    recomputeScore();
    const riskReducedPct = 32;
    emit("security_stabilized", { actionsTaken, riskReducedPct });
    return { actionsTaken, riskReducedPct, score: state.securityScoreValue, grade: state.securityScoreGrade };
  },
  rotateKey(keyId: string) {
    keys = keys.map((k) => (k.id === keyId ? { ...k, riskScore: Math.max(20, k.riskScore - 35), exposureRisk: "LOW" } : k));
    state = { ...state, keyRotationCoverage: Math.min(100, state.keyRotationCoverage + 4) };
    recomputeScore();
    emit("api_key_rotated", { keyId });
    return { ok: true, keyId };
  },
  revokeKey(keyId: string) {
    keys = keys.filter((k) => k.id !== keyId);
    emit("api_key_revoked", { keyId });
    return { ok: true, keyId };
  },
  restrictKeyScope(keyId: string) {
    keys = keys.map((k) => (k.id === keyId ? { ...k, scopes: k.scopes.slice(0, 1), riskScore: Math.max(15, k.riskScore - 20), exposureRisk: "LOW" } : k));
    state = { ...state, accessControlCoverage: Math.min(100, state.accessControlCoverage + 3) };
    recomputeScore();
    emit("api_key_scope_restricted", { keyId });
    return { ok: true, keyId };
  },
  enforceLeastPrivilege() {
    access = access.map((u) =>
      u.role === "Admin" && u.user !== "karthiban.g"
        ? { ...u, role: "Dev", permissions: u.permissions.filter((p) => p !== "*"), riskLevel: "MEDIUM" }
        : u
    );
    state = { ...state, accessControlCoverage: Math.min(100, state.accessControlCoverage + 8) };
    recomputeScore();
    emit("least_privilege_enforced", {});
    return { ok: true };
  },
  removeInactiveUsers() {
    const removed = access.filter((u) => u.inactive).map((u) => u.user);
    access = access.filter((u) => !u.inactive);
    state = { ...state, accessControlCoverage: Math.min(100, state.accessControlCoverage + 6) };
    recomputeScore();
    emit("inactive_users_removed", { removed });
    return { removed };
  },
  updateSafety(input: Partial<Pick<GovernanceState, "approvalMode" | "auditLogsRequired" | "rollbackActions" | "maxOptimizationsPerHour">>) {
    state = { ...state, ...input, lastUpdatedAt: new Date().toISOString() };
    emit("governance_safety_updated", input as Record<string, unknown>);
    return state;
  },
};

