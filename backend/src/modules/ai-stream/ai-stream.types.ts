export type AiStreamPhase = "DETECT" | "DECISION" | "ACTION" | "RESULT";

/** Wire format for WebSocket + optional Redis Pub/Sub channel `ai:stream`. */
export type AiStreamEventPayload = {
  type: "ai.stream";
  version: 1;
  id: string;
  phase: AiStreamPhase;
  title: string;
  detail: string;
  ts: number;
  correlationId: string;
  meta?: {
    resource?: string;
    confidence?: number;
    latencyMs?: number;
    healthScore?: number;
    kpiDelta?: Record<string, number>;
    risk?: string;
    action?: string;
    anomalyKinds?: string[];
    improvementScore?: number;
    provider?: string;
    guardrailBlocked?: boolean;
    k8s?: { namespace: string; deployment: string; replicasBefore?: number; replicasAfter?: number };
    k8sReplicas?: { before?: number; after?: number };
    /** AI routing: aws | gcp | azure | kubernetes */
    cloudTargetProvider?: string;
    targetProvider?: string;
    learningAdjusted?: boolean;
  };
};
