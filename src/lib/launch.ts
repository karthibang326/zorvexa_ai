import { api } from "@/lib/api";

export type Plan = "starter" | "growth" | "enterprise" | "free" | "pro";
export type CloudProvider = "aws" | "gcp" | "azure";
export type EnvironmentTier = "dev" | "staging" | "prod";
export type AllowedActionKind = "scale" | "restart" | "deploy" | "optimize" | "rollback";

export type AutonomyMode = "simulation" | "assisted" | "autonomous";
export type ApprovalScope = "high_risk" | "medium_risk" | "all_actions";
export type BlastRadiusScope = "service" | "namespace" | "cluster";

export type EnvironmentPolicy = {
  orgId: string;
  projectId: string;
  envId: string;
  tier: EnvironmentTier;
  autonomyMode: AutonomyMode;
  approvalScope: ApprovalScope;
  approvalRequired: boolean;
  maxActionsPerHour: number;
  monthlyBudgetUsd: number;
  blastRadius: "low" | "medium" | "high";
  blastRadiusScope: BlastRadiusScope;
  sloAvailabilityTarget: number;
  autoRollback: boolean;
  rollbackOnPerformanceDegradation: boolean;
  pauseAutomationWhenBudgetExceeded: boolean;
  minConfidenceToAutoExecute: number;
  allowDestructiveActions: boolean;
  allowedActionKinds: AllowedActionKind[];
  complianceTags: string[];
  updatedAt: string;
};

export type AuthMethod = "iam_role" | "access_keys" | "gcp_sa" | "azure_sp";

export type CloudTestResult = {
  ok: boolean;
  message: string;
  accountId?: string;
  regions?: string[];
  errorCode?: string;
  simulated?: boolean;
};

export type CloudDiscovery = {
  accountId: string;
  regions: string[];
  clusters: Array<{ name: string; region: string; status: string }>;
  services: string[];
  nodes: { total: number; ready: number };
};

export async function createOrganization(name: string) {
  const { data } = await api.post("/org/organizations", { name });
  return data as { organization: { id: string; name: string } };
}

export async function createProject(orgId: string, name: string) {
  const { data } = await api.post("/org/projects", { orgId, name });
  return data as { project: { id: string; name: string; organizationId: string } };
}

export async function createEnvironment(projectId: string, name: string) {
  const { data } = await api.post("/org/environments", { projectId, name });
  return data as { environment: { id: string; name: string; projectId: string } };
}

export async function connectCloud(provider: CloudProvider, name: string, credentials: Record<string, string | undefined>) {
  const { data } = await api.post("/cloud/connect", { provider, name, credentials });
  return data as { connection: { id: string; provider: string; status: string; validatedAt: string } };
}

export async function testCloudConnection(payload: {
  provider: CloudProvider;
  authMethod: AuthMethod;
  credentials: Record<string, string | undefined>;
}) {
  const { data } = await api.post("/cloud/test", payload);
  return data as { result: CloudTestResult };
}

export async function discoverCloudInfra(provider: CloudProvider, region?: string) {
  const { data } = await api.post("/cloud/discover", { provider, region });
  return data as { discovery: CloudDiscovery };
}

export async function setPlan(plan: Plan) {
  const { data } = await api.post("/billing/plan/set", { plan });
  return data as { tenantId: string; plan: Plan };
}

export async function getPlan() {
  const { data } = await api.get("/billing/plan");
  return data as {
    tenantId: string;
    plan: Plan;
    clusterLimit: number;
    clusterCount: number;
    canProvisionCluster: boolean;
  };
}

export async function getEnvironmentPolicy(tier: EnvironmentTier) {
  const { data } = await api.get(`/environment-policy/current?tier=${encodeURIComponent(tier)}`);
  return data as { policy: EnvironmentPolicy };
}

export async function updateEnvironmentPolicy(
  patch: Partial<Omit<EnvironmentPolicy, "orgId" | "projectId" | "envId" | "updatedAt">>
) {
  const { data } = await api.put("/environment-policy/current", patch);
  return data as { policy: EnvironmentPolicy };
}

