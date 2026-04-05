import { env } from "../../config/env";
import { detectorService } from "./detector";
import { analyzerService } from "./analyzer";
import { decisionEngine } from "./decision";
import { actionExecutor } from "./executor";
import { verificationService } from "./verifier";
import { selfHealingRepository } from "./self-healing.repository";
import { publishSelfHealingEvent } from "./self-healing.stream";
import { SelfHealingTriggerInput } from "./self-healing.schemas";

export const selfHealingService = {
  async trigger(input: SelfHealingTriggerInput) {
    const actionCount = await selfHealingRepository.countActionsInLastHour();
    if (actionCount >= env.SELF_HEAL_MAX_ACTIONS_PER_HOUR) {
      const blocked = {
        blocked: true,
        reason: "Max actions per hour reached",
      };
      await selfHealingRepository.create({
        runId: input.runId,
        type: "ACT",
        status: "BLOCKED_RATE_LIMIT",
        details: blocked,
      });
      publishSelfHealingEvent({ type: "action_taken", status: "BLOCKED_RATE_LIMIT", details: blocked });
      return blocked;
    }

    const detection = await detectorService({
      runId: input.runId,
      workflowId: input.workflowId,
      metrics: input.metrics,
    });
    await selfHealingRepository.create({
      runId: input.runId,
      type: "DETECT",
      status: detection.detected ? "ANOMALY_DETECTED" : "NO_ISSUE",
      details: detection as any,
    });
    if (!detection.detected) return { detected: false };
    publishSelfHealingEvent({ type: "anomaly_detected", runId: input.runId, details: detection });

    const analysis = await analyzerService({
      runId: input.runId,
      workflowId: input.workflowId,
      metrics: input.metrics ?? {},
      reasons: detection.reasons,
      severity: detection.severity,
    });
    await selfHealingRepository.create({
      runId: input.runId,
      type: "ANALYZE",
      status: "ANALYZED",
      details: analysis as any,
    });

    const decision = decisionEngine({
      metrics: input.metrics ?? {},
      reasons: detection.reasons,
      aiSuggestedActions: analysis.suggestedActions,
    });
    await selfHealingRepository.create({
      runId: input.runId,
      type: "DECIDE",
      status: "DECIDED",
      details: decision as any,
    });

    if (env.SELF_HEAL_APPROVAL_MODE === "manual") {
      await selfHealingRepository.create({
        runId: input.runId,
        type: "ACT",
        status: "PENDING_MANUAL_APPROVAL",
        details: decision as any,
      });
      publishSelfHealingEvent({
        type: "action_taken",
        runId: input.runId,
        status: "PENDING_MANUAL_APPROVAL",
        details: decision,
      });
      return { detection, analysis, decision, acted: false };
    }

    let execution = await actionExecutor({
      action: decision.action,
      namespace: input.namespace,
      deploymentName: input.deploymentName,
      provider: input.provider,
    });
    await selfHealingRepository.create({
      runId: input.runId,
      type: "ACT",
      status: execution.status,
      details: execution as any,
    });
    publishSelfHealingEvent({
      type: "action_taken",
      runId: input.runId,
      status: execution.status,
      details: execution,
    });

    if (!execution.success && decision.action !== "ROLLBACK") {
      const rollback = await actionExecutor({
        action: "ROLLBACK",
        namespace: input.namespace,
        deploymentName: input.deploymentName,
        provider: input.provider,
      });
      await selfHealingRepository.create({
        runId: input.runId,
        type: "ACT",
        status: `ROLLBACK_${rollback.status}`,
        details: rollback as any,
      });
      execution = rollback;
    }

    const verification = await verificationService({
      beforeMetrics: input.metrics ?? {},
      afterMetrics: input.metrics ?? {},
    });
    await selfHealingRepository.create({
      runId: input.runId,
      type: "VERIFY",
      status: verification.status,
      details: verification as any,
    });
    publishSelfHealingEvent({
      type: verification.resolved ? "resolved" : "unresolved",
      runId: input.runId,
      details: verification,
    });

    return { detection, analysis, decision, execution, verification };
  },

  async listEvents(limit = 100) {
    return selfHealingRepository.list(limit);
  },
};

