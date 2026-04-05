export type WorkflowAiMode = "manual" | "assist" | "auto";

export type WorkflowExecutionContext = {
  environment: string;
  namespace: string;
  strategy: "canary" | "rolling";
  maxActionsPerHour: number;
  approvalRequired: boolean;
};

export type WorkflowAiDecision = {
  action: string;
  replicas?: number;
  reason: string;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  metricsUsed: Record<string, number>;
};

export type WorkflowNodeRun = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "success" | "failed" | "skipped";
  attempt: number;
  durationMs: number;
  reason?: string;
  confidence?: number;
  metricsUsed?: Record<string, number>;
};

export type WorkflowExecutionResult = {
  workflowId: string;
  runId: string;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  steps: WorkflowNodeRun[];
};
