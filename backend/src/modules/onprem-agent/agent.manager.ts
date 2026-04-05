/**
 * On-Prem Agent Manager
 *
 * In-process registry that maintains the live state of all on-prem agents.
 * In production: backed by Redis for multi-instance deployments.
 * Events stream through the same in-process bus used by the Astra control plane.
 */
import type {
  AgentRegistration, AgentHeartbeat, AgentCommand, AgentEvent,
  AgentStatus, AgentCommandStatus, AgentCommandType, OnPremAgentSummary,
} from "./agent.types";

// ─── In-memory store ──────────────────────────────────────────────────────────

interface AgentRecord {
  registration: AgentRegistration;
  heartbeat: AgentHeartbeat;
  commands: AgentCommand[];
  events: AgentEvent[];
}

const agents = new Map<string, AgentRecord>();
const eventListeners: Array<(event: AgentEvent) => void> = [];

// ─── Seed realistic on-prem agents ───────────────────────────────────────────

function seed() {
  const NOW = new Date().toISOString();
  const seedData: Array<AgentRegistration & { cpuPct: number; memoryPct: number; status: AgentStatus }> = [
    {
      agentId: "agent-bm-01", hostname: "prod-bm-01.dc1.internal", ip: "192.168.1.10",
      datacenter: "dc-east-01", rack: "rack-A", os: "Ubuntu 22.04 LTS",
      kernelVersion: "5.15.0-101-generic", cpuCores: 64, memoryGb: 256,
      provider: "baremetal", labels: { role: "compute", tier: "prod" },
      registeredAt: NOW, version: "1.4.2", cpuPct: 72, memoryPct: 65, status: "online",
    },
    {
      agentId: "agent-bm-02", hostname: "prod-bm-02.dc1.internal", ip: "192.168.1.11",
      datacenter: "dc-east-01", rack: "rack-A", os: "Ubuntu 22.04 LTS",
      kernelVersion: "5.15.0-101-generic", cpuCores: 64, memoryGb: 256,
      provider: "baremetal", labels: { role: "compute", tier: "prod" },
      registeredAt: NOW, version: "1.4.2", cpuPct: 48, memoryPct: 51, status: "online",
    },
    {
      agentId: "agent-bm-03", hostname: "prod-bm-03.dc1.internal", ip: "192.168.1.12",
      datacenter: "dc-east-01", rack: "rack-B", os: "Ubuntu 22.04 LTS",
      kernelVersion: "5.15.0-101-generic", cpuCores: 64, memoryGb: 256,
      provider: "baremetal", labels: { role: "compute", tier: "prod" },
      registeredAt: NOW, version: "1.4.2", cpuPct: 91, memoryPct: 88, status: "degraded",
    },
    {
      agentId: "agent-vm-01", hostname: "prod-vm-01.vcenter.internal", ip: "10.20.1.50",
      datacenter: "dc-east-01", os: "Ubuntu 20.04 LTS",
      cpuCores: 8, memoryGb: 32, provider: "vmware",
      labels: { role: "api", tier: "prod" },
      registeredAt: NOW, version: "1.4.1", cpuPct: 60, memoryPct: 55, status: "online",
    },
    {
      agentId: "agent-k8s-01", hostname: "k8s-worker-01.dc1.internal", ip: "10.244.0.10",
      datacenter: "dc-east-01", os: "Flatcar Linux",
      cpuCores: 32, memoryGb: 128, provider: "k8s-onprem",
      labels: { role: "worker", cluster: "k8s-dc1-prod" },
      registeredAt: NOW, version: "1.4.2", cpuPct: 74, memoryPct: 66, status: "online",
    },
    {
      agentId: "agent-k8s-02", hostname: "k8s-worker-02.dc1.internal", ip: "10.244.0.11",
      datacenter: "dc-east-01", os: "Flatcar Linux",
      cpuCores: 32, memoryGb: 128, provider: "k8s-onprem",
      labels: { role: "worker", cluster: "k8s-dc1-prod" },
      registeredAt: NOW, version: "1.4.2", cpuPct: 55, memoryPct: 48, status: "online",
    },
  ];

  for (const s of seedData) {
    const { cpuPct, memoryPct, status, ...reg } = s;
    agents.set(s.agentId, {
      registration: reg,
      heartbeat: {
        agentId: s.agentId, timestamp: NOW, status,
        cpuPct, memoryPct, diskPct: 42,
        networkMbps: 850, runningContainers: 12, pendingCommands: 0,
      },
      commands: [],
      events: [],
    });
  }
}
seed();

// ─── Manager API ──────────────────────────────────────────────────────────────

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const agentManager = {
  register(reg: AgentRegistration): void {
    const existing = agents.get(reg.agentId);
    const NOW = new Date().toISOString();
    agents.set(reg.agentId, {
      registration: reg,
      heartbeat: existing?.heartbeat ?? {
        agentId: reg.agentId, timestamp: NOW, status: "online",
        cpuPct: 0, memoryPct: 0, diskPct: 0,
        networkMbps: 0, runningContainers: 0, pendingCommands: 0,
      },
      commands: existing?.commands ?? [],
      events: existing?.events ?? [],
    });
  },

  heartbeat(hb: AgentHeartbeat): void {
    const rec = agents.get(hb.agentId);
    if (rec) rec.heartbeat = hb;
  },

  listAgents(): OnPremAgentSummary[] {
    return Array.from(agents.values()).map((rec) => ({
      agentId: rec.registration.agentId,
      hostname: rec.registration.hostname,
      ip: rec.registration.ip,
      datacenter: rec.registration.datacenter,
      provider: rec.registration.provider,
      status: rec.heartbeat.status,
      cpuPct: rec.heartbeat.cpuPct,
      memoryPct: rec.heartbeat.memoryPct,
      lastSeenAt: rec.heartbeat.timestamp,
      commandsExecuted: rec.commands.filter((c) => c.status === "SUCCEEDED").length,
      version: rec.registration.version,
    }));
  },

  getAgent(agentId: string): AgentRecord | undefined {
    return agents.get(agentId);
  },

  sendCommand(agentId: string, type: AgentCommandType, payload: Record<string, unknown>): AgentCommand {
    const rec = agents.get(agentId);
    if (!rec) throw new Error(`Agent "${agentId}" not found`);

    const cmd: AgentCommand = {
      commandId: `cmd-${genId()}`,
      agentId,
      type,
      payload,
      issuedAt: new Date().toISOString(),
      timeoutMs: 30_000,
      status: "ACKNOWLEDGED",
    };
    rec.commands.push(cmd);

    // Simulate async execution
    setTimeout(() => {
      const finalStatus: AgentCommandStatus =
        rec.heartbeat.status === "degraded" && type !== "COLLECT_METRICS" ? "FAILED" : "SUCCEEDED";
      cmd.status = finalStatus;
      cmd.completedAt = new Date().toISOString();
      cmd.result = finalStatus === "SUCCEEDED"
        ? { output: `${type} completed on ${rec.registration.hostname}`, exitCode: 0 }
        : { error: "Agent degraded — command aborted", exitCode: 1 };

      const event: AgentEvent = {
        eventId: `evt-${genId()}`,
        agentId,
        type: finalStatus === "SUCCEEDED" ? "command_completed" : "command_failed",
        severity: finalStatus === "SUCCEEDED" ? "info" : "error",
        message: `${type} ${finalStatus} on ${rec.registration.hostname}`,
        data: cmd.result,
        timestamp: cmd.completedAt,
      };
      rec.events.push(event);
      eventListeners.forEach((fn) => fn(event));
    }, Math.random() * 400 + 100);

    return cmd;
  },

  listCommands(agentId: string): AgentCommand[] {
    return agents.get(agentId)?.commands ?? [];
  },

  listEvents(agentId?: string, limit = 100): AgentEvent[] {
    const all: AgentEvent[] = [];
    for (const rec of agents.values()) {
      if (!agentId || rec.registration.agentId === agentId) {
        all.push(...rec.events);
      }
    }
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  },

  onEvent(fn: (event: AgentEvent) => void): () => void {
    eventListeners.push(fn);
    return () => {
      const idx = eventListeners.indexOf(fn);
      if (idx !== -1) eventListeners.splice(idx, 1);
    };
  },

  simulateFailure(agentId: string): void {
    const rec = agents.get(agentId);
    if (!rec) return;
    rec.heartbeat.status = "offline";
    const event: AgentEvent = {
      eventId: `evt-${genId()}`,
      agentId,
      type: "agent_offline",
      severity: "critical",
      message: `Agent ${rec.registration.hostname} went offline — failover initiated`,
      timestamp: new Date().toISOString(),
    };
    rec.events.push(event);
    eventListeners.forEach((fn) => fn(event));
  },
};
