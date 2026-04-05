import { env } from "../../config/env";
import type { MetricsState } from "./types";

type ObservedSignal = {
  metrics: MetricsState;
  logs: string[];
  events: Array<{ type: string; message: string; severity?: "low" | "medium" | "high" }>;
};

/**
 * Optional live metrics: GET JSON from OPS_METRICS_URL (Prometheus adapter, sidecar, etc.).
 * Expected shape (flexible): { cpu?, memory?, latency?, traffic?, errorRate?, cost?, logs?, events? }
 */
export async function tryFetchLiveObservedSignal(): Promise<{
  signal: ObservedSignal;
  source: "live";
} | null> {
  const url = env.OPS_METRICS_URL.trim();
  if (!url) return null;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = env.OPS_METRICS_BEARER_TOKEN.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), env.OPS_METRICS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const metrics: MetricsState = {
      cpu: num(j.cpu ?? j.cpu_pct ?? j.CPU),
      memory: num(j.memory ?? j.mem ?? j.memory_pct),
      latency: num(j.latency ?? j.latency_ms ?? j.p95_latency),
      traffic: num(j.traffic ?? j.rps),
      errorRate: num(j.errorRate ?? j.error_rate),
      cost: num(j.cost ?? j.cost_index),
    };
    const logs = Array.isArray(j.logs) ? (j.logs as string[]) : [];
    const rawEv = j.events;
    const events: ObservedSignal["events"] = Array.isArray(rawEv)
      ? (rawEv as ObservedSignal["events"]).filter(
          (e) => e && typeof e === "object" && typeof (e as { type?: string }).type === "string"
        )
      : [];
    return {
      source: "live",
      signal: {
        metrics,
        logs,
        events,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}
