import { getAdapter, getAllAdapters, listProviders } from "./uial.registry";
import type {
  InfraProvider, InfraEnvironment,
  CreateComputeParams, ScaleComputeParams,
  CreateStorageParams, CreateNetworkParams,
  KubeDeployParams, CreateIAMParams,
} from "./uial.types";

export const uialService = {
  providers() {
    return listProviders();
  },

  async healthAll() {
    const adapters = getAllAdapters();
    const results = await Promise.allSettled(adapters.map((a) => a.healthCheck()));
    return results.map((r, i) => ({
      ...(r.status === "fulfilled" ? r.value : { healthy: false, message: String((r as any).reason) }),
      provider: adapters[i].provider,
      environment: adapters[i].environment,
      displayName: adapters[i].displayName,
    }));
  },

  async metricsAll(env?: InfraEnvironment) {
    const adapters = getAllAdapters().filter((a) => !env || a.environment === env);
    return Promise.all(adapters.map((a) => a.metrics()));
  },

  // ─── Compute ────────────────────────────────────────────────────────────────
  async createCompute(params: CreateComputeParams) {
    return getAdapter(params.provider).compute.create(params);
  },
  async scaleCompute(params: ScaleComputeParams) {
    return getAdapter(params.provider).compute.scale(params);
  },
  async monitorCompute(provider: InfraProvider, resourceId: string) {
    return getAdapter(provider).compute.monitor(resourceId, provider);
  },

  // ─── Storage ────────────────────────────────────────────────────────────────
  async createStorage(params: CreateStorageParams) {
    return getAdapter(params.provider).storage.create(params);
  },
  async scaleStorage(provider: InfraProvider, resourceId: string, newSizeGb: number) {
    return getAdapter(provider).storage.scale(resourceId, newSizeGb, provider);
  },

  // ─── Network ────────────────────────────────────────────────────────────────
  async createNetwork(params: CreateNetworkParams) {
    return getAdapter(params.provider).network.create(params);
  },

  // ─── Kubernetes ─────────────────────────────────────────────────────────────
  async kubeCreate(params: KubeDeployParams) {
    return getAdapter(params.provider).kubernetes.create(params);
  },
  async kubeScale(params: Pick<KubeDeployParams, "provider" | "clusterId" | "namespace" | "deploymentName" | "replicas">) {
    return getAdapter(params.provider).kubernetes.scale(params);
  },
  async kubeMonitor(provider: InfraProvider, clusterId: string) {
    return getAdapter(provider).kubernetes.monitor(clusterId, provider);
  },

  // ─── IAM ────────────────────────────────────────────────────────────────────
  async createIAM(params: CreateIAMParams) {
    return getAdapter(params.provider).iam.create(params);
  },
};
