export type AgentKind = "SRE" | "COST" | "SECURITY";

export type MetricsState = {
  cpu?: number;
  /** Utilization % or normalized heap pressure */
  memory?: number;
  latency?: number;
  /** Approximate request rate / load index for explainability */
  traffic?: number;
  errorRate?: number;
  cost?: number;
};

export type AgentProposal = {
  agent: AgentKind;
  recommendation: string;
  confidence: number;
  reasoning: string;
  structured: {
    action: string;
    priority: number;
    estimatedCostDeltaPct?: number;
    risk: "low" | "medium" | "high";
  };
};

export type OpsScope = {
  orgId: string;
  projectId?: string;
  envId?: string;
};
