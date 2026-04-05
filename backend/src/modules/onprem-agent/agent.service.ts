import { agentManager } from "./agent.manager";
import type { AgentCommandType } from "./agent.types";

export const agentService = {
  listAgents() {
    return agentManager.listAgents();
  },

  getAgent(agentId: string) {
    const rec = agentManager.getAgent(agentId);
    if (!rec) throw new Error(`Agent "${agentId}" not found`);
    return {
      registration: rec.registration,
      heartbeat: rec.heartbeat,
      recentCommands: rec.commands.slice(-20),
      recentEvents: rec.events.slice(-20),
    };
  },

  sendCommand(agentId: string, type: AgentCommandType, payload: Record<string, unknown>) {
    return agentManager.sendCommand(agentId, type, payload);
  },

  /** Broadcast a command to all agents in a given datacenter */
  broadcastCommand(datacenter: string, type: AgentCommandType, payload: Record<string, unknown>) {
    const agents = agentManager.listAgents().filter(
      (a) => a.datacenter === datacenter && a.status !== "offline"
    );
    return agents.map((a) => agentManager.sendCommand(a.agentId, type, payload));
  },

  listCommands(agentId: string) {
    return agentManager.listCommands(agentId);
  },

  listEvents(agentId?: string, limit = 100) {
    return agentManager.listEvents(agentId, limit);
  },

  /** Trigger a simulated node failure for chaos / test purposes */
  simulateFailure(agentId: string) {
    agentManager.simulateFailure(agentId);
    return { ok: true, agentId, message: "Failure simulation triggered" };
  },

  subscribeEvents(fn: Parameters<typeof agentManager.onEvent>[0]) {
    return agentManager.onEvent(fn);
  },
};
