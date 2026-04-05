import { env } from "../../config/env";
import type { DecisionResult, ExecutionResult } from "./types";
import { executeDecision } from "./execution.engine";
import {
  readDeploymentReplicas,
  rolloutRestartDeployment,
  scaleDeploymentDownOne,
  scaleDeploymentUp,
  type K8sExecResult,
} from "../../core/astra-ops/executor/k8s";

function resolveDeploymentTarget(resource: string): { namespace: string; deployment: string } {
  const deployment =
    env.ASTRA_K8S_DEPLOYMENT.trim() ||
    resource
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "app";
  return { namespace: env.ASTRA_K8S_NAMESPACE, deployment };
}

function k8sMessage(action: string, details: Record<string, unknown>): string {
  return `${action}: ${JSON.stringify(details)}`;
}

function fromK8sResult(
  r: K8sExecResult,
  base: { namespace: string; deployment: string },
  actionLabel: string
): ExecutionResult {
  const d = r.details;
  const replicasBefore = typeof d.previousReplicas === "number" ? d.previousReplicas : undefined;
  const replicasAfter = typeof d.replicas === "number" ? d.replicas : undefined;
  if (!r.success) {
    return {
      simulated: false,
      success: false,
      message: k8sMessage(`${actionLabel} failed`, d),
      provider: "kubernetes",
      targetProvider: "kubernetes",
      k8s: {
        namespace: base.namespace,
        deployment: base.deployment,
        replicasBefore,
        replicasAfter,
      },
    };
  }
  return {
    simulated: false,
    success: true,
    message: k8sMessage(actionLabel, d),
    provider: "kubernetes",
    targetProvider: "kubernetes",
    k8s: {
      namespace: base.namespace,
      deployment: base.deployment,
      replicasBefore,
      replicasAfter,
    },
  };
}

/**
 * Simulated execution by default. When `AI_K8S_LIVE_EXECUTION=true` and `SIMULATION_MODE=false`,
 * applies guarded mutations via kubeconfig (see `backend/k8s/rbac/` for least-privilege RBAC).
 */
export async function executeDecisionWithK8s(decision: DecisionResult, resource: string): Promise<ExecutionResult> {
  const live = env.AI_K8S_LIVE_EXECUTION === "true" && env.SIMULATION_MODE !== "true";

  if (!live) {
    return executeDecision(decision, resource);
  }

  if (decision.action === "none") {
    return executeDecision(decision, resource);
  }

  if (decision.risk === "HIGH" && env.AI_K8S_REQUIRE_APPROVAL_HIGH_RISK === "true" && env.AI_K8S_HIGH_RISK_APPROVED !== "true") {
    return {
      simulated: false,
      success: false,
      message:
        "High-risk action blocked pending approval (set AI_K8S_HIGH_RISK_APPROVED=true after review, or use simulation).",
      provider: "kubernetes",
      targetProvider: "kubernetes",
      guardrailBlocked: true,
    };
  }

  const target = resolveDeploymentTarget(resource);

  if (decision.action === "restart" && env.AI_K8S_ALLOW_RESTART !== "true") {
    return {
      simulated: false,
      success: false,
      message: "Restart blocked — set AI_K8S_ALLOW_RESTART=true after change window approval.",
      provider: "kubernetes",
      targetProvider: "kubernetes",
      guardrailBlocked: true,
    };
  }

  if (decision.action === "scale_down" && env.AI_K8S_ALLOW_SCALE_DOWN !== "true") {
    return {
      simulated: false,
      success: false,
      message: "Scale-down blocked — set AI_K8S_ALLOW_SCALE_DOWN=true to allow capacity reduction.",
      provider: "kubernetes",
      targetProvider: "kubernetes",
      guardrailBlocked: true,
    };
  }

  const minReplicas = env.AI_K8S_MIN_REPLICAS;

  switch (decision.action) {
    case "scale_up": {
      let targetReplicas = decision.targetReplicas;
      if (targetReplicas === undefined && env.ASTRA_SCALE_UP_REPLICAS.trim() !== "") {
        const n = parseInt(env.ASTRA_SCALE_UP_REPLICAS, 10);
        if (!Number.isNaN(n)) targetReplicas = n;
      }
      const r = await scaleDeploymentUp({
        namespace: target.namespace,
        name: target.deployment,
        targetReplicas,
      });
      return fromK8sResult(r, target, "scale_up");
    }
    case "scale_down": {
      const r = await scaleDeploymentDownOne({
        namespace: target.namespace,
        name: target.deployment,
        minReplicas,
      });
      return fromK8sResult(r, target, "scale_down");
    }
    case "restart": {
      const before = await readDeploymentReplicas({ namespace: target.namespace, name: target.deployment });
      const r = await rolloutRestartDeployment({ namespace: target.namespace, name: target.deployment });
      const after = await readDeploymentReplicas({ namespace: target.namespace, name: target.deployment });
      const exec = fromK8sResult(r, target, "rollout_restart");
      if (exec.k8s) {
        exec.k8s.replicasBefore = before ?? exec.k8s.replicasBefore;
        exec.k8s.replicasAfter = after ?? exec.k8s.replicasAfter;
      }
      return exec;
    }
    case "optimize": {
      const targetReplicas = parseInt(env.ASTRA_OPTIMIZE_COST_TARGET_REPLICAS, 10);
      const n = Number.isNaN(targetReplicas) ? 1 : Math.max(minReplicas, targetReplicas);
      const r = await scaleDeploymentUp({
        namespace: target.namespace,
        name: target.deployment,
        targetReplicas: n,
      });
      return fromK8sResult(r, target, "optimize_scale");
    }
    default:
      return executeDecision(decision, resource);
  }
}
