import { env } from "../../config/env";
import type { DecisionResult } from "../ai-decision-engine/types";
import { cloudService } from "../cloud/cloud.service";
import { executeUnifiedAiDecision } from "../multi-cloud/unified-execution.engine";

/** Simulated execution when SIMULATION_MODE=true or action has no live adapter mapping. */
export function simulateOrchestrationAction(action: string, resource: string): Record<string, unknown> {
  if (action === "restart_service") {
    return {
      simulated: true,
      operation: "restartService",
      resource,
      status: "SIMULATED_SUCCESS",
      details: "Service restart plan simulated successfully",
    };
  }
  if (action === "rollback_deployment") {
    return {
      simulated: true,
      operation: "rollbackDeployment",
      resource,
      status: "SIMULATED_SUCCESS",
      details: "Rollback to previous stable version simulated successfully",
    };
  }
  return {
    simulated: true,
    operation: "observeOnly",
    resource,
    status: "SIMULATED_NOOP",
    details: "No execution required",
  };
}

function baseDecision(action: DecisionResult["action"], provider: DecisionResult["provider"]): DecisionResult {
  return {
    action,
    confidence: 0.88,
    risk: action === "restart" || action === "scale_down" ? "MEDIUM" : "LOW",
    reason: "ai_ops_learning_execute",
    detail: "",
    provider,
    targetReplicas: action === "scale_up" ? 4 : undefined,
  };
}

/**
 * Applies restart / rollback-style remediation through the same path as the AI decision engine:
 * Kubernetes via `executeUnifiedAiDecision`, or cloud adapters for AWS/GCP/Azure.
 */
export async function executeOrchestratedInfraAction(input: {
  action: string;
  resource: string;
  provider?: "aws" | "gcp" | "azure" | "kubernetes";
  namespace?: string;
}): Promise<Record<string, unknown>> {
  const { action, resource } = input;
  if (env.SIMULATION_MODE === "true") {
    return simulateOrchestrationAction(action, resource);
  }

  const p = input.provider ?? "aws";

  if (action === "restart_service" || action === "rollback_deployment") {
    const note =
      action === "rollback_deployment"
        ? "Native image rollback is not in cloud adapters; performed rolling restart as safest automated step."
        : undefined;

    if (p === "kubernetes") {
      const decision = baseDecision("restart", "kubernetes");
      const ex = await executeUnifiedAiDecision(decision, resource);
      return {
        simulated: ex.simulated,
        operation: action === "rollback_deployment" ? "rollbackViaK8sRestart" : "restart",
        resource,
        status: ex.success ? "SUCCESS" : "FAILED",
        message: ex.message,
        guardrailBlocked: ex.guardrailBlocked,
        unifiedExecution: ex,
        note,
      };
    }

    const cloud = p as "aws" | "gcp" | "azure";
    try {
      const r = await cloudService.execute({
        provider: cloud,
        operation: "restartService",
        namespace: input.namespace ?? env.ASTRA_K8S_NAMESPACE,
        deploymentName: resource,
        serviceName: resource,
        region: cloud === "aws" && env.AWS_REGION ? env.AWS_REGION : undefined,
      });
      return {
        simulated: false,
        operation: action === "rollback_deployment" ? "rollbackViaRollingRestart" : "restartService",
        resource,
        status: r.ok ? "SUCCESS" : "FAILED",
        cloudResult: r,
        note,
      };
    } catch (e) {
      return {
        simulated: false,
        operation: action,
        resource,
        status: "FAILED",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return simulateOrchestrationAction(action, resource);
}
