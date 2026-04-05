import { env } from "../../../config/env";
import type { CloudActionResult, CloudOperationParams, CloudProvider } from "../cloud.types";

/** Dynamic import keeps Jest from loading ESM `@kubernetes/client-node` unless live path runs. */
async function k8sExecutor() {
  return import("../../../core/astra-ops/executor/k8s");
}

function resolveTarget(params: CloudOperationParams): { namespace: string; deployment: string } | null {
  const namespace = (params.namespace ?? env.ASTRA_K8S_NAMESPACE).trim();
  const deployment = (
    params.deploymentName ??
    params.serviceName ??
    env.ASTRA_K8S_DEPLOYMENT
  )
    .trim()
    .replace(/^.*\//, "");
  if (!namespace || !deployment) return null;
  return { namespace, deployment };
}

function liveK8sEnabled(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return env.CLOUD_ADAPTER_LIVE_K8S === "true" && env.SIMULATION_MODE !== "true";
}

/**
 * Applies scale via the shared kubeconfig (EKS/GKE/AKS API server). Returns null to use synthetic adapter output.
 */
export async function runK8sBackedScale(
  provider: CloudProvider,
  params: CloudOperationParams
): Promise<CloudActionResult | null> {
  if (!liveK8sEnabled()) return null;
  const t = resolveTarget(params);
  if (!t) return null;
  const replicas = Math.max(1, Math.min(5000, params.replicas ?? 2));
  const { scaleDeployment } = await k8sExecutor();
  const r = await scaleDeployment({
    namespace: t.namespace,
    name: t.deployment,
    replicas,
  });
  return {
    ok: r.success,
    status: r.success ? `${provider.toUpperCase()}_K8S_SCALE_LIVE` : "K8S_SCALE_FAILED",
    provider,
    details: { ...r.details, live: true, providerLabel: provider },
  };
}

/** Rolling restart via pod template annotation (kubectl rollout restart semantics). */
export async function runK8sBackedRestart(
  provider: CloudProvider,
  params: CloudOperationParams
): Promise<CloudActionResult | null> {
  if (!liveK8sEnabled()) return null;
  const t = resolveTarget(params);
  if (!t) return null;
  const { rolloutRestartDeployment } = await k8sExecutor();
  const r = await rolloutRestartDeployment({ namespace: t.namespace, name: t.deployment });
  return {
    ok: r.success,
    status: r.success ? `${provider.toUpperCase()}_K8S_RESTART_LIVE` : "K8S_RESTART_FAILED",
    provider,
    details: { ...r.details, live: true, providerLabel: provider },
  };
}
