export type AgentType = "monitoring" | "security" | "cost" | "deployment";
export type AgentStatus = "RUNNING" | "IDLE" | "ANALYZING" | "ERROR";

export interface Agent {
  id: number;
  name: string;
  type: AgentType;
  objective: string;
  cluster: string;
  namespace: string;
  service: string;
  logsSource: string;
  metricsSource: string;
  autoRemediation: boolean;
  status: AgentStatus;
  createdAt: Date;
  lastRun?: Date;
  lastDecision?: string;
}

export interface CreateAgentDTO {
  name: string;
  type: AgentType;
  objective: string;
  cluster: string;
  namespace: string;
  service: string;
  logsSource: string;
  metricsSource: string;
  autoRemediation: boolean;
}

export interface AgentLog {
  id: string;
  agentId: number;
  agentName: string;
  timestamp: string;
  message: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
}
