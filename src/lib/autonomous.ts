import { api } from "./api";

export interface MetricSample {
  ts: string;
  cpu?: number;
  memory?: number;
  traffic?: number;
  errors?: number;
}

export async function setAutonomousMode(payload: {
  enabled: boolean;
  confidenceThreshold?: number;
  maxActionsPerHour?: number;
  manualOverride?: boolean;
}) {
  const { data } = await api.post("/autonomous/mode", payload);
  return data as {
    enabled: boolean;
    confidenceThreshold: number;
    maxActionsPerHour: number;
    manualOverride: boolean;
  };
}

export async function getAutonomousMode() {
  const { data } = await api.get("/autonomous/mode");
  return data as {
    enabled: boolean;
    confidenceThreshold: number;
    maxActionsPerHour: number;
    manualOverride: boolean;
  };
}

export async function runAutonomousLoop(payload: {
  provider: "aws" | "gcp" | "azure";
  deploymentName: string;
  namespace?: string;
  historicalMetrics: MetricSample[];
}) {
  const { data } = await api.post("/autonomous/loop/run", payload);
  return data as Record<string, unknown>;
}

export async function getPredictions() {
  const { data } = await api.get("/predict/history");
  return (data?.items ?? []) as Array<{
    id: string;
    predictedIssue: string;
    riskScore: number;
    failureProbability: number;
    recommendation?: string;
    createdAt: string;
  }>;
}

export async function getAutonomousActions() {
  const { data } = await api.get("/autonomous/actions/history");
  return (data?.items ?? []) as Array<{
    id: string;
    type: string;
    decision: string;
    confidence: number;
    status: string;
    createdAt: string;
  }>;
}

export async function runHybridAutonomy(payload: {
  runId?: string;
  workload: {
    id: string;
    name: string;
    dataLocality: "onprem-only" | "cloud-ok" | "region-restricted";
    compliance: Array<"GDPR" | "HIPAA" | "PCI-DSS" | "SOC2" | "INTERNAL">;
    latencySensitive: boolean;
    burstable: boolean;
    cpuRequest: number;
    memoryRequest: number;
    priorityClass: "critical" | "high" | "normal" | "low";
  };
  currentProvider?: "aws" | "azure" | "gcp" | "baremetal" | "vmware" | "k8s-onprem";
  currentEnvironment?: "cloud" | "onprem" | "hybrid";
  clusterId?: string;
  namespace?: string;
  deploymentName?: string;
  replicas?: number;
}) {
  const { data } = await api.post("/autonomous/hybrid/run", payload);
  return data as {
    runId?: string;
    autonomous: boolean;
    decision: {
      targetProvider: string;
      targetEnvironment: string;
      confidence: number;
      reasons: string[];
    };
    action: { type: string };
    verification: {
      verified: boolean;
      before: { avgLatency: number; avgErrorRate: number; costPerHour: number };
      after: { avgLatency: number; avgErrorRate: number; costPerHour: number };
    };
    timeline: Array<{ step: string; at: string; message: string }>;
  };
}

export async function getK8sAutonomousStatus() {
  const { data } = await api.get("/autonomous/k8s/status");
  return data as {
    running: boolean;
    dryRun: boolean;
    lastCycleAt: string | null;
    lastIssues: Array<{
      type: "pod_crash" | "high_cpu" | "node_failure";
      namespace?: string;
      pod?: string;
      node?: string;
      deployment?: string;
      reason: string;
      confidence: number;
    }>;
    lastActions: Array<{
      id: string;
      ts: string;
      action: "restart_pod" | "scale_deployment";
      target: string;
      confidence: number;
      risk: "LOW" | "MEDIUM" | "HIGH";
      reason: string;
      outcome: string;
      verification: "PASSED" | "FAILED" | "SKIPPED";
      rollbackStatus: "NOT_REQUIRED" | "ROLLED_BACK" | "ROLLBACK_FAILED" | "NOT_APPLICABLE";
      snapshot?: Record<string, unknown>;
    }>;
    pendingApprovals: Array<{
      id: string;
      createdAt: string;
      action: "restart_pod" | "scale_deployment";
      target: string;
      risk: "LOW" | "MEDIUM" | "HIGH";
    }>;
    memory: Array<{
      id: string;
      ts: string;
      action: "restart_pod" | "scale_deployment";
      target: string;
      confidence: number;
      risk: "LOW" | "MEDIUM" | "HIGH";
      reason: string;
      outcome: string;
      verification: "PASSED" | "FAILED" | "SKIPPED";
      rollbackStatus: "NOT_REQUIRED" | "ROLLED_BACK" | "ROLLBACK_FAILED" | "NOT_APPLICABLE";
      snapshot?: Record<string, unknown>;
    }>;
  };
}

export async function stopK8sAutonomousLoop() {
  const { data } = await api.post("/autonomous/k8s/stop", {});
  return data as { ok?: boolean };
}

export async function approveK8sHighRiskAction(approvalId: string) {
  const { data } = await api.post("/autonomous/k8s/approve", { approvalId });
  return data as {
    ok: boolean;
    approved?: {
      id: string;
      createdAt: string;
      action: "restart_pod" | "scale_deployment";
      target: string;
      risk: "LOW" | "MEDIUM" | "HIGH";
    };
  };
}

