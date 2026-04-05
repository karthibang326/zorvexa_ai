import { Queue, Worker } from "bullmq";
import { env } from "../config/env";

let runQueueRef: Queue | null = null;
let deploymentQueueRef: Queue | null = null;
let workflowRuntimeQueueRef: Queue | null = null;
let aiDecisionsQueueRef: Queue | null = null;
let astraExecutorQueueRef: Queue | null = null;

let workerRef: Worker | null = null;
let deploymentWorkerRef: Worker | null = null;
let workflowRuntimeWorkerRef: Worker | null = null;
let astraAiWorkerRef: Worker | null = null;
let astraExecutorWorkerRef: Worker | null = null;

export function registerRunWorker(processor: any) {
  getRunQueue();
  if (workerRef) return workerRef;
  workerRef = new Worker(
    "workflow-run-queue",
    processor,
    { connection: { url: env.REDIS_URL } as any }
  );
  return workerRef;
}

export function getRunQueue() {
  if (!runQueueRef) {
    runQueueRef = new Queue("workflow-run-queue", {
      connection: { url: env.REDIS_URL } as any,
      defaultJobOptions: {
        attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 24 * 3600, count: 10000 },
      },
    });
  }
  return runQueueRef;
}

export function getDeploymentQueue() {
  if (!deploymentQueueRef) {
    deploymentQueueRef = new Queue("deployment-queue", {
      connection: { url: env.REDIS_URL } as any,
      defaultJobOptions: {
        attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
        backoff: { type: "exponential", delay: 1200 },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 24 * 3600, count: 10000 },
      },
    });
  }
  return deploymentQueueRef;
}

export function getWorkflowRuntimeQueue() {
  if (!workflowRuntimeQueueRef) {
    workflowRuntimeQueueRef = new Queue("workflow-runtime-queue", {
      connection: { url: env.REDIS_URL } as any,
      defaultJobOptions: {
        attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
        backoff: { type: "exponential", delay: 1200 },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 24 * 3600, count: 10000 },
      },
    });
  }
  return workflowRuntimeQueueRef;
}

export function registerDeploymentWorker(processor: any) {
  getDeploymentQueue();
  if (deploymentWorkerRef) return deploymentWorkerRef;
  deploymentWorkerRef = new Worker(
    "deployment-queue",
    processor,
    { connection: { url: env.REDIS_URL } as any }
  );
  return deploymentWorkerRef;
}

export function registerWorkflowRuntimeWorker(processor: any) {
  getWorkflowRuntimeQueue();
  if (workflowRuntimeWorkerRef) return workflowRuntimeWorkerRef;
  workflowRuntimeWorkerRef = new Worker(
    "workflow-runtime-queue",
    processor,
    { connection: { url: env.REDIS_URL } as any }
  );
  return workflowRuntimeWorkerRef;
}

/** AstraOps: workload → AI analysis (BullMQ). */
export function getAiDecisionsQueue() {
  if (!aiDecisionsQueueRef) {
    aiDecisionsQueueRef = new Queue("ai-decisions", {
      connection: { url: env.REDIS_URL } as any,
      defaultJobOptions: {
        attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
        backoff: { type: "exponential", delay: 800 },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 24 * 3600, count: 5000 },
      },
    });
  }
  return aiDecisionsQueueRef;
}

export function getAstraExecutorQueue() {
  if (!astraExecutorQueueRef) {
    astraExecutorQueueRef = new Queue("astra-executor", {
      connection: { url: env.REDIS_URL } as any,
      defaultJobOptions: {
        attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
        backoff: { type: "fixed", delay: 500 },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 24 * 3600, count: 5000 },
      },
    });
  }
  return astraExecutorQueueRef;
}

export function registerAstraAiWorker(processor: any) {
  getAiDecisionsQueue();
  if (astraAiWorkerRef) return astraAiWorkerRef;
  astraAiWorkerRef = new Worker("ai-decisions", processor, {
    connection: { url: env.REDIS_URL } as any,
  });
  return astraAiWorkerRef;
}

export function registerAstraExecutorWorker(processor: any) {
  getAstraExecutorQueue();
  if (astraExecutorWorkerRef) return astraExecutorWorkerRef;
  astraExecutorWorkerRef = new Worker("astra-executor", processor, {
    connection: { url: env.REDIS_URL } as any,
  });
  return astraExecutorWorkerRef;
}

export async function closeQueueResources() {
  if (workerRef) await workerRef.close();
  if (runQueueRef) await runQueueRef.close();
  if (deploymentWorkerRef) await deploymentWorkerRef.close();
  if (deploymentQueueRef) await deploymentQueueRef.close();
  if (workflowRuntimeWorkerRef) await workflowRuntimeWorkerRef.close();
  if (workflowRuntimeQueueRef) await workflowRuntimeQueueRef.close();
  if (astraAiWorkerRef) await astraAiWorkerRef.close();
  if (astraExecutorWorkerRef) await astraExecutorWorkerRef.close();
  if (aiDecisionsQueueRef) await aiDecisionsQueueRef.close();
  if (astraExecutorQueueRef) await astraExecutorQueueRef.close();
}

