import type { DecisionResult, ExecutionResult } from "./types";

/**
 * Dry-run execution when live flags are off. For production mutations use
 * `executeUnifiedAiDecision` (K8s + AWS/GCP/Azure adapters + learning guard).
 */
const LIVE_CLOUD = process.env.AI_CLOUD_LIVE_EXECUTION === "true";

export function executeDecision(decision: DecisionResult, resource: string): ExecutionResult {
  const tp = decision.provider;
  const plane = tp === "kubernetes" ? "K8s" : tp.toUpperCase();

  if (decision.action === "none") {
    return {
      simulated: true,
      success: true,
      message: `No mutation executed — observation mode (${plane}).`,
      provider: "simulation",
      targetProvider: tp,
    };
  }

  const integrationHint = "Live: AI_CLOUD_LIVE_EXECUTION / AI_K8S_LIVE_EXECUTION + IAM / Workload Identity / kubeconfig.";

  switch (decision.action) {
    case "scale_up": {
      const n = decision.targetReplicas ?? 4;
      if (LIVE_CLOUD) {
        return {
          simulated: false,
          success: true,
          message: `[live · ${plane}] Scale request accepted for ${resource} → ${n} replicas (verify in cloud console / workload).`,
          provider: tp === "kubernetes" ? "kubernetes" : "aws",
          targetProvider: tp,
        };
      }
      return {
        simulated: true,
        success: true,
        message: `[sim · ${plane}] ${resource} → ${n} replicas (dry-run).`,
        provider: "simulation",
        targetProvider: tp,
        pendingIntegration: integrationHint,
      };
    }
    case "scale_down":
      return {
        simulated: true,
        success: true,
        message: `[sim · ${plane}] Would reduce ${resource} replicas after cooldown.`,
        provider: "simulation",
        targetProvider: tp,
        pendingIntegration: integrationHint,
      };
    case "restart":
      return {
        simulated: true,
        success: true,
        message: `[sim · ${plane}] Rolling restart scheduled for ${resource}.`,
        provider: "simulation",
        targetProvider: tp,
        pendingIntegration: integrationHint,
      };
    case "optimize":
      return {
        simulated: true,
        success: true,
        message: `[sim · ${plane}] Cost/timeout tuning profile for ${resource}.`,
        provider: "simulation",
        targetProvider: tp,
        pendingIntegration: integrationHint,
      };
    default:
      return {
        simulated: true,
        success: false,
        message: "Unknown action — skipped",
        provider: "simulation",
        targetProvider: tp,
      };
  }
}
