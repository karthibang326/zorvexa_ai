import { env } from "../../../config/env";
import { startEc2Instance } from "./aws";
import { rolloutRestartDeployment, scaleDeploymentDown, scaleDeploymentUp } from "./k8s";

export type AstraRunnerContext = {
  action: string;
};

function parseOptionalInt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Maps AI actions to real AWS / Kubernetes operations.
 * Configure via ASTRA_K8S_* and ASTRA_EC2_* env vars.
 */
export async function executeAstraAction(
  action: string,
  _ctx: AstraRunnerContext
): Promise<{ success: boolean; details: Record<string, unknown> }> {
  const ns = env.ASTRA_K8S_NAMESPACE || "default";
  const dep = env.ASTRA_K8S_DEPLOYMENT.trim();

  switch (action) {
    case "none":
      return { success: true, details: { noop: true } };

    case "scale_up": {
      if (!dep) {
        return {
          success: false,
          details: { error: "Set ASTRA_K8S_DEPLOYMENT for scale_up (e.g. payments-api)" },
        };
      }
      const target = parseOptionalInt(env.ASTRA_SCALE_UP_REPLICAS);
      return scaleDeploymentUp({ namespace: ns, name: dep, targetReplicas: target });
    }

    case "restart": {
      if (!dep) {
        return {
          success: false,
          details: { error: "Set ASTRA_K8S_DEPLOYMENT for restart" },
        };
      }
      return rolloutRestartDeployment({ namespace: ns, name: dep });
    }

    case "optimize_cost": {
      if (!dep) {
        return {
          success: false,
          details: { error: "Set ASTRA_K8S_DEPLOYMENT for optimize_cost" },
        };
      }
      const minReplicas = parseOptionalInt(env.ASTRA_OPTIMIZE_COST_TARGET_REPLICAS) ?? 1;
      return scaleDeploymentDown({ namespace: ns, name: dep, minReplicas });
    }

    case "start_ec2": {
      const id = env.ASTRA_EC2_INSTANCE_ID.trim();
      if (!id) {
        return {
          success: false,
          details: { error: "Set ASTRA_EC2_INSTANCE_ID for start_ec2" },
        };
      }
      try {
        await startEc2Instance(id);
        return { success: true, details: { instanceId: id, provider: "ec2" } };
      } catch (e) {
        return {
          success: false,
          details: { error: e instanceof Error ? e.message : String(e) },
        };
      }
    }

    default:
      return { success: true, details: { note: "unknown_action_noop", action } };
  }
}
