import { Job, Queue, Worker } from "bullmq";
import { logger } from "../utils/logger";
import { simulateDagExecution } from "./run.service";

interface RunJobPayload {
  runId: string;
}

let q: Queue<RunJobPayload> | null = null;
let w: Worker<RunJobPayload> | null = null;

function connection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { connection: { url } as any };
}

function queueOn() {
  return Boolean(process.env.REDIS_URL);
}

export function getRunQueue(): Queue<RunJobPayload> | null {
  if (!queueOn()) return null;
  if (!q) q = new Queue<RunJobPayload>("workflow-runs", connection() as any);
  return q;
}

export async function enqueueRun(runId: string) {
  const queue = getRunQueue();
  if (!queue) {
    // Fallback to in-process execution when Redis not configured.
    void simulateDagExecution(runId).catch((e) => {
      logger.error("run_execution_fallback_failed", { runId, error: e instanceof Error ? e.message : String(e) });
    });
    return;
  }
  await queue.add("execute-run", { runId }, { jobId: runId, attempts: 3, backoff: { type: "exponential", delay: 500 } });
}

export function startRunWorker() {
  if (!queueOn() || w) return;
  w = new Worker<RunJobPayload>(
    "workflow-runs",
    async (job: Job<RunJobPayload>) => {
      await simulateDagExecution(job.data.runId);
    },
    connection() as any
  );
  w.on("failed", (job, err) => {
    logger.error("run_worker_job_failed", {
      jobId: job?.id,
      runId: job?.data?.runId,
      error: err.message,
    });
  });
}

