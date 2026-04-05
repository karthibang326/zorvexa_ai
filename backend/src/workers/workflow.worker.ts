import { Job } from "bullmq";
import { startExecutionWorker } from "../services/execution.queue";
import { logger } from "../utils/logger";

export function bootstrapWorkflowWorker() {
  startExecutionWorker(async (job: Job<{ workflowId: string }>) => {
    const { workflowId } = job.data;
    // Placeholder for DAG execution engine integration.
    logger.info("workflow_execution_job_received", { workflowId, jobId: job.id });
  });
}

