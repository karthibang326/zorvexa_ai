import { api } from "@/lib/api";

export type AiStreamPhase = "DETECT" | "DECISION" | "ACTION" | "RESULT";

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
    cloudTargetProvider?: string;
    targetProvider?: string;
    provider?: string;
    guardrailBlocked?: boolean;
    k8s?: { namespace: string; deployment: string; replicasBefore?: number; replicasAfter?: number };
    k8sReplicas?: { before?: number; after?: number };
    learningAdjusted?: boolean;
  };
};

export function getAiStreamWebSocketUrl(): string {
  const root = import.meta.env.VITE_WORKFLOWS_API_URL?.replace(/\/$/, "");
  if (root) {
    const u = new URL(root);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}/ws/ai-stream`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/ai-stream`;
}

export async function fetchAiStreamRecent(limit = 80): Promise<AiStreamEventPayload[]> {
  const { data } = await api.get<{ items: AiStreamEventPayload[] }>("/realtime/ai-stream/recent", {
    params: { limit },
  });
  return data.items ?? [];
}

export function deriveAiStreamKpis(events: AiStreamEventPayload[]) {
  const slice = events.slice(0, 200);
  const counts = { DETECT: 0, DECISION: 0, ACTION: 0, RESULT: 0 };
  for (const e of slice) {
    counts[e.phase]++;
  }
  const lastResult = slice.find((e) => e.phase === "RESULT");
  const healthScore = lastResult?.meta?.healthScore ?? (slice.length === 0 ? 0 : 94);
  const withConf = slice.filter((e) => typeof e.meta?.confidence === "number");
  const avgConfidence =
    withConf.length > 0
      ? withConf.reduce((s, e) => s + (e.meta!.confidence as number), 0) / withConf.length
      : 0;
  return { counts, healthScore, avgConfidence };
}
