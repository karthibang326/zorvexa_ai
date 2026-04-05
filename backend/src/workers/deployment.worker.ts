import { Job } from "bullmq";
import { registerDeploymentWorker } from "../lib/queue";
import { runDeploymentLifecycle } from "../modules/deployment/deployment.service";
import { logError, logInfo } from "../lib/logger";

export function startDeploymentWorker() {
  registerDeploymentWorker(async (job: Job<{ deploymentId: string }>) => {
    const deploymentId = job.data.deploymentId;
    try {
      await runDeploymentLifecycle(deploymentId);
      logInfo("deployment_worker_completed", { deploymentId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logError("deployment_worker_failed", { deploymentId, msg });
      throw e;
    }
  });
  logInfo("deployment_worker_started");
}

