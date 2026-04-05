import { Queue, Worker, Job } from "bullmq";
import { logger } from "../utils/logger";

export interface ExecuteWorkflowPayload {
  workflowId: string;
}

let queue: Queue<ExecuteWorkflowPayload> | null = null;
let worker: Worker<ExecuteWorkflowPayload> | null = null;

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { connection: { url } as any };
}

export function queueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function getExecutionQueue(): Queue<ExecuteWorkflowPayload> | null {
  if (!queueEnabled()) return null;
  if (!queue) {
    queue = new Queue<ExecuteWorkflowPayload>("workflow-execution", redisConnection() as any);
  }
  return queue;
}

export async function triggerWorkflow(workflowId: string): Promise<void> {
  const q = getExecutionQueue();
  if (!q) {
    logger.warn("queue_disabled_execution_skipped", { workflowId });
    return;
  }
  await q.add(
    "execute",
    { workflowId },
    {
      jobId: `exec-${workflowId}`, // Idempotent key
      attempts: 5,                 // Robust retries
      backoff: {
        type: "exponential",
        delay: 2000,               // Exponential backoff strategy
      },
      removeOnComplete: true,      // Clean up fast
      removeOnFail: false,         // Keep in Redis as a Dead-Letter trace
    }
  );
}

export function startExecutionWorker(handler: (job: Job<ExecuteWorkflowPayload>) => Promise<void>) {
  if (!queueEnabled() || worker) return;
  worker = new Worker<ExecuteWorkflowPayload>(
    "workflow-execution",
    async (job) => handler(job),
    redisConnection() as any
  );
  worker.on("failed", (job, err) => {
    logger.error("workflow_execution_failed", {
      jobId: job?.id,
      workflowId: job?.data?.workflowId,
      error: err.message,
    });
  });
}

