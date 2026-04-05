import { Job } from "bullmq";
import { registerRunWorker } from "../lib/queue";
import { runRepository } from "../modules/run/run.repository";
import { prisma } from "../lib/prisma";
import { topologicalLayers } from "../modules/execution/topological-sort";
import { executeNode } from "../modules/execution/node.executors";
import { publishRunEvent } from "../modules/run/run.stream";
import { logError, logInfo } from "../lib/logger";
import { env } from "../config/env";
import { incRunFailed, incRunSucceeded } from "../lib/metrics";
import { aiCopilotService } from "../modules/ai-copilot/ai.service";
import { selfHealingService } from "../modules/self-healing/self-healing.service";

export function startRunWorker() {
  registerRunWorker(async (job: Job<{ runId: string }>) => {
    const runId = job.data.runId;
    const run = await runRepository.get(runId);
    if (!run) throw new Error("Run not found");

    const version = await prisma.workflowVersion.findFirst({
      where: { workflowId: run.workflowId, version: run.workflowVersion },
      orderBy: { createdAt: "desc" },
    });
    if (!version) throw new Error("Workflow version not found");

    const nodes = (version.nodes as any[]) ?? [];
    const edges = (version.edges as any[]) ?? [];
    const layers = topologicalLayers(nodes, edges);
    publishRunEvent(runId, { type: "run.started", runId });

    try {
      for (const layer of layers) {
        await Promise.all(
          layer.map(async (nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;
            const startedAt = new Date();
            await runRepository.createStepLog({
              runId,
              stepId: node.id,
              stepName: node.label,
              stepType: node.type,
              status: "RUNNING",
              message: "step started",
              attempt: run.attempt,
              startedAt,
            });
            publishRunEvent(runId, { type: "step.started", runId, stepId: node.id, stepName: node.label });
            publishRunEvent(runId, { type: "step_started", runId, stepId: node.id, stepName: node.label });
            try {
              const out = await executeNode(node);
              await runRepository.createStepLog({
                runId,
                stepId: node.id,
                stepName: node.label,
                stepType: node.type,
                status: "SUCCESS",
                message: out.message,
                attempt: run.attempt,
                startedAt,
                endedAt: new Date(),
              });
              publishRunEvent(runId, { type: "step.completed", runId, stepId: node.id, message: out.message });
              publishRunEvent(runId, { type: "step_completed", runId, stepId: node.id, message: out.message });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "step failed";
              await runRepository.createStepLog({
                runId,
                stepId: node.id,
                stepName: node.label,
                stepType: node.type,
                status: "FAILED",
                message: msg,
                attempt: run.attempt,
                startedAt,
                endedAt: new Date(),
              });
              publishRunEvent(runId, { type: "step.failed", runId, stepId: node.id, message: msg });
              publishRunEvent(runId, { type: "step_failed", runId, stepId: node.id, message: msg });
              throw e;
            }
          })
        );
      }

      await runRepository.updateStatus(runId, { status: "SUCCESS", finishedAt: new Date() });
      incRunSucceeded();
      publishRunEvent(runId, { type: "run.completed", runId, status: "SUCCESS" });
      logInfo("run_completed", { runId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "run failed";
      const nextAttempt = (run.attempt ?? 1) + 1;
      const hasRetry = nextAttempt <= env.RUN_MAX_ATTEMPTS;
      await runRepository.updateStatus(runId, {
        status: hasRetry ? "RUNNING" : "FAILED",
        errorMessage: message,
        attempt: nextAttempt,
        finishedAt: hasRetry ? null : new Date(),
      });
      publishRunEvent(runId, { type: "run.failed", runId, message, willRetry: hasRetry });
      publishRunEvent(runId, { type: "run_failed", runId, message, willRetry: hasRetry });
      if (!hasRetry) incRunFailed();
      logError("run_failed", { runId, message, willRetry: hasRetry });

      // Attach AI anomaly suggestion to run logs (best-effort).
      try {
        const insight = await aiCopilotService.detectAnomaly({
          runId,
          workflowId: run.workflowId,
          metrics: { error: message, attempt: nextAttempt, willRetry: hasRetry },
        });
        await runRepository.createStepLog({
          runId,
          stepId: "ai_insight",
          stepName: "AI Copilot",
          stepType: "AI",
          status: "SUCCESS",
          message: `Suggestion: ${insight.suggestion} (reason: ${insight.reason})`,
          attempt: nextAttempt,
          startedAt: new Date(),
          endedAt: new Date(),
        });
        publishRunEvent(runId, { type: "ai.suggestion", runId, result: insight });
      } catch {
        // ignore
      }

      // Closed-loop autonomous remediation on run failure.
      void selfHealingService.trigger({
        source: "RUN_FAILURE",
        runId,
        workflowId: run.workflowId,
        metrics: {
          cpu: message.toLowerCase().includes("cpu") ? 95 : 0,
          memory: message.toLowerCase().includes("memory") ? 92 : 0,
          cost: message.toLowerCase().includes("cost") ? 120 : 0,
        },
      });

      throw e;
    }
  });
}

