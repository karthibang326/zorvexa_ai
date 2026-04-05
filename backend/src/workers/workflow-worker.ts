import { Job } from "bullmq";
import { registerWorkflowRuntimeWorker } from "../lib/queue";
import { runWorkflowRuntime } from "../core/workflow/runtime/engine";
import type { RuntimeContext, RuntimeMode } from "../core/workflow/runtime/types";

type WorkflowRuntimeJob = {
  runId: string;
  workflowId: string;
  mode: RuntimeMode;
  context: RuntimeContext;
};

export function startWorkflowWorker() {
  registerWorkflowRuntimeWorker(async (job: Job<WorkflowRuntimeJob>) => {
    await runWorkflowRuntime(job.data);
  });
}
