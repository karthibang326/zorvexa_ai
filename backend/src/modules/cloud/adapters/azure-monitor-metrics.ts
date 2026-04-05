import { env } from "../../../config/env";

function normalizeCpuPct(raw: number): number {
  if (!Number.isFinite(raw)) return NaN;
  let v = raw;
  if (v >= 0 && v <= 1.5) v *= 100;
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}

/**
 * Latest average CPU % from Azure Monitor for `AZURE_METRICS_RESOURCE_ID` (DefaultAzureCredential).
 */
export async function tryFetchAzureLiveCpuPct(): Promise<number | null> {
  if (env.AZURE_LIVE_ADAPTER_METRICS !== "true" || process.env.NODE_ENV === "test") return null;

  const resourceId = env.AZURE_METRICS_RESOURCE_ID.trim();
  if (!resourceId) return null;

  const metricName = env.AZURE_METRICS_NAME.trim() || "Percentage CPU";

  try {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const { MetricsQueryClient } = await import("@azure/monitor-query");
    const credential = new DefaultAzureCredential();
    const client = new MetricsQueryClient(credential);
    const options: {
      timespan: { duration: string };
      granularity: string;
      aggregations: ("Average")[];
      metricNamespace?: string;
    } = {
      timespan: { duration: "PT15M" },
      granularity: "PT5M",
      aggregations: ["Average"],
    };
    const ns = env.AZURE_METRICS_NAMESPACE.trim();
    if (ns) options.metricNamespace = ns;

    const result = await client.queryResource(resourceId, [metricName], options);
    const metric = result.getMetricByName(metricName) ?? result.metrics[0];
    const data = metric?.timeseries?.[0]?.data;
    if (!data?.length) return null;
    const sorted = [...data].sort((a, b) => b.timeStamp.getTime() - a.timeStamp.getTime());
    const avg = sorted[0]?.average;
    if (typeof avg !== "number" || Number.isNaN(avg)) return null;
    const pct = normalizeCpuPct(avg);
    return Number.isNaN(pct) ? null : pct;
  } catch {
    return null;
  }
}
