import { env } from "./config/env";
import { startRunWorker } from "./workers/run.worker";
import { startDeploymentWorker } from "./workers/deployment.worker";
import { startWorkflowWorker } from "./workers/workflow-worker";
import { startAstraAiWorker } from "./workers/astra-ai.worker";
import { startAstraExecutorWorker } from "./workers/astra-executor.worker";
import { closeQueueResources } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { logError, logInfo } from "./lib/logger";

async function bootstrapWorker() {
  startRunWorker();
  startDeploymentWorker();
  startWorkflowWorker();
  startAstraAiWorker();
  startAstraExecutorWorker();
  logInfo("run_worker_started", { redis: env.REDIS_URL });

  const shutdown = async () => {
    logInfo("run_worker_shutdown_start");
    await closeQueueResources();
    await prisma.$disconnect();
    logInfo("run_worker_shutdown_done");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrapWorker().catch((e) => {
  logError("run_worker_bootstrap_failed", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
