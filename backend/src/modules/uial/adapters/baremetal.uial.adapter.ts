/**
 * Bare Metal On-Premise Adapter
 *
 * Communicates with on-prem servers via the lightweight ASTRAOPS Agent
 * installed on each physical host.  In production the agent exposes a gRPC
 * endpoint; here the adapter models the full interface so the control plane
 * can treat bare-metal identically to any cloud provider.
 */
import type {
  UIALAdapter, OperationResult, UnifiedMetrics, HealthStatus,
  ComputeService, StorageService, NetworkService, KubernetesService, IAMService,
  CreateComputeParams, ScaleComputeParams, CreateStorageParams,
  CreateNetworkParams, KubeDeployParams, CreateIAMParams,
} from "../uial.types";

const NOW = () => new Date().toISOString();
const ENV = "onprem" as const;
const PROV = "baremetal" as const;

const ok = (status: string, details?: Record<string, unknown>): OperationResult => ({
  ok: true, status, provider: PROV, environment: ENV, details,
});

// ─── Simulated in-process agent registry ─────────────────────────────────────
// In production this would be replaced by gRPC/HTTP calls to on-prem agents.
interface AgentNode { id: string; ip: string; cpu: number; memory: number; status: string }
const knownNodes: AgentNode[] = [
  { id: "bm-node-01", ip: "192.168.1.10", cpu: 72, memory: 65, status: "healthy" },
  { id: "bm-node-02", ip: "192.168.1.11", cpu: 48, memory: 51, status: "healthy" },
  { id: "bm-node-03", ip: "192.168.1.12", cpu: 91, memory: 88, status: "degraded" },
];

const compute: ComputeService = {
  async create(p: CreateComputeParams) {
    // Bare metal "create" = provision OS on an unallocated physical server via PXE/IPMI
    return ok("BAREMETAL_SERVER_PROVISIONED", {
      datacenter: p.region ?? "dc-01",
      count: p.count ?? 1,
      imageId: p.imageId ?? "ubuntu-22.04-lts",
      agentInstalled: true,
    });
  },
  async delete(resourceId) {
    return ok("BAREMETAL_SERVER_DECOMMISSIONED", { resourceId, wipeDisk: true });
  },
  async update(resourceId, p) {
    return ok("BAREMETAL_SERVER_RECONFIGURED", { resourceId, changes: p });
  },
  async scale(p: ScaleComputeParams) {
    // Scaling = allocate additional physical servers from the reserve pool
    return ok("BAREMETAL_POOL_EXPANDED", {
      resourceId: p.resourceId,
      targetCount: p.targetCount,
      allocatedFrom: "reserve-pool-dc01",
    });
  },
  async monitor(resourceId) {
    const node = knownNodes.find((n) => n.id === resourceId) ?? knownNodes[0];
    return {
      provider: PROV, environment: ENV, resourceId: node.id,
      cpu: node.cpu, memory: node.memory, network: 920, storage: 420, cost: 0,
      latency: 5, errorRate: node.status === "degraded" ? 2.5 : 0.05, timestamp: NOW(),
    } as UnifiedMetrics;
  },
};

const storage: StorageService = {
  async create(p: CreateStorageParams) {
    return ok("BAREMETAL_LOCAL_STORAGE_PROVISIONED", {
      sizeGb: p.sizeGb, storageClass: p.storageClass ?? "nvme", encrypted: p.encrypted ?? true,
    });
  },
  async delete(resourceId) { return ok("BAREMETAL_STORAGE_WIPED", { resourceId }); },
  async update(resourceId, p) { return ok("BAREMETAL_STORAGE_UPDATED", { resourceId, changes: p }); },
  async scale(resourceId, newSizeGb) {
    return ok("BAREMETAL_STORAGE_EXPANDED", { resourceId, newSizeGb, method: "hot-add" });
  },
  async monitor(resourceId) {
    return {
      provider: PROV, environment: ENV, resourceId,
      cpu: 0, memory: 0, network: 50, storage: 800, cost: 0,
      latency: 1, errorRate: 0, timestamp: NOW(),
    } as UnifiedMetrics;
  },
};

const network: NetworkService = {
  async create(p: CreateNetworkParams) {
    return ok("BAREMETAL_VLAN_CONFIGURED", {
      cidr: p.cidr ?? "10.10.0.0/16",
      datacenter: p.region ?? "dc-01",
      enableBonding: true,
    });
  },
  async delete(resourceId) { return ok("BAREMETAL_VLAN_REMOVED", { resourceId }); },
  async update(resourceId, p) { return ok("BAREMETAL_NETWORK_UPDATED", { resourceId, changes: p }); },
  async scale(resourceId, bandwidthMbps) {
    return ok("BAREMETAL_BOND_UPGRADED", { resourceId, bandwidthMbps, method: "LACP-bond" });
  },
  async monitor(resourceId) {
    return {
      provider: PROV, environment: ENV, resourceId,
      cpu: 0, memory: 0, network: 10000, storage: 0, cost: 0,
      latency: 0.3, errorRate: 0.01, timestamp: NOW(),
    } as UnifiedMetrics;
  },
};

const kubernetes: KubernetesService = {
  async create(p: KubeDeployParams) {
    return ok("BAREMETAL_K8S_DEPLOYMENT_CREATED", {
      clusterId: p.clusterId, namespace: p.namespace,
      deploymentName: p.deploymentName, replicas: p.replicas ?? 2,
      runtime: "containerd",
    });
  },
  async delete(clusterId, namespace, deploymentName) {
    return ok("BAREMETAL_K8S_DEPLOYMENT_DELETED", { clusterId, namespace, deploymentName });
  },
  async update(p) {
    return ok("BAREMETAL_K8S_DEPLOYMENT_UPDATED", { clusterId: p.clusterId, image: p.image });
  },
  async scale(p) {
    return ok("BAREMETAL_K8S_REPLICAS_SCALED", {
      clusterId: p.clusterId, namespace: p.namespace,
      deploymentName: p.deploymentName, replicas: p.replicas ?? 3,
    });
  },
  async monitor(clusterId) {
    return {
      provider: PROV, environment: ENV, resourceId: clusterId,
      cpu: 70, memory: 63, network: 920, storage: 600, cost: 0,
      latency: 6, errorRate: 0.08, timestamp: NOW(),
    } as UnifiedMetrics;
  },
};

const iam: IAMService = {
  async create(p: CreateIAMParams) {
    return ok("BAREMETAL_LOCAL_ACCOUNT_CREATED", { principalId: p.principalId, role: p.role });
  },
  async delete(principalId) { return ok("BAREMETAL_LOCAL_ACCOUNT_DELETED", { principalId }); },
  async update(principalId, p) { return ok("BAREMETAL_LOCAL_ACCOUNT_UPDATED", { principalId, changes: p }); },
  async scale() { return ok("BAREMETAL_IAM_NOOP"); },
  async monitor(principalId) {
    return {
      healthy: true, provider: PROV, environment: ENV, resourceId: principalId,
      message: "Local service account active — mTLS certificates valid", checkedAt: NOW(),
    } as HealthStatus;
  },
};

export const baremetalUIALAdapter: UIALAdapter = {
  provider: PROV,
  environment: ENV,
  displayName: "Bare Metal (On-Premise)",
  compute, storage, network, kubernetes, iam,
  async healthCheck() {
    const degraded = knownNodes.filter((n) => n.status !== "healthy").length;
    return {
      healthy: degraded === 0, provider: PROV, environment: ENV,
      resourceId: "baremetal-cluster",
      message: degraded > 0
        ? `${degraded} node(s) degraded — ASTRAOPS agent monitoring`
        : "All bare-metal nodes healthy — agents connected",
      checkedAt: NOW(),
      metrics: { totalNodes: knownNodes.length, healthyNodes: knownNodes.length - degraded },
    };
  },
  async metrics() {
    const avg = (key: keyof AgentNode) =>
      knownNodes.reduce((s, n) => s + Number(n[key]), 0) / knownNodes.length;
    return {
      provider: PROV, environment: ENV, resourceId: "baremetal-aggregate",
      cpu: Math.round(avg("cpu")), memory: Math.round(avg("memory")),
      network: 920, storage: 800, cost: 0,
      latency: 5, errorRate: 0.05, timestamp: NOW(),
    };
  },
};
