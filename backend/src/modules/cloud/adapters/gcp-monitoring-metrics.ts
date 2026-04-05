import { env } from "../../../config/env";

function normalizeCpuPct(raw: number): number {
  if (!Number.isFinite(raw)) return NaN;
  let v = raw;
  if (v >= 0 && v <= 1.5) v *= 100;
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}

function typedValueNum(tv: unknown): number | null {
  if (!tv || typeof tv !== "object") return null;
  const o = tv as { doubleValue?: number | null; int64Value?: unknown };
  if (typeof o.doubleValue === "number" && Number.isFinite(o.doubleValue)) return o.doubleValue;
  const iv = o.int64Value;
  if (iv != null) {
    if (typeof iv === "object" && iv !== null && typeof (iv as { toNumber?: () => number }).toNumber === "function") {
      const n = (iv as { toNumber: () => number }).toNumber();
      if (Number.isFinite(n)) return n;
    }
    const n = Number(iv);
    if (Number.isFinite(n) && String(iv).trim() !== "") return n;
  }
  return null;
}

function endSeconds(p: unknown): number {
  if (!p || typeof p !== "object") return 0;
  const s = (p as { interval?: { endTime?: { seconds?: unknown } } }).interval?.endTime?.seconds;
  if (s == null) return 0;
  if (typeof s === "object" && s !== null && typeof (s as { toNumber?: () => number }).toNumber === "function") {
    return (s as { toNumber: () => number }).toNumber();
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Latest CPU-related datapoint from Cloud Monitoring when `GCP_MONITORING_FILTER` targets a single metric type.
 * Uses Application Default Credentials (workload identity, gcloud, or `GOOGLE_APPLICATION_CREDENTIALS`).
 */
export async function tryFetchGcpLiveCpuPct(): Promise<number | null> {
  if (env.GCP_LIVE_ADAPTER_METRICS !== "true" || process.env.NODE_ENV === "test") return null;

  const filter = env.GCP_MONITORING_FILTER.trim();
  if (!filter) return null;

  const projectId = env.GCP_PROJECT_ID.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim() || "";
  if (!projectId) return null;

  try {
    const monitoring = await import("@google-cloud/monitoring");
    const client = new monitoring.MetricServiceClient();
    const name = client.projectPath(projectId);
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = nowSec - 900;
    const [series] = await client.listTimeSeries({
      name,
      filter,
      interval: {
        endTime: { seconds: nowSec },
        startTime: { seconds: startSec },
      },
      view: 0,
    });
    const ts = series[0];
    const points = ts?.points;
    if (!points?.length) return null;
    const latest = [...points].sort((a, b) => endSeconds(b) - endSeconds(a))[0];
    const n = typedValueNum(latest?.value);
    if (n == null) return null;
    const pct = normalizeCpuPct(n);
    return Number.isNaN(pct) ? null : pct;
  } catch {
    return null;
  }
}
