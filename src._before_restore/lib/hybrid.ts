/**
 * ASTRAOPS — Hybrid Cloud API Client
 * Thin fetch wrappers for all 5 new backend module routes.
 */

function apiBase(): string {
  const root =
    (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") ||
    window.location.origin;
  return `${root}/api`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── UIAL ─────────────────────────────────────────────────────────────────────

export interface UIALProvider {
  provider: string;
  environment: string;
  displayName: string;
}

export interface UIALHealthResult {
  healthy: boolean;
  providers: Array<UIALProvider & { healthy: boolean; message?: string; checkedAt?: string; metrics?: Record<string, number> }>;
}

export interface UnifiedMetrics {
  provider: string;
  environment: string;
  resourceId: string;
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  cost: number;
  latency: number;
  errorRate: number;
  timestamp: string;
}

export const uialApi = {
  providers: ()    => get<{ providers: UIALProvider[] }>("/uial/providers"),
  health:    ()    => get<UIALHealthResult>("/uial/health"),
  metrics:   (env?: string) => get<{ metrics: UnifiedMetrics[] }>(`/uial/metrics${env ? `?env=${env}` : ""}`),
};

// ─── On-Prem Agents ───────────────────────────────────────────────────────────

export interface OnPremAgent {
  agentId: string;
  hostname: string;
  ip: string;
  datacenter: string;
  provider: string;
  status: "online" | "offline" | "degraded" | "unreachable";
  cpuPct: number;
  memoryPct: number;
  lastSeenAt: string;
  commandsExecuted: number;
  version: string;
}

export interface AgentCommand {
  commandId: string;
  agentId: string;
  type: string;
  payload: Record<string, unknown>;
  issuedAt: string;
  status: string;
  result?: Record<string, unknown>;
  completedAt?: string;
}

export const agentsApi = {
  list:            ()           => get<{ agents: OnPremAgent[] }>("/onprem-agents"),
  get:             (id: string) => get<{ registration: unknown; heartbeat: unknown; recentCommands: AgentCommand[]; recentEvents: unknown[] }>(`/onprem-agents/${id}`),
  commands:        (id: string) => get<{ commands: AgentCommand[] }>(`/onprem-agents/${id}/commands`),
  events:          (limit = 50) => get<{ events: unknown[] }>(`/onprem-agents/events?limit=${limit}`),
  sendCommand:     (id: string, type: string, payload = {}) =>
    post<{ command: AgentCommand }>(`/onprem-agents/${id}/command`, { type, payload }),
  simulateFailure: (id: string) => post<{ ok: boolean }>(`/onprem-agents/${id}/simulate-failure`),
};

// ─── Hybrid Brain ─────────────────────────────────────────────────────────────

export interface InfraSnapshot {
  provider: string;
  environment: string;
  cpu: number;
  memory: number;
  cost: number;
  latency: number;
  healthy: boolean;
  onlineAgents?: number;
}

export interface PlacementDecision {
  workloadId: string;
  workloadName: string;
  targetProvider: string;
  targetEnvironment: string;
  targetRegion?: string;
  confidence: number;
  reasons: string[];
  alternativeProvider?: string;
  estimatedMonthlyCostUsd: number;
  estimatedLatencyMs: number;
  complianceSatisfied: boolean;
  decidedAt: string;
}

export interface WorkloadMigration {
  migrationId: string;
  workloadId: string;
  fromProvider: string;
  fromEnvironment: string;
  toProvider: string;
  toEnvironment: string;
  reason: string;
  phase: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface WorkloadProfile {
  id: string;
  name: string;
  dataLocality: "onprem-only" | "cloud-ok" | "region-restricted";
  compliance: string[];
  latencySensitive: boolean;
  burstable: boolean;
  cpuRequest: number;
  memoryRequest: number;
  priorityClass: "critical" | "high" | "normal" | "low";
}

export const hybridBrainApi = {
  decide:     (workload: WorkloadProfile, opts?: { forceOnPrem?: boolean; forceCloud?: boolean }) =>
    post<{ decision: PlacementDecision }>("/hybrid-brain/decide", { workload, ...opts }),
  snapshot:   ()           => get<{ snapshots: InfraSnapshot[] }>("/hybrid-brain/snapshot"),
  migrations: (limit = 50) => get<{ migrations: WorkloadMigration[] }>(`/hybrid-brain/migrations?limit=${limit}`),
  migrate: (params: {
    workloadId: string; workloadName: string;
    fromProvider: string; fromEnvironment: string;
    toProvider: string; toEnvironment: string; reason: string;
  }) => post<{ migration: WorkloadMigration }>("/hybrid-brain/migrate", params),
};

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryAggregate {
  totalProviders: number;
  cloudProviders: number;
  onPremProviders: number;
  totalCostPerHour: number;
  avgCpu: number;
  avgMemory: number;
  avgLatency: number;
  avgErrorRate: number;
  collectedAt: string;
  metrics: UnifiedMetrics[];
}

export interface TelemetryAlert {
  alertId: string;
  severity: "info" | "warning" | "critical";
  provider: string;
  environment: string;
  resourceId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  firedAt: string;
  resolvedAt?: string;
}

export const telemetryApi = {
  collect: ()              => get<TelemetryAggregate>("/telemetry/collect"),
  alerts:  (limit = 100)  => get<{ alerts: TelemetryAlert[] }>(`/telemetry/alerts?limit=${limit}`),
  resolve: (alertId: string) => post<{ ok: boolean }>(`/telemetry/alerts/${alertId}/resolve`),
};

// ─── Hybrid Failover ──────────────────────────────────────────────────────────

export interface FailoverEvent {
  failoverId: string;
  trigger: string;
  sourceProvider: string;
  sourceEnvironment: string;
  targetProvider: string;
  targetEnvironment: string;
  affectedWorkloads: string[];
  state: string;
  detectedAt: string;
  completedAt?: string;
  durationMs?: number;
  stateHistory: Array<{ state: string; at: string; notes?: string }>;
  rtoMs?: number;
  rpoMs?: number;
  verified: boolean;
  error?: string;
}

export const failoverApi = {
  list:     (limit = 50) => get<{ failovers: FailoverEvent[] }>(`/failover?limit=${limit}`),
  get:      (id: string) => get<{ failover: FailoverEvent }>(`/failover/${id}`),
  trigger:  (params: unknown) => post<{ failover: FailoverEvent }>("/failover/trigger", params),
  simulate: (scenario: "onprem-crash" | "cloud-outage" | "latency-spike") =>
    post<{ failover: FailoverEvent }>(`/failover/simulate/${scenario}`),
};
