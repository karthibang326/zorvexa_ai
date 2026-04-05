import { CloudAdapter, CloudMetrics, CloudOperationParams } from "../cloud.types";
import { tryFetchAwsLiveCpuPct } from "./aws-cloudwatch-metrics";
import { runEcsRestart, runEcsScale } from "./aws-ecs-bridge";
import { tryCloudMetricsFromOpsUrl } from "./ops-url-metrics";
import { tryDeployWebhook } from "./deploy-webhook";
import { runK8sBackedRestart, runK8sBackedScale } from "./k8s-bridge";

async function awsClient() {
  if (process.env.NODE_ENV === "test") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CloudWatchClient } = require("@aws-sdk/client-cloudwatch");
    return new CloudWatchClient({ region: process.env.AWS_REGION || "us-east-1" });
  } catch {
    return null;
  }
}

/** EKS deployments / node groups; extend with Application Auto Scaling when wired to ASG. */
export const awsAdapter: CloudAdapter = {
  async scaleDeployment(params: CloudOperationParams) {
    const ecs = await runEcsScale(params);
    if (ecs) return ecs;
    const live = await runK8sBackedScale("aws", params);
    if (live) return live;
    return {
      ok: true,
      status: "AWS_EKS_SCALE_SIMULATED",
      provider: "aws",
      details: {
        simulated: true,
        clusterName: params.clusterName,
        deploymentName: params.deploymentName,
        replicas: params.replicas ?? 2,
      },
    };
  },

  async restartService(params: CloudOperationParams) {
    const ecs = await runEcsRestart(params);
    if (ecs) return ecs;
    const live = await runK8sBackedRestart("aws", params);
    if (live) return live;
    return {
      ok: true,
      status: "AWS_SERVICE_RESTART_SIMULATED",
      provider: "aws",
      details: { simulated: true, serviceName: params.serviceName ?? params.deploymentName },
    };
  },

  async getMetrics(params: CloudOperationParams): Promise<CloudMetrics> {
    await awsClient();
    const fromOps = await tryCloudMetricsFromOpsUrl("aws");
    if (fromOps) return fromOps;
    const liveCpu = await tryFetchAwsLiveCpuPct();
    if (liveCpu != null) {
      return {
        provider: "aws",
        cpu: liveCpu,
        memory: 58,
        cost: 95,
        source: "live",
      };
    }
    return {
      provider: "aws",
      cpu: 62,
      memory: 58,
      cost: 95,
      source: "simulated",
    };
  },

  async deployWorkflow(params: CloudOperationParams) {
    const wh = await tryDeployWebhook("aws", params);
    if (wh) return wh;
    return {
      ok: true,
      status: "AWS_WORKFLOW_SIMULATED",
      provider: "aws",
      details: {
        simulated: true,
        workflowId: params.workflowId,
        region: params.region || process.env.AWS_REGION || "us-east-1",
        note: "Set CLOUD_DEPLOY_WEBHOOK_URL + SIMULATION_MODE=false for live CI triggers.",
      },
    };
  },
};

