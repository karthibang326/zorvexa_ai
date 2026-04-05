/**
 * ASTRAOPS On-Premise Agent Types
 *
 * Lightweight agents run on every on-prem node.  They receive commands from
 * the ASTRAOPS control plane, execute them locally (deploy containers, restart
 * services, report telemetry), and stream events back via SSE / WebSocket.
 *
 * Protocol: JSON over HTTP/2 with mTLS.  In production agents register with
 * the control plane at start-up; the manager maintains the live registry.
 */

export type AgentStatus = "online" | "offline" | "degraded" | "unreachable";

export type AgentCommandType =
  | "DEPLOY_CONTAINER"
  | "STOP_CONTAINER"
  | "RESTART_SERVICE"
  | "SCALE_WORKLOAD"
  | "DRAIN_NODE"
  | "EVICT_PODS"
  | "COLLECT_METRICS"
  | "EXECUTE_SCRIPT"
  | "UPDATE_AGENT"
  | "FAILOVER_INITIATE"
  | "FAILOVER_COMPLETE";

export type AgentCommandStatus =
  | "PENDING"
  | "ACKNOWLEDGED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED_OUT";

export interface AgentRegistration {
  agentId: string;
  hostname: string;
  ip: string;
  datacenter: string;
  rack?: string;
  os: string;
  kernelVersion?: string;
  cpuCores: number;
  memoryGb: number;
  provider: "baremetal" | "vmware" | "k8s-onprem";
  labels: Record<string, string>;
  registeredAt: string;   // ISO-8601
  version: string;        // agent semver
}

export interface AgentHeartbeat {
  agentId: string;
  timestamp: string;
  status: AgentStatus;
  cpuPct: number;
  memoryPct: number;
  diskPct: number;
  networkMbps: number;
  runningContainers: number;
  pendingCommands: number;
}

export interface AgentCommand {
  commandId: string;
  agentId: string;
  type: AgentCommandType;
  payload: Record<string, unknown>;
  issuedAt: string;
  timeoutMs: number;
  status: AgentCommandStatus;
  result?: Record<string, unknown>;
  error?: string;
  completedAt?: string;
}

export interface AgentEvent {
  eventId: string;
  agentId: string;
  type: string;
  severity: "info" | "warn" | "error" | "critical";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface OnPremAgentSummary {
  agentId: string;
  hostname: string;
  ip: string;
  datacenter: string;
  provider: string;
  status: AgentStatus;
  cpuPct: number;
  memoryPct: number;
  lastSeenAt: string;
  commandsExecuted: number;
  version: string;
}
