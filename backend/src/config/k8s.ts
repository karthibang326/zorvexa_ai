import k8s from "@kubernetes/client-node";

export interface ArgoRolloutsConfig {
  group: string;
  version: string;
  plural: string;
}

export function getArgoRolloutsConfig(): ArgoRolloutsConfig {
  return {
    group: process.env.ARGO_ROLLOUTS_GROUP ?? "argoproj.io",
    version: process.env.ARGO_ROLLOUTS_VERSION ?? "v1alpha1",
    plural: process.env.ARGO_ROLLOUTS_PLURAL ?? "rollouts",
  };
}

export function getK8sCustomObjectsApi(): k8s.CustomObjectsApi {
  const kc = new k8s.KubeConfig();

  const kubeconfigPath = process.env.KUBECONFIG;
  if (kubeconfigPath) {
    kc.loadFromFile(kubeconfigPath);
  } else if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
  } else {
    throw new Error(
      "Kubernetes config not found. Set KUBECONFIG=<path> or run inside a cluster (KUBERNETES_SERVICE_HOST set)."
    );
  }

  return kc.makeApiClient(k8s.CustomObjectsApi);
}

