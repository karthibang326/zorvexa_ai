import * as k8s from "@kubernetes/client-node";

export type K8sExecResult = { success: boolean; details: Record<string, unknown> };

function appsApi(): k8s.AppsV1Api | null {
  if (process.env.NODE_ENV === "test") return null;
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (!kc.getCurrentCluster()) return null;
    return kc.makeApiClient(k8s.AppsV1Api);
  } catch {
    return null;
  }
}

export async function scaleDeployment(params: {
  namespace: string;
  name: string;
  replicas: number;
}): Promise<K8sExecResult> {
  const apps = appsApi();
  if (!apps) {
    return { success: false, details: { error: "Kubernetes not configured (no kubeconfig or cluster)" } };
  }
  try {
    await apps.patchNamespacedDeploymentScale({
      namespace: params.namespace,
      name: params.name,
      body: { spec: { replicas: params.replicas } } as any,
    });
    return {
      success: true,
      details: { namespace: params.namespace, deployment: params.name, replicas: params.replicas },
    };
  } catch (e) {
    return {
      success: false,
      details: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

/** scale_up: use explicit target replicas, or current + 1 */
export async function scaleDeploymentUp(params: {
  namespace: string;
  name: string;
  targetReplicas?: number;
}): Promise<K8sExecResult> {
  const apps = appsApi();
  if (!apps) {
    return { success: false, details: { error: "Kubernetes not configured (no kubeconfig or cluster)" } };
  }
  try {
    const cur = await apps.readNamespacedDeployment({ namespace: params.namespace, name: params.name });
    const current = cur.spec?.replicas ?? 1;
    const next =
      params.targetReplicas !== undefined && !Number.isNaN(params.targetReplicas)
        ? params.targetReplicas
        : current + 1;
    await apps.patchNamespacedDeploymentScale({
      namespace: params.namespace,
      name: params.name,
      body: { spec: { replicas: next } } as any,
    });
    return {
      success: true,
      details: {
        namespace: params.namespace,
        deployment: params.name,
        previousReplicas: current,
        replicas: next,
      },
    };
  } catch (e) {
    return {
      success: false,
      details: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

/** Rollout restart via pod template annotation (same idea as kubectl rollout restart). */
export async function rolloutRestartDeployment(params: { namespace: string; name: string }): Promise<K8sExecResult> {
  const apps = appsApi();
  if (!apps) {
    return { success: false, details: { error: "Kubernetes not configured (no kubeconfig or cluster)" } };
  }
  try {
    const dep = await apps.readNamespacedDeployment({ namespace: params.namespace, name: params.name });
    const body = JSON.parse(JSON.stringify(dep)) as k8s.V1Deployment;
    const spec = body.spec ?? ({} as k8s.V1DeploymentSpec);
    const tmpl = spec.template ?? ({} as k8s.V1PodTemplateSpec);
    const meta = tmpl.metadata ?? ({} as k8s.V1ObjectMeta);
    tmpl.metadata = meta;
    meta.annotations = {
      ...(meta.annotations ?? {}),
      "kubectl.kubernetes.io/restartedAt": new Date().toISOString(),
    };
    spec.template = tmpl;
    body.spec = spec;
    await apps.replaceNamespacedDeployment({
      namespace: params.namespace,
      name: params.name,
      body,
    });
    return {
      success: true,
      details: { namespace: params.namespace, deployment: params.name, restart: "rollout" },
    };
  } catch (e) {
    return {
      success: false,
      details: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

export async function scaleDeploymentDown(params: {
  namespace: string;
  name: string;
  minReplicas: number;
}): Promise<K8sExecResult> {
  const target = Math.max(1, params.minReplicas);
  return scaleDeployment({
    namespace: params.namespace,
    name: params.name,
    replicas: target,
  });
}

/** Reduce replicas by 1, floored at minReplicas. */
export async function scaleDeploymentDownOne(params: {
  namespace: string;
  name: string;
  minReplicas: number;
}): Promise<K8sExecResult> {
  const apps = appsApi();
  if (!apps) {
    return { success: false, details: { error: "Kubernetes not configured (no kubeconfig or cluster)" } };
  }
  try {
    const cur = await apps.readNamespacedDeployment({ namespace: params.namespace, name: params.name });
    const current = cur.spec?.replicas ?? 1;
    const next = Math.max(params.minReplicas, current - 1);
    if (next === current) {
      return {
        success: true,
        details: {
          namespace: params.namespace,
          deployment: params.name,
          previousReplicas: current,
          replicas: current,
          note: "already_at_min",
        },
      };
    }
    await apps.patchNamespacedDeploymentScale({
      namespace: params.namespace,
      name: params.name,
      body: { spec: { replicas: next } } as any,
    });
    return {
      success: true,
      details: {
        namespace: params.namespace,
        deployment: params.name,
        previousReplicas: current,
        replicas: next,
      },
    };
  } catch (e) {
    return {
      success: false,
      details: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

export async function readDeploymentReplicas(params: {
  namespace: string;
  name: string;
}): Promise<number | null> {
  const apps = appsApi();
  if (!apps) return null;
  try {
    const d = await apps.readNamespacedDeployment({ namespace: params.namespace, name: params.name });
    return d.spec?.replicas ?? null;
  } catch {
    return null;
  }
}
