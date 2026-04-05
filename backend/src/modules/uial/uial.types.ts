/**
 * ASTRAOPS — Universal Infra Abstraction Layer (UIAL)
 *
 * Every infrastructure provider (AWS, Azure, GCP, BareMetal, VMware, K8s-OnPrem)
 * MUST implement all five service interfaces below.  The control plane speaks only
 * to these interfaces — never to provider-specific SDKs directly.
 *
 * Capability surface: create | delete | update | scale | monitor
 */

// ─── Provider identity ────────────────────────────────────────────────────────

export type CloudProvider = "aws" | "azure" | "gcp";
export type OnPremProvider = "baremetal" | "vmware" | "k8s-onprem";
export type InfraProvider = CloudProvider | OnPremProvider;
export type InfraEnvironment = "cloud" | "onprem" | "hybrid";

// ─── Shared primitives ────────────────────────────────────────────────────────

export interface ResourceRef {
  provider: InfraProvider;
  environment: InfraEnvironment;
  region?: string;        // cloud region or datacenter name
  zone?: string;          // availability zone / rack
  clusterId?: string;
  resourceId: string;
  namespace?: string;
}

export interface OperationResult {
  ok: boolean;
  status: string;
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

export interface HealthStatus {
  healthy: boolean;
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId: string;
  message?: string;
  checkedAt: string;   // ISO-8601
  metrics?: Record<string, number>;
}

// ─── Unified metrics (MUST normalise to this shape) ──────────────────────────

export interface UnifiedMetrics {
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId: string;
  cpu: number;        // 0-100 %
  memory: number;     // 0-100 %
  network: number;    // Mbps
  storage: number;    // GB used
  cost: number;       // USD / hr
  latency: number;    // ms
  errorRate: number;  // %
  timestamp: string;  // ISO-8601
}

// ─── Compliance & data-locality tags ─────────────────────────────────────────

export type ComplianceTag = "GDPR" | "HIPAA" | "PCI-DSS" | "SOC2" | "INTERNAL";
export type DataLocality = "onprem-only" | "cloud-ok" | "region-restricted";

export interface WorkloadProfile {
  id: string;
  name: string;
  dataLocality: DataLocality;
  compliance: ComplianceTag[];
  latencySensitive: boolean;
  burstable: boolean;
  cpuRequest: number;    // cores
  memoryRequest: number; // GB
  priorityClass: "critical" | "high" | "normal" | "low";
}

// ─── ComputeService interface ─────────────────────────────────────────────────

export interface CreateComputeParams {
  provider: InfraProvider;
  region?: string;
  instanceType?: string;
  imageId?: string;
  count?: number;
  tags?: Record<string, string>;
}

export interface ScaleComputeParams {
  provider: InfraProvider;
  resourceId: string;
  targetCount: number;
  namespace?: string;
}

export interface ComputeService {
  create(params: CreateComputeParams): Promise<OperationResult>;
  delete(resourceId: string, provider: InfraProvider): Promise<OperationResult>;
  update(resourceId: string, params: Partial<CreateComputeParams>): Promise<OperationResult>;
  scale(params: ScaleComputeParams): Promise<OperationResult>;
  monitor(resourceId: string, provider: InfraProvider): Promise<UnifiedMetrics>;
}

// ─── StorageService interface ─────────────────────────────────────────────────

export interface CreateStorageParams {
  provider: InfraProvider;
  region?: string;
  sizeGb: number;
  storageClass?: "ssd" | "hdd" | "nvme" | "object";
  encrypted?: boolean;
  tags?: Record<string, string>;
}

export interface StorageService {
  create(params: CreateStorageParams): Promise<OperationResult>;
  delete(resourceId: string, provider: InfraProvider): Promise<OperationResult>;
  update(resourceId: string, params: Partial<CreateStorageParams>): Promise<OperationResult>;
  scale(resourceId: string, newSizeGb: number, provider: InfraProvider): Promise<OperationResult>;
  monitor(resourceId: string, provider: InfraProvider): Promise<UnifiedMetrics>;
}

// ─── NetworkService interface ─────────────────────────────────────────────────

export interface CreateNetworkParams {
  provider: InfraProvider;
  cidr?: string;
  region?: string;
  enableVpn?: boolean;
  enablePrivateLink?: boolean;
}

export interface NetworkService {
  create(params: CreateNetworkParams): Promise<OperationResult>;
  delete(resourceId: string, provider: InfraProvider): Promise<OperationResult>;
  update(resourceId: string, params: Partial<CreateNetworkParams>): Promise<OperationResult>;
  scale(resourceId: string, bandwidthMbps: number, provider: InfraProvider): Promise<OperationResult>;
  monitor(resourceId: string, provider: InfraProvider): Promise<UnifiedMetrics>;
}

// ─── KubernetesService interface ──────────────────────────────────────────────

export interface KubeDeployParams {
  provider: InfraProvider;
  clusterId: string;
  namespace: string;
  deploymentName: string;
  image?: string;
  replicas?: number;
  strategy?: "rolling" | "canary" | "blue-green";
}

export interface KubernetesService {
  create(params: KubeDeployParams): Promise<OperationResult>;
  delete(clusterId: string, namespace: string, deploymentName: string, provider: InfraProvider): Promise<OperationResult>;
  update(params: KubeDeployParams): Promise<OperationResult>;
  scale(params: Pick<KubeDeployParams, "provider" | "clusterId" | "namespace" | "deploymentName" | "replicas">): Promise<OperationResult>;
  monitor(clusterId: string, provider: InfraProvider): Promise<UnifiedMetrics>;
}

// ─── IAMService interface ─────────────────────────────────────────────────────

export interface CreateIAMParams {
  provider: InfraProvider;
  principalId: string;
  role: string;
  resourceArn?: string;
  policies?: string[];
}

export interface IAMService {
  create(params: CreateIAMParams): Promise<OperationResult>;
  delete(principalId: string, provider: InfraProvider): Promise<OperationResult>;
  update(principalId: string, params: Partial<CreateIAMParams>): Promise<OperationResult>;
  scale(_params: never): Promise<OperationResult>;   // N/A — satisfies interface
  monitor(principalId: string, provider: InfraProvider): Promise<HealthStatus>;
}

// ─── Full provider adapter interface ─────────────────────────────────────────

export interface UIALAdapter {
  readonly provider: InfraProvider;
  readonly environment: InfraEnvironment;
  readonly displayName: string;
  compute: ComputeService;
  storage: StorageService;
  network: NetworkService;
  kubernetes: KubernetesService;
  iam: IAMService;
  /** Provider-level health probe */
  healthCheck(): Promise<HealthStatus>;
  /** Bulk normalised metrics snapshot */
  metrics(): Promise<UnifiedMetrics>;
}
