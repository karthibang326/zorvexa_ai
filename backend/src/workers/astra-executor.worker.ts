import { Job } from "bullmq";
import { env } from "../config/env";
import { getEffectiveAutonomyPolicies, isSimulationEffective, shouldAwaitApproval } from "../core/astra-ops/autonomy";
import type { RiskLevel } from "../core/astra-ops/ai/engine";
import { feedbackLoop } from "../core/astra-ops/feedback/loop";
import { learnFromVerification } from "../core/astra-ops/feedback/learn";
import { verifyOutcome } from "../core/astra-ops/feedback/verify";
import { executeAstraAction } from "../core/astra-ops/executor/runner";
import { assertExecutorSafety, SafetyBlockedError } from "../core/astra-ops/executor/safety";
import { registerAstraExecutorWorker } from "../lib/queue";
import {
  updateDecisionExecuted,
  updateDecisionFeedback,
  updateDecisionStatus,
} from "../modules/astra-ops/astra-ops.repository";
import { auditExecutorOutcome } from "../modules/astra-ops/astra-ops-executor-audit";
import { logInfo, logWarn } from "../lib/logger";

export type AstraExecutorJob = {
  decisionId: string;
  workloadId: string;
  action: string;
  reason: string;
  confidence: number;
  risk?: RiskLevel;
  expectedImpact?: string;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  /** Set by API after human approval */
  approved?: boolean;
  /** Carried from ingest / DB resolution for audit org scoping */
  orgId?: string;
  projectId?: string;
  envId?: string;
};

export function startAstraExecutorWorker() {
  registerAstraExecutorWorker(async (job: Job<AstraExecutorJob>) => {
    const {
      decisionId,
      action,
      confidence,
      reason,
      approved,
      orgId,
      projectId,
      envId,
    } = job.data;
    const risk: RiskLevel = job.data.risk ?? "medium";
    const policies = getEffectiveAutonomyPolicies();
    const scope =
      orgId != null && orgId !== ""
        ? { orgId, projectId: projectId ?? undefined, envId: envId ?? undefined }
        : undefined;

    try {
      assertExecutorSafety(confidence, env.ASTRA_MIN_EXECUTOR_CONFIDENCE);
    } catch (e) {
      if (e instanceof SafetyBlockedError) {
        logWarn("astra_executor_safety_block", { decisionId, message: e.message });
        await updateDecisionStatus(decisionId, "blocked");
        const { improvedConfidence } = feedbackLoop(
          { action, reason, confidence },
          { success: false }
        );
        await updateDecisionFeedback(decisionId, { success: false, improvedConfidence });
        await auditExecutorOutcome({
          workloadId: job.data.workloadId,
          decisionId,
          event: "executor_safety_blocked",
          scope,
          detail: {
            action,
            reason,
            confidence,
            risk,
            message: e.message,
            minConfidence: env.ASTRA_MIN_EXECUTOR_CONFIDENCE,
            autonomyMode: policies.mode,
          },
        });
        return;
      }
      throw e;
    }

    if (shouldAwaitApproval(action, risk, approved, policies)) {
      logInfo("astra_executor_awaiting_approval", { decisionId, action, reason, risk });
      await updateDecisionStatus(decisionId, "awaiting_approval");
      await auditExecutorOutcome({
        workloadId: job.data.workloadId,
        decisionId,
        event: "executor_awaiting_approval",
        scope,
        detail: {
          action,
          reason,
          confidence,
          risk,
          expectedImpact: job.data.expectedImpact,
          autonomyMode: policies.mode,
        },
      });
      return;
    }

    if (isSimulationEffective(policies)) {
      logInfo("astra_executor_simulation", { decisionId, action, reason });
      await updateDecisionExecuted(decisionId);
      const { improvedConfidence } = feedbackLoop(
        { action, reason, confidence },
        { success: true }
      );
      await updateDecisionFeedback(decisionId, { success: true, improvedConfidence });
      await auditExecutorOutcome({
        workloadId: job.data.workloadId,
        decisionId,
        event: "executor_simulated",
        scope,
        detail: {
          action,
          reason,
          confidence,
          risk,
          autonomyMode: policies.mode,
          improvedConfidence,
        },
      });
      return;
    }

    const result = await executeAstraAction(action, { action });

    logInfo("astra_executor_run", {
      decisionId,
      action,
      reason,
      success: result.success,
      details: result.details,
    });

    if (result.success) {
      await updateDecisionStatus(decisionId, "executed");
      const verification = verifyOutcome(
        {
          cpu_usage: job.data.cpu_usage ?? null,
          memory_usage: job.data.memory_usage ?? null,
        },
        { action }
      );
      const { improvedConfidence } = learnFromVerification(
        { action, reason, confidence },
        verification
      );
      await updateDecisionFeedback(decisionId, {
        success: verification.success,
        improvedConfidence,
      });
      await auditExecutorOutcome({
        workloadId: job.data.workloadId,
        decisionId,
        event: "decision_verified",
        scope,
        detail: {
          action,
          risk,
          verification,
          autonomyMode: policies.mode,
        },
      });
      await auditExecutorOutcome({
        workloadId: job.data.workloadId,
        decisionId,
        event: "decision_learned",
        scope,
        detail: { improvedConfidence, autonomyMode: policies.mode },
      });
      await updateDecisionStatus(decisionId, "learned");
    } else {
      await updateDecisionStatus(decisionId, "failed");
      const { improvedConfidence } = feedbackLoop(
        { action, reason, confidence },
        { success: false }
      );
      await updateDecisionFeedback(decisionId, { success: false, improvedConfidence });
    }

    await auditExecutorOutcome({
      workloadId: job.data.workloadId,
      decisionId,
      event: result.success ? "executor_succeeded" : "executor_failed",
      scope,
      detail: {
        action,
        reason,
        confidence,
        risk,
        success: result.success,
        infra: result.details,
        autonomyMode: policies.mode,
      },
    });
  });
}
