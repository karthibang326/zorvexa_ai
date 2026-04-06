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
  try {
    getRunQueue();
    if (workerRef) return workerRef;
    workerRef = new Worker(
      "workflow-run-queue",
      processor,
      { connection: { url: env.REDIS_URL } as any }
    );
    return workerRef;
  } catch (e) {
    console.error("Failed to register RunWorker (Redis connection error):", e);
    return null;
  }
}

export function getRunQueue() {
  if (!runQueueRef) {
    try {
      runQueueRef = new Queue("workflow-run-queue", {
        connection: { url: env.REDIS_URL } as any,
        defaultJobOptions: {
          attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { age: 3600, count: 5000 },
          removeOnFail: { age: 24 * 3600, count: 10000 },
        },
      });
    } catch (e) {
      console.error("Failed to initialize RunQueue:", e);
      return null;
    }
  }
  return runQueueRef;
}

export function getDeploymentQueue() {
  if (!deploymentQueueRef) {
    try {
      deploymentQueueRef = new Queue("deployment-queue", {
        connection: { url: env.REDIS_URL } as any,
        defaultJobOptions: {
          attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
          backoff: { type: "exponential", delay: 1200 },
          removeOnComplete: { age: 3600, count: 5000 },
          removeOnFail: { age: 24 * 3600, count: 10000 },
        },
      });
    } catch (e) {
      console.error("Failed to initialize DeploymentQueue:", e);
      return null;
    }
  }
  return deploymentQueueRef;
}

export function getWorkflowRuntimeQueue() {
  if (!workflowRuntimeQueueRef) {
    try {
      workflowRuntimeQueueRef = new Queue("workflow-runtime-queue", {
        connection: { url: env.REDIS_URL } as any,
        defaultJobOptions: {
          attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
          backoff: { type: "exponential", delay: 1200 },
          removeOnComplete: { age: 3600, count: 5000 },
          removeOnFail: { age: 24 * 3600, count: 10000 },
        },
      });
    } catch (e) {
      console.error("Failed to initialize WorkflowRuntimeQueue:", e);
      return null;
    }
  }
  return workflowRuntimeQueueRef;
}

export function registerDeploymentWorker(processor: any) {
  try {
    getDeploymentQueue();
    if (deploymentWorkerRef) return deploymentWorkerRef;
    deploymentWorkerRef = new Worker(
      "deployment-queue",
      processor,
      { connection: { url: env.REDIS_URL } as any }
    );
    return deploymentWorkerRef;
  } catch (e) {
    console.error("Failed to register DeploymentWorker:", e);
    return null;
  }
}

export function registerWorkflowRuntimeWorker(processor: any) {
  try {
    getWorkflowRuntimeQueue();
    if (workflowRuntimeWorkerRef) return workflowRuntimeWorkerRef;
    workflowRuntimeWorkerRef = new Worker(
      "workflow-runtime-queue",
      processor,
      { connection: { url: env.REDIS_URL } as any }
    );
    return workflowRuntimeWorkerRef;
  } catch (e) {
    console.error("Failed to register WorkflowRuntimeWorker:", e);
    return null;
  }
}

/** AstraOps: workload → AI analysis (BullMQ). */
export function getAiDecisionsQueue() {
  if (!aiDecisionsQueueRef) {
    try {
      aiDecisionsQueueRef = new Queue("ai-decisions", {
        connection: { url: env.REDIS_URL } as any,
        defaultJobOptions: {
          attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
          backoff: { type: "exponential", delay: 800 },
          removeOnComplete: { age: 3600, count: 5000 },
          removeOnFail: { age: 24 * 3600, count: 5000 },
        },
      });
    } catch (e) {
      console.error("Failed to initialize AiDecisionsQueue:", e);
      return null;
    }
  }
  return aiDecisionsQueueRef;
}

export function getAstraExecutorQueue() {
  if (!astraExecutorQueueRef) {
    try {
      astraExecutorQueueRef = new Queue("astra-executor", {
        connection: { url: env.REDIS_URL } as any,
        defaultJobOptions: {
          attempts: Math.max(1, env.RUN_MAX_ATTEMPTS),
          backoff: { type: "fixed", delay: 500 },
          removeOnComplete: { age: 3600, count: 5000 },
          removeOnFail: { age: 24 * 3600, count: 5000 },
        },
      });
    } catch (e) {
      console.error("Failed to initialize AstraExecutorQueue:", e);
      return null;
    }
  }
  return astraExecutorQueueRef;
}

export function registerAstraAiWorker(processor: any) {
  try {
    getAiDecisionsQueue();
    if (astraAiWorkerRef) return astraAiWorkerRef;
    astraAiWorkerRef = new Worker("ai-decisions", processor, {
      connection: { url: env.REDIS_URL } as any,
    });
    return astraAiWorkerRef;
  } catch (e) {
    console.error("Failed to register AstraAiWorker:", e);
    return null;
  }
}

export function registerAstraExecutorWorker(processor: any) {
  try {
    getAstraExecutorQueue();
    if (astraExecutorWorkerRef) return astraExecutorWorkerRef;
    astraExecutorWorkerRef = new Worker("astra-executor", processor, {
      connection: { url: env.REDIS_URL } as any,
    });
    return astraExecutorWorkerRef;
  } catch (e) {
    console.error("Failed to register AstraExecutorWorker:", e);
    return null;
  }
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

