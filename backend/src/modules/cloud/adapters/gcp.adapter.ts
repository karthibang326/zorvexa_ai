import { CloudAdapter, CloudMetrics, CloudOperationParams } from "../cloud.types";
import { tryDeployWebhook } from "./deploy-webhook";
import { tryFetchGcpLiveCpuPct } from "./gcp-monitoring-metrics";
import { tryCloudMetricsFromOpsUrl } from "./ops-url-metrics";
import { runK8sBackedRestart, runK8sBackedScale } from "./k8s-bridge";

/** GKE workloads; MIG/Compute scaling can share this adapter surface. */
export const gcpAdapter: CloudAdapter = {
  async scaleDeployment(params: CloudOperationParams) {
    const live = await runK8sBackedScale("gcp", params);
    if (live) return live;
    return {
      ok: true,
      status: "GCP_GKE_SCALE_SIMULATED",
      provider: "gcp",
      details: {
        simulated: true,
        clusterName: params.clusterName,
        deploymentName: params.deploymentName,
        replicas: params.replicas ?? 2,
      },
    };
  },

  async restartService(params: CloudOperationParams) {
    const live = await runK8sBackedRestart("gcp", params);
    if (live) return live;
    return {
      ok: true,
      status: "GCP_SERVICE_RESTART_SIMULATED",
      provider: "gcp",
      details: { simulated: true, serviceName: params.serviceName ?? params.deploymentName },
    };
  },

  async getMetrics(_params: CloudOperationParams): Promise<CloudMetrics> {
    const fromOps = await tryCloudMetricsFromOpsUrl("gcp");
    if (fromOps) return fromOps;
    const liveCpu = await tryFetchGcpLiveCpuPct();
    if (liveCpu != null) {
      return {
        provider: "gcp",
        cpu: liveCpu,
        memory: 52,
        cost: 78,
        source: "live",
      };
    }
    return {
      provider: "gcp",
      cpu: 55,
      memory: 49,
      cost: 78,
      source: "simulated",
    };
  },

  async deployWorkflow(params: CloudOperationParams) {
    const wh = await tryDeployWebhook("gcp", params);
    if (wh) return wh;
    return {
      ok: true,
      status: "GCP_WORKFLOW_SIMULATED",
      provider: "gcp",
      details: {
        simulated: true,
        workflowId: params.workflowId,
        region: params.region || process.env.GCP_REGION || "us-central1",
        note: "Set CLOUD_DEPLOY_WEBHOOK_URL + SIMULATION_MODE=false for live CI triggers.",
      },
    };
  },
};

