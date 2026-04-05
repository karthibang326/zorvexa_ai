import { api } from "./api";

export type WorkflowType = "system" | "user" | "agent";
export class WorkflowsApiError extends Error {}

export interface WorkflowGraphPayload {
  nodes: unknown[];
  edges: unknown[];
}

export interface WorkflowCreatePayload extends WorkflowGraphPayload {
  name: string;
  type: WorkflowType;
}

export interface Workflow {
  id: string;
  name: string;
  type: WorkflowType;
  version: string | number;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowAiMode = "manual" | "assist" | "auto";

export interface WorkflowExecutionContext {
  environment: string;
  namespace: string;
  strategy: "canary" | "rolling";
  maxActionsPerHour: number;
  approvalRequired: boolean;
}

export interface WorkflowAiExecuteResponse {
  workflowId: string;
  runId: string;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  steps: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: "success" | "failed" | "skipped";
    attempt: number;
    durationMs: number;
    reason?: string;
    confidence?: number;
    metricsUsed?: Record<string, number>;
  }>;
}

export interface WorkflowAiSimulationResponse {
  workflowId: string;
  mode: WorkflowAiMode;
  simulation: {
    predicted_latency: string;
    cpu_reduction: string;
    cost_increase: string;
    risk: "low" | "medium" | "high";
  };
  steps: Array<{
    node: string;
    predictedStatus: "success" | "pending_approval";
    reason: string;
    risk: "LOW" | "MEDIUM" | "HIGH";
    confidence: number;
    metricsUsed: Record<string, number>;
  }>;
}

export async function createWorkflow(payload: WorkflowCreatePayload) {
  const { data } = await api.post("/workflows", payload);
  return data as Workflow;
}

export async function fetchWorkflow(id: string) {
  const { data } = await api.get(`/workflows/${encodeURIComponent(id)}`);
  return data as Workflow;
}

export async function saveWorkflow(id: string, payload: WorkflowGraphPayload) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(id)}/save`, payload);
  return data as Workflow;
}

export async function revertWorkflowVersion(id: string, version: number) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(id)}/revert`, { version });
  return data as Pick<Workflow, "nodes" | "edges" | "version">;
}

export interface DeployPayload {
  workflowId?: string;
  rolloutName?: string;
  namespace: string;
  strategy: "canary" | "rolling";
}

export interface DeployStartResponse {
  deploymentId: string;
  status: string;
  message?: string;
}

export interface DeployStatusResponse {
  deploymentId: string;
  status: string;
  message?: string;
  phase?: string;
}

export interface StopDeployResponse {
  deploymentId: string;
  status: string;
  message?: string;
}

export interface DeploymentHistoryItem {
  id: string;
  workflowId: string;
  version: number;
  versionLabel?: string | null;
  service?: string | null;
  status: string;
  namespace: string;
  strategy: "canary" | "rolling";
  createdAt: string;
  startedAt?: string;
  completedAt?: string | null;
}

export interface WorkflowListApiItem {
  id: string;
  name: string;
  type: WorkflowType;
  version: number;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listWorkflows(): Promise<WorkflowListApiItem[]> {
  const { data } = await api.get("/workflows");
  return (data?.items ?? []) as WorkflowListApiItem[];
}

export async function postWorkflowAiExecute(payload: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
}) {
  const { data } = await api.post("/workflows/ai/execute", payload);
  return data as WorkflowAiExecuteResponse;
}

export async function postWorkflowExecuteById(payload: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
}) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(payload.workflowId)}/execute`, {
    mode: payload.mode,
    context: payload.context,
  });
  return data as { workflowId: string; runId: string; status: "RUNNING" | "PENDING_APPROVAL" | "SUCCESS" | "FAILED" };
}

export async function postWorkflowAiSimulate(payload: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
}) {
  const { data } = await api.post("/workflows/ai/simulate", payload);
  return data as WorkflowAiSimulationResponse;
}

export async function postWorkflowSimulateById(payload: {
  workflowId: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
}) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(payload.workflowId)}/simulate`, {
    mode: payload.mode,
    context: payload.context,
  });
  return data as WorkflowAiSimulationResponse;
}

export async function postWorkflowApproveById(payload: {
  workflowId: string;
  runId?: string;
  mode: WorkflowAiMode;
  context: WorkflowExecutionContext;
}) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(payload.workflowId)}/approve`, {
    runId: payload.runId,
    mode: payload.mode,
    context: payload.context,
  });
  return data as { workflowId: string; runId: string; status: "RUNNING" | "PENDING_APPROVAL" | "SUCCESS" | "FAILED" };
}

export async function postWorkflowAiOptimize(payload: { workflowId: string }) {
  const { data } = await api.post("/workflows/ai/optimize", payload);
  return data as {
    workflowId: string;
    optimizedNodes: unknown[];
    optimizedEdges: unknown[];
    suggestions: string[];
    estimatedLatencyReductionPct: number;
    estimatedCostReductionPct: number;
  };
}

/** Service-scoped deployment (creates or reuses workflow by name, then runs deploy). */
export async function postCreateDeploymentByService(payload: {
  service: string;
  version: string;
}): Promise<{ deploymentId: string; status: string }> {
  const { data } = await api.post("/deployments", payload);
  return data as { deploymentId: string; status: string };
}

export async function deployWorkflowById(
  workflowId: string,
  payload: { rolloutName?: string; namespace: string; strategy: "canary" | "rolling" }
): Promise<DeployStartResponse> {
  const { data } = await api.post(`/workflows/${encodeURIComponent(workflowId)}/deploy`, payload);
  return data as DeployStartResponse;
}

export async function getDeployStatus(deploymentId: string): Promise<DeployStatusResponse> {
  const { data } = await api.get(`/deploy/${encodeURIComponent(deploymentId)}/status`);
  return data as DeployStatusResponse;
}

export async function postStopDeploy(deploymentId: string): Promise<StopDeployResponse> {
  const { data } = await api.post(`/deploy/${encodeURIComponent(deploymentId)}/stop`, {});
  return data as StopDeployResponse;
}

export interface AutoDeployPayload {
  repositoryId?: string;
  branch?: string;
  serviceName?: string;
  namespace?: string;
  strategy?: "canary" | "rolling";
  autoDeployOnPush?: boolean;
}

export async function postAutoDeploy(payload: AutoDeployPayload): Promise<DeployStartResponse> {
  const { data } = await api.post("/deploy/auto", payload);
  return data as DeployStartResponse;
}

export async function getDeploymentHistory(): Promise<DeploymentHistoryItem[]> {
  const { data } = await api.get("/deploy/history");
  return (data?.items ?? []) as DeploymentHistoryItem[];
}

export async function postRollbackDeploy(deploymentId: string): Promise<{
  deploymentId: string;
  status: string;
  rolledBackToVersion: number;
  sourceDeploymentId: string;
}> {
  const { data } = await api.post(`/deploy/${encodeURIComponent(deploymentId)}/rollback`, {});
  return data as {
    deploymentId: string;
    status: string;
    rolledBackToVersion: number;
    sourceDeploymentId: string;
  };
}

export const postWorkflow = createWorkflow;
export const getWorkflow = fetchWorkflow;
export const putWorkflow = saveWorkflow;
export const postDeploy = async (payload: DeployPayload): Promise<DeployStartResponse> => {
  if (!payload.workflowId) {
    throw new Error("workflowId is required for deployment");
  }
  return deployWorkflowById(payload.workflowId, {
    rolloutName: payload.rolloutName,
    namespace: payload.namespace,
    strategy: payload.strategy,
  });
};
export const getLatestVersion = async (id: string) => {
  const wf = await fetchWorkflow(id);
  return { nodes: wf.nodes, edges: wf.edges, version: wf.version };
};

