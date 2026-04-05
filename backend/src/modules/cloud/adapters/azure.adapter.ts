import { CloudAdapter, CloudMetrics, CloudOperationParams } from "../cloud.types";
import { tryDeployWebhook } from "./deploy-webhook";
import { tryFetchAzureLiveCpuPct } from "./azure-monitor-metrics";
import { tryCloudMetricsFromOpsUrl } from "./ops-url-metrics";
import { runK8sBackedRestart, runK8sBackedScale } from "./k8s-bridge";

/** AKS deployments; VMSS scale-out maps to same operation contract. */
export const azureAdapter: CloudAdapter = {
  async scaleDeployment(params: CloudOperationParams) {
    const live = await runK8sBackedScale("azure", params);
    if (live) return live;
    return {
      ok: true,
      status: "AZURE_AKS_SCALE_SIMULATED",
      provider: "azure",
      details: {
        simulated: true,
        clusterName: params.clusterName,
        deploymentName: params.deploymentName,
        replicas: params.replicas ?? 2,
      },
    };
  },

  async restartService(params: CloudOperationParams) {
    const live = await runK8sBackedRestart("azure", params);
    if (live) return live;
    return {
      ok: true,
      status: "AZURE_SERVICE_RESTART_SIMULATED",
      provider: "azure",
      details: { simulated: true, serviceName: params.serviceName ?? params.deploymentName },
    };
  },

  async getMetrics(_params: CloudOperationParams): Promise<CloudMetrics> {
    const fromOps = await tryCloudMetricsFromOpsUrl("azure");
    if (fromOps) return fromOps;
    const liveCpu = await tryFetchAzureLiveCpuPct();
    if (liveCpu != null) {
      return {
        provider: "azure",
        cpu: liveCpu,
        memory: 54,
        cost: 83,
        source: "live",
      };
    }
    return {
      provider: "azure",
      cpu: 59,
      memory: 54,
      cost: 83,
      source: "simulated",
    };
  },

  async deployWorkflow(params: CloudOperationParams) {
    const wh = await tryDeployWebhook("azure", params);
    if (wh) return wh;
    return {
      ok: true,
      status: "AZURE_WORKFLOW_SIMULATED",
      provider: "azure",
      details: {
        simulated: true,
        workflowId: params.workflowId,
        region: params.region || process.env.AZURE_REGION || "eastus",
        note: "Set CLOUD_DEPLOY_WEBHOOK_URL + SIMULATION_MODE=false for live CI triggers.",
      },
    };
  },
};

