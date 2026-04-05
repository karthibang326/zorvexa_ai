export type RuntimeMode = "manual" | "assist" | "auto";

export type RuntimeContext = {
  environment: string;
  namespace: string;
  strategy: "canary" | "rolling";
  approvalRequired: boolean;
  maxActionsPerHour: number;
};

export type RuntimeState = {
  workflowId: string;
  runId: string;
  currentNode: string | null;
  status: "RUNNING" | "PENDING_APPROVAL" | "SUCCESS" | "FAILED";
  history: Array<{
    nodeId: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    attempt: number;
    message?: string;
    ts: string;
  }>;
};
