/** Where the AI should apply remediation (routes unified execution). */
export type AiTargetProvider = "aws" | "gcp" | "azure" | "kubernetes";

/** Observable infrastructure signals (CPU, latency, memory). */
export type MetricSnapshot = {
  ts: number;
  resource: string;
  /** Inferred or configured control plane for this workload */
  provider: AiTargetProvider;
  cpuPct: number;
  memoryPct: number;
  latencyP95Ms: number;
  errorRateBps: number;
};

export type AnomalySeverity = "info" | "warning" | "critical";

export type AnomalySignal = {
  kind: "cpu" | "memory" | "latency" | "errors";
  severity: AnomalySeverity;
  value: number;
  threshold: number;
  message: string;
};

export type DetectionResult = {
  hasAnomaly: boolean;
  signals: AnomalySignal[];
  summary: string;
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ActionKind = "scale_up" | "scale_down" | "restart" | "none" | "optimize";

export type DecisionResult = {
  action: ActionKind;
  confidence: number;
  risk: RiskLevel;
  reason: string;
  targetReplicas?: number;
  detail: string;
  /** Target cloud / Kubernetes for execution routing */
  provider: AiTargetProvider;
  /** True when confidence was scaled using `ai_learning` success rates */
  learningAdjusted?: boolean;
};

export type ExecutionResult = {
  simulated: boolean;
  success: boolean;
  message: string;
  provider: "simulation" | "kubernetes" | "aws" | "gcp" | "azure";
  /** When simulated, which control plane the AI targeted (for UI / audit) */
  targetProvider?: AiTargetProvider;
  /** Intended for future K8s/AWS integration */
  pendingIntegration?: string;
  /** Set when a policy guardrail prevented live apply */
  guardrailBlocked?: boolean;
  /** Populated after live Kubernetes mutations for audit / verification */
  k8s?: {
    namespace: string;
    deployment: string;
    replicasBefore?: number;
    replicasAfter?: number;
  };
};

export type VerificationResult = {
  improved: boolean;
  before: Pick<MetricSnapshot, "cpuPct" | "memoryPct" | "latencyP95Ms" | "errorRateBps">;
  after: Pick<MetricSnapshot, "cpuPct" | "memoryPct" | "latencyP95Ms" | "errorRateBps">;
  improvementScore: number;
  summary: string;
  /** When live K8s was used, optional replica before/after for operators */
  k8sReplicas?: { before?: number; after?: number };
};

export type AiLoopOutcome = "success" | "partial" | "noop" | "failed";

/** Historical outcomes used to tune confidence (from `ai_learning`). */
export type LearningHints = {
  successRateByAction: Partial<Record<ActionKind, number>>;
  sampleSizeByAction: Partial<Record<ActionKind, number>>;
};
