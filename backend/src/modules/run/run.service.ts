import { env } from "../../config/env";
import { getRunQueue } from "../../lib/queue";
import { logInfo } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { runRepository } from "./run.repository";
import { incRunTriggered } from "../../lib/metrics";

export const runService = {
  async trigger(input: { workflowId: string; version?: number; idempotencyKey: string }) {
    try {
      const existing = await runRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;

      const wf = await prisma.workflow.findUnique({ where: { id: input.workflowId } });
      if (!wf) throw new Error("Workflow not found");

      const run = await runRepository.create({
        workflowId: input.workflowId,
        workflowVersion: input.version ?? wf.version,
        idempotencyKey: input.idempotencyKey,
        status: "RUNNING",
      });

      await getRunQueue().add(
        "run.execute",
        { runId: run.id },
        {
          jobId: run.id,
          attempts: env.RUN_MAX_ATTEMPTS,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        }
      );
      incRunTriggered();

      logInfo("run_triggered", { runId: run.id, workflowId: run.workflowId, version: run.workflowVersion });
      return run;
    } catch (e) {
      logInfo("run_trigger_failed", {
        workflowId: input.workflowId,
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  async retry(runId: string) {
    const existing = await runRepository.get(runId);
    if (!existing) throw new Error("Run not found");
    const retry = await runRepository.create({
      workflowId: existing.workflowId,
      workflowVersion: existing.workflowVersion,
      idempotencyKey: `retry:${runId}:${Date.now()}`,
      status: "RUNNING",
      attempt: (existing.attempt ?? 1) + 1,
    });
    await getRunQueue().add("run.execute", { runId: retry.id }, { jobId: retry.id, attempts: env.RUN_MAX_ATTEMPTS });
    return retry;
  },

  async list() {
    return runRepository.list();
  },

  async get(runId: string) {
    const run = await runRepository.get(runId);
    if (!run) throw new Error("Run not found");
    return run;
  },
};

