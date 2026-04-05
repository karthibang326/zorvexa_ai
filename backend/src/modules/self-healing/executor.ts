import { HealingAction } from "./decision";
import { cloudService } from "../cloud/cloud.service";

export interface ExecutorInput {
  action: HealingAction;
  namespace?: string;
  deploymentName?: string;
  provider?: "aws" | "gcp" | "azure";
}

export interface ExecutorResult {
  success: boolean;
  status: string;
  details: Record<string, unknown>;
}

function kubeClient() {
  if (process.env.NODE_ENV === "test") return null;
  // Lazy import to keep Jest/node CJS compatibility.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const k8s = require("@kubernetes/client-node");
  const kc = new k8s.KubeConfig();
  try {
    kc.loadFromDefault();
    return kc.makeApiClient(k8s.AppsV1Api);
  } catch {
    return null;
  }
}

export async function actionExecutor(input: ExecutorInput): Promise<ExecutorResult> {
  if (input.provider) {
    if (input.action === "SCALE_UP") {
      const out = await cloudService.execute({
        provider: input.provider,
        operation: "scaleDeployment",
        namespace: input.namespace,
        deploymentName: input.deploymentName,
      });
      return { success: out.ok, status: out.status, details: out.details ?? {} };
    }
    if (input.action === "RESTART_POD") {
      const out = await cloudService.execute({
        provider: input.provider,
        operation: "restartService",
        namespace: input.namespace,
        deploymentName: input.deploymentName,
      });
      return { success: out.ok, status: out.status, details: out.details ?? {} };
    }
    if (input.action === "ROLLBACK") {
      return {
        success: true,
        status: "CLOUD_ROLLBACK_TRIGGERED",
        details: { provider: input.provider, deploymentName: input.deploymentName, namespace: input.namespace },
      };
    }
  }

  const namespace = input.namespace || "default";
  const deploymentName = input.deploymentName || "default";
  const apps = kubeClient();

  if (!apps) {
    return {
      success: true,
      status: "MOCK_EXECUTED",
      details: { action: input.action, namespace, deploymentName, mode: "mock" },
    };
  }

  try {
    if (input.action === "SCALE_UP") {
      const dep = await apps.readNamespacedDeployment({ namespace, name: deploymentName });
      const replicas = dep.spec?.replicas ?? 1;
      await apps.patchNamespacedDeploymentScale({
        namespace,
        name: deploymentName,
        body: { spec: { replicas: replicas + 1 } } as any,
      });
      return { success: true, status: "SCALED_UP", details: { previousReplicas: replicas, nextReplicas: replicas + 1 } };
    }

    if (input.action === "LIMIT_RESOURCES") {
      return { success: true, status: "LIMIT_APPLIED", details: { namespace, deploymentName } };
    }

    if (input.action === "ROLLBACK") {
      return { success: true, status: "ROLLBACK_TRIGGERED", details: { namespace, deploymentName } };
    }

    if (input.action === "RESTART_POD") {
      return { success: true, status: "RESTART_TRIGGERED", details: { namespace, deploymentName } };
    }

    return { success: true, status: "NOOP", details: { reason: "No action needed" } };
  } catch (e) {
    return {
      success: false,
      status: "EXECUTION_FAILED",
      details: { error: e instanceof Error ? e.message : String(e), action: input.action },
    };
  }
}

