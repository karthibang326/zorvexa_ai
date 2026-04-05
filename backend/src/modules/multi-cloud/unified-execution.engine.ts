import { env } from "../../config/env";
import type { CloudProvider } from "../cloud/cloud.types";
import { cloudService } from "../cloud/cloud.service";
import type { DecisionResult, ExecutionResult } from "../ai-decision-engine/types";
import { executeDecision } from "../ai-decision-engine/execution.engine";
import { executeDecisionWithK8s } from "../ai-decision-engine/k8s-ai-execution.service";
import { shouldBlockForLowLearningSuccess } from "../ai-learning/learning-guard";

function asCloudProvider(p: DecisionResult["provider"]): CloudProvider | null {
  if (p === "aws" || p === "gcp" || p === "azure") return p;
  return null;
}

function deploymentNameForCloud(resource: string): string {
  return env.ASTRA_K8S_DEPLOYMENT.trim() || resource;
}

/**
 * Single entry for AI loop: routes to Kubernetes executor or cloud adapters (AWS/GCP/Azure).
 */
export async function executeUnifiedAiDecision(decision: DecisionResult, resource: string): Promise<ExecutionResult> {
  if (decision.action === "none") {
    return executeDecision(decision, resource);
  }

  const learnBlock = await shouldBlockForLowLearningSuccess(decision, resource);
  if (learnBlock.blocked) {
    return {
      simulated: false,
      success: false,
      message: learnBlock.reason ?? "Learning guard: approval required.",
      provider: "simulation",
      targetProvider: decision.provider,
      guardrailBlocked: true,
    };
  }

  if (decision.provider === "kubernetes") {
    return executeDecisionWithK8s(decision, resource);
  }

  const cloud = asCloudProvider(decision.provider);
  if (!cloud) {
    return executeDecision(decision, resource);
  }

  const live = env.AI_CLOUD_LIVE_EXECUTION === "true" && env.SIMULATION_MODE !== "true";
  if (!live) {
    return executeDecision(decision, resource);
  }

  if (decision.risk === "HIGH" && env.AI_K8S_REQUIRE_APPROVAL_HIGH_RISK === "true" && env.AI_K8S_HIGH_RISK_APPROVED !== "true") {
    return {
      simulated: false,
      success: false,
      message: "High-risk cloud action blocked pending approval (set AI_K8S_HIGH_RISK_APPROVED=true after review).",
      provider: cloud,
      targetProvider: decision.provider,
      guardrailBlocked: true,
    };
  }

  if (decision.action === "restart" && env.AI_CLOUD_ALLOW_RESTART !== "true") {
    return {
      simulated: false,
      success: false,
      message: "Cloud restart blocked — set AI_CLOUD_ALLOW_RESTART=true after change approval.",
      provider: cloud,
      targetProvider: decision.provider,
      guardrailBlocked: true,
    };
  }

  if (decision.action === "scale_down" && env.AI_CLOUD_ALLOW_SCALE_DOWN !== "true") {
    return {
      simulated: false,
      success: false,
      message: "Cloud scale-down blocked — set AI_CLOUD_ALLOW_SCALE_DOWN=true.",
      provider: cloud,
      targetProvider: decision.provider,
      guardrailBlocked: true,
    };
  }

  const ns = env.ASTRA_K8S_NAMESPACE;
  const name = deploymentNameForCloud(resource);
  const replicas = decision.targetReplicas ?? 3;

  try {
    if (decision.action === "scale_up") {
      const r = await cloudService.execute({
        provider: cloud,
        operation: "scaleDeployment",
        namespace: ns,
        deploymentName: name,
        replicas,
        region: cloud === "aws" ? env.AWS_REGION : undefined,
      });
      return {
        simulated: false,
        success: r.ok,
        message: `${r.status}: ${JSON.stringify(r.details ?? {})}`,
        provider: cloud,
        targetProvider: decision.provider,
      };
    }
    if (decision.action === "scale_down") {
      const r = await cloudService.execute({
        provider: cloud,
        operation: "scaleDeployment",
        namespace: ns,
        deploymentName: name,
        replicas: Math.max(env.AI_K8S_MIN_REPLICAS, 1),
        region: cloud === "aws" ? env.AWS_REGION : undefined,
      });
      return {
        simulated: false,
        success: r.ok,
        message: `${r.status}: ${JSON.stringify(r.details ?? {})}`,
        provider: cloud,
        targetProvider: decision.provider,
      };
    }
    if (decision.action === "restart") {
      const r = await cloudService.execute({
        provider: cloud,
        operation: "restartService",
        namespace: ns,
        serviceName: name,
        deploymentName: name,
        region: cloud === "aws" ? env.AWS_REGION : undefined,
      });
      return {
        simulated: false,
        success: r.ok,
        message: `${r.status}: ${JSON.stringify(r.details ?? {})}`,
        provider: cloud,
        targetProvider: decision.provider,
      };
    }
    if (decision.action === "optimize") {
      const target = parseInt(env.ASTRA_OPTIMIZE_COST_TARGET_REPLICAS, 10);
      const n = Number.isNaN(target) ? 1 : Math.max(env.AI_K8S_MIN_REPLICAS, target);
      const r = await cloudService.execute({
        provider: cloud,
        operation: "scaleDeployment",
        namespace: ns,
        deploymentName: name,
        replicas: n,
        region: cloud === "aws" ? env.AWS_REGION : undefined,
      });
      return {
        simulated: false,
        success: r.ok,
        message: `${r.status} (optimize): ${JSON.stringify(r.details ?? {})}`,
        provider: cloud,
        targetProvider: decision.provider,
      };
    }
  } catch (e) {
    return {
      simulated: false,
      success: false,
      message: e instanceof Error ? e.message : String(e),
      provider: cloud,
      targetProvider: decision.provider,
    };
  }

  return executeDecision(decision, resource);
}
