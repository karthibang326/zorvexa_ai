import type { DeploymentHistoryItem } from "@/lib/workflows";
import {
  formatDeploymentPath,
  inferEnvGroup,
  type CloudProvider,
  type DeploymentEnvGroup,
  type DeploymentIdentity,
} from "@/lib/deployment-identity";

export type DeploymentAiPhase = "monitoring" | "acting" | "stabilized" | "incident";

export interface EnrichedDeployment {
  id: string;
  identity: DeploymentIdentity;
  envGroup: DeploymentEnvGroup;
  path: string;
  cloud: CloudProvider;
  status: string;
  aiPhase: DeploymentAiPhase;
  riskScore: number;
  urgency: number;
  priority: number;
  versionLabel: string;
  service: string;
  namespace: string;
  strategy: "canary" | "rolling";
  createdAt: string;
  healthPct: number;
  metrics: { cpu: number; memory: number; latencyMs: number; errorRate: number };
  aiActions: string[];
  correlatedSignal?: string;
  /** True when returned from deploy/history API for the active workspace. */
  isLive: boolean;
  raw?: DeploymentHistoryItem;
}

function hashN(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"] as const;
const CLOUDS: CloudProvider[] = ["aws", "gcp", "azure"];

export function deriveRegion(id: string, service: string): string {
  return REGIONS[hashN(id + service, REGIONS.length)];
}

function deriveCloud(id: string): CloudProvider {
  return CLOUDS[hashN(id, CLOUDS.length)];
}

export function mapStatusToAiPhase(status: string): DeploymentAiPhase {
  const u = status.toUpperCase();
  if (u.includes("FAIL")) return "incident";
  if (u.includes("PROGRESS") || u.includes("RUNNING") || u.includes("PENDING") || u.includes("BUILD")) return "acting";
  if (u.includes("SUCCEED") || u.includes("DEPLOYED")) return "stabilized";
  return "monitoring";
}

function riskFromStatus(status: string, seed: number): number {
  const u = status.toUpperCase();
  if (u.includes("FAIL")) return 85 + (seed % 10);
  if (u.includes("PROGRESS") || u.includes("RUNNING")) return 40 + (seed % 20);
  if (u.includes("SUCCEED") || u.includes("DEPLOYED")) return 10 + (seed % 15);
  return 25 + (seed % 20);
}

export function enrichDeploymentItem(
  item: DeploymentHistoryItem,
  context: { orgId: string; projectId: string; envId: string }
): EnrichedDeployment {
  const service = (item.service ?? "unknown-service").trim() || "unknown-service";
  const region = deriveRegion(item.id, service);
  const identity: DeploymentIdentity = {
    orgId: context.orgId,
    projectId: context.projectId,
    envId: context.envId,
    service,
    region,
  };
  const envGroup = inferEnvGroup(context.envId);
  const seed = hashN(item.id, 100);
  const riskScore = riskFromStatus(item.status, seed);
  const phase = mapStatusToAiPhase(item.status);
  const urgency = phase === "incident" ? 88 + (seed % 10) : 35 + (seed % 35);
  const priority = Math.round((riskScore / 100) * (urgency / 100) * 100);

  return {
    id: item.id,
    identity,
    envGroup,
    path: formatDeploymentPath(identity),
    cloud: deriveCloud(item.id),
    status: item.status,
    aiPhase: phase,
    riskScore,
    urgency,
    priority,
    versionLabel: item.versionLabel ?? `v${item.version}`,
    service,
    namespace: item.namespace,
    strategy: item.strategy,
    createdAt: item.createdAt,
    healthPct: Math.max(38, Math.min(100, 100 - Math.round(riskFromStatus(item.status, seed) / 2.2))),
    metrics: {
      cpu: 32 + (seed % 48),
      memory: 38 + (seed % 42),
      latencyMs: 72 + (seed % 140),
      errorRate: Math.round((seed % 80) / 10) / 10,
    },
    aiActions: [
      item.strategy === "canary" ? "Canary cohort guardrails" : "Rollout health gates",
      `SLO watch · ${service}`,
      "Error budget tracking",
    ],
    isLive: true,
    raw: item,
  };
}

type SeedTemplate = {
  id: string;
  envId: string;
  service: string;
  region: string;
  cloud: CloudProvider;
  status: string;
  namespace: string;
  strategy: "canary" | "rolling";
  version: number;
  versionLabel: string;
};

function seedTemplates(context: { orgId: string; projectId: string }): Array<SeedTemplate & { orgId: string; projectId: string }> {
  return [
    {
      id: "seed-prod-pay",
      envId: "env-prod",
      service: "payments-api",
      region: "us-east-1",
      cloud: "aws",
      status: "DEPLOYED",
      namespace: "prod-payments",
      strategy: "canary",
      version: 428,
      versionLabel: "v4.28.0",
    },
    {
      id: "seed-prod-chk",
      envId: "env-prod",
      service: "checkout-ui",
      region: "eu-west-1",
      cloud: "gcp",
      status: "RUNNING",
      namespace: "prod-web",
      strategy: "rolling",
      version: 112,
      versionLabel: "v1.12.3",
    },
    {
      id: "seed-stage-api",
      envId: "env-staging",
      service: "orders-api",
      region: "us-west-2",
      cloud: "aws",
      status: "SUCCEEDED",
      namespace: "stage-orders",
      strategy: "rolling",
      version: 56,
      versionLabel: "v0.56.1",
    },
    {
      id: "seed-stage-bff",
      envId: "env-staging",
      service: "graphql-bff",
      region: "eu-west-1",
      cloud: "azure",
      status: "RUNNING",
      namespace: "stage-bff",
      strategy: "canary",
      version: 33,
      versionLabel: "v0.33.0",
    },
    {
      id: "seed-dev-svc",
      envId: "env-dev",
      service: "feature-flags",
      region: "ap-south-1",
      cloud: "aws",
      status: "DEPLOYED",
      namespace: "dev-platform",
      strategy: "rolling",
      version: 9,
      versionLabel: "v0.9.4",
    },
    {
      id: "seed-dev-bad",
      envId: "env-dev",
      service: "search-indexer",
      region: "us-east-1",
      cloud: "gcp",
      status: "FAILED",
      namespace: "dev-search",
      strategy: "rolling",
      version: 4,
      versionLabel: "v0.4.2",
    },
    {
      id: "seed-prod-risk",
      envId: "env-prod",
      service: "ledger-writer",
      region: "ap-south-1",
      cloud: "aws",
      status: "RUNNING",
      namespace: "prod-ledger",
      strategy: "canary",
      version: 901,
      versionLabel: "v9.0.1",
    },
  ].map((t) => ({ ...t, orgId: context.orgId, projectId: context.projectId }));
}


function fromSeed(t: SeedTemplate & { orgId: string; projectId: string }): EnrichedDeployment {
  const identity: DeploymentIdentity = {
    orgId: t.orgId,
    projectId: t.projectId,
    envId: t.envId,
    service: t.service,
    region: t.region,
  };
  const envGroup = inferEnvGroup(t.envId);
  const seed = hashN(t.id, 100);
  const riskScore = riskFromStatus(t.status, seed);
  const phase = mapStatusToAiPhase(t.status);
  const urgency = phase === "incident" ? 92 : 40 + (seed % 30);
  const priority = Math.round((riskScore / 100) * (urgency / 100) * 100);
  const raw: DeploymentHistoryItem = {
    id: t.id,
    workflowId: `wf-${t.service}`,
    version: t.version,
    versionLabel: t.versionLabel,
    service: t.service,
    status: t.status,
    namespace: t.namespace,
    strategy: t.strategy,
    createdAt: new Date().toISOString(),
  };

  return {
    id: t.id,
    identity,
    envGroup,
    path: formatDeploymentPath(identity),
    cloud: t.cloud,
    status: t.status,
    aiPhase: phase,
    riskScore,
    urgency,
    priority,
    versionLabel: t.versionLabel,
    service: t.service,
    namespace: t.namespace,
    strategy: t.strategy,
    createdAt: raw.createdAt,
    healthPct: Math.max(35, Math.min(100, 100 - Math.round(riskScore / 2.5))),
    metrics: {
      cpu: 28 + (seed % 52),
      memory: 33 + (seed % 45),
      latencyMs: 65 + (seed % 160),
      errorRate: Math.round((seed % 90) / 10) / 10,
    },
    aiActions: [
      `${phase === "incident" ? "Incident playbook" : "Progressive delivery"} · ${t.service}`,
      "Blast-radius limits enforced",
    ],
    isLive: false,
    raw,
  };
}

function applyCorrelations(all: EnrichedDeployment[]): EnrichedDeployment[] {
  const groups = new Map<string, EnrichedDeployment[]>();
  for (const d of all) {
    const key = d.metrics.latencyMs > 150 ? "latency-hot" : d.aiPhase === "incident" ? "error-hot" : "stable";
    const list = groups.get(key) ?? [];
    list.push(d);
    groups.set(key, list);
  }
  const signalFor = (d: EnrichedDeployment): string | undefined => {
    if (d.aiPhase === "incident") return "Correlated: error-rate spike cluster (multi-service)";
    const g = d.metrics.latencyMs > 150 ? groups.get("latency-hot") ?? [] : [];
    if (g.length >= 2 && d.metrics.latencyMs > 150) {
      return "Correlated: regional latency elevation (shared edge dependency)";
    }
    return undefined;
  };
  return all.map((d) => ({ ...d, correlatedSignal: signalFor(d) ?? d.correlatedSignal }));
}

export function buildDeploymentUniverse(
  items: DeploymentHistoryItem[],
  context: { orgId: string; projectId: string; envId: string }
): EnrichedDeployment[] {
  const enriched = items.map((i) => enrichDeploymentItem(i, context));
  const paths = new Set(enriched.map((e) => e.path));
  const seeds = seedTemplates({ orgId: context.orgId, projectId: context.projectId });
  const merged = [...enriched];
  for (const t of seeds) {
    const full = fromSeed(t);
    if (!paths.has(full.path)) {
      merged.push(full);
      paths.add(full.path);
    }
  }
  return applyCorrelations(merged);
}

export function sortByAiPriority(a: EnrichedDeployment, b: EnrichedDeployment): number {
  return b.priority - a.priority || b.riskScore - a.riskScore || b.urgency - a.urgency;
}

export type DeploymentStatusFilter = "all" | "healthy" | "active" | "incident";

export function matchesStatusFilter(d: EnrichedDeployment, f: DeploymentStatusFilter): boolean {
  if (f === "all") return true;
  if (f === "incident") return d.aiPhase === "incident";
  if (f === "healthy") return d.aiPhase === "stabilized";
  if (f === "active") return d.aiPhase === "monitoring" || d.aiPhase === "acting";
  return true;
}
