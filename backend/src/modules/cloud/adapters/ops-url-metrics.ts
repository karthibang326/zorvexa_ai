import { env } from "../../../config/env";
import type { CloudMetrics, CloudProvider } from "../cloud.types";

function clampPct(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function pickSlice(
  body: Record<string, unknown>,
  provider: CloudProvider
): Record<string, unknown> | null {
  const providers = body.providers;
  if (providers && typeof providers === "object" && providers !== null) {
    const p = (providers as Record<string, unknown>)[provider];
    if (p && typeof p === "object") return p as Record<string, unknown>;
  }
  const direct = body[provider];
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;
  if (num(body.cpu) != null || num(body.memory) != null || num(body.cost) != null) return body;
  return null;
}

/**
 * Shared live metrics for AWS/GCP/Azure adapters when `OPS_METRICS_URL` returns JSON
 * (Prometheus adapter, sidecar, or your own service).
 */
export async function tryCloudMetricsFromOpsUrl(provider: CloudProvider): Promise<CloudMetrics | null> {
  const url = env.OPS_METRICS_URL.trim();
  if (!url || process.env.NODE_ENV === "test") return null;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = env.OPS_METRICS_BEARER_TOKEN.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), env.OPS_METRICS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const slice = pickSlice(j, provider);
    if (!slice) return null;

    const cpuRaw = num(slice.cpu ?? slice.cpu_pct ?? slice.CPU);
    const memRaw = num(slice.memory ?? slice.mem ?? slice.memory_pct ?? slice.Memory);
    const costRaw = num(slice.cost ?? slice.cost_index ?? slice.costIndex);

    if (cpuRaw == null && memRaw == null && costRaw == null) return null;

    const cpu = clampPct(cpuRaw ?? 55);
    const memory = clampPct(memRaw ?? 52);
    const cost = Math.round(Math.min(999, Math.max(0, costRaw ?? 75)));

    return {
      provider,
      cpu,
      memory,
      cost,
      source: "live",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
