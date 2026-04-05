export type SreMetrics = {
  latencyP95?: number;
  cpu?: number;
  errorRate?: number;
  costDeltaPct?: number;
  currentReplicas?: number;
};

export type SreActionPlan = {
  action: "scale_up" | "rollback" | "restart_pods" | "block_ip" | "no_action";
  resource: string;
  reason: string;
  replicas?: number;
  riskScore: number;
  confidence: number;
};

