import { Agent, CreateAgentDTO, AgentStatus } from "../models/agent.types";

export class AgentService {
  private static agents: Map<number, Agent> = new Map();
  private static counter = 0;

  static createAgent(data: CreateAgentDTO): Agent {
    this.counter++;
    const newAgent: Agent = {
      ...data,
      id: this.counter,
      status: "RUNNING",
      createdAt: new Date(),
    };
    this.agents.set(newAgent.id, newAgent);
    return newAgent;
  }

  static getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  static getAgentById(id: number): Agent | undefined {
    return this.agents.get(id);
  }

  static updateAgentStatus(id: number, status: AgentStatus, lastDecision?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastRun = new Date();
      if (lastDecision) agent.lastDecision = lastDecision;
      this.agents.set(id, agent);
    }
  }

  static deleteAgent(id: number): boolean {
    return this.agents.delete(id);
  }
}
