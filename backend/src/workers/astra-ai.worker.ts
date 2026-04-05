import { Job } from "bullmq";
import { aiDecisionEngine } from "../core/astra-ops/ai/engine";
import { registerAstraAiWorker, getAstraExecutorQueue } from "../lib/queue";
import { insertAiDecision } from "../modules/astra-ops/astra-ops.repository";
import type { AstraAnalyzeJobPayload } from "../modules/astra-ops/astra-ops.types";
import { logInfo } from "../lib/logger";

export function startAstraAiWorker() {
  registerAstraAiWorker(async (job: Job<AstraAnalyzeJobPayload>) => {
    const w = job.data.workload;
    const scope = job.data.scope;
    const decision = aiDecisionEngine({
      cpu_usage: w.cpu_usage,
      memory_usage: w.memory_usage,
      cost: w.cost,
    });

    const row = await insertAiDecision({
      workloadId: w.id,
      action: decision.action,
      reason: decision.reason,
      confidence: decision.confidence,
    });

    await getAstraExecutorQueue().add(
      "execute",
      {
        decisionId: row.id,
        workloadId: w.id,
        action: decision.action,
        reason: decision.reason,
        confidence: decision.confidence,
        risk: decision.risk,
        expectedImpact: decision.expectedImpact,
        cpu_usage: w.cpu_usage,
        memory_usage: w.memory_usage,
        approved: false,
        orgId: scope.orgId,
        projectId: scope.projectId,
        envId: scope.envId,
      },
      {
        jobId: `astra-exec-${row.id}`,
        removeOnComplete: { age: 3600, count: 2000 },
      }
    );

    logInfo("astra_ai_decision", { workloadId: w.id, action: decision.action });
  });
}
