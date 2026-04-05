export type CloudProvider = "aws" | "gcp" | "azure";

export interface CloudOperationParams {
  provider: CloudProvider;
  namespace?: string;
  deploymentName?: string;
  serviceName?: string;
  clusterName?: string;
  region?: string;
  replicas?: number;
  workflowId?: string;
  workflow?: Record<string, unknown>;
}

export interface CloudMetrics {
  cpu: number;
  memory: number;
  cost: number;
  provider: CloudProvider;
  /** live when CloudWatch (or future adapters) supplied primary signals */
  source?: "live" | "simulated";
}

export interface CloudActionResult {
  ok: boolean;
  status: string;
  provider: CloudProvider;
  details?: Record<string, unknown>;
}

export interface CloudAdapter {
  scaleDeployment(params: CloudOperationParams): Promise<CloudActionResult>;
  restartService(params: CloudOperationParams): Promise<CloudActionResult>;
  getMetrics(params: CloudOperationParams): Promise<CloudMetrics>;
  deployWorkflow(params: CloudOperationParams): Promise<CloudActionResult>;
}

