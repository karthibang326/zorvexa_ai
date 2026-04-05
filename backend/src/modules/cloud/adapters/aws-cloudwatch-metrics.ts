import { env } from "../../../config/env";

/**
 * Single datapoint CPU % (or any Average statistic) from CloudWatch when dimensions are configured.
 */
export async function tryFetchAwsLiveCpuPct(): Promise<number | null> {
  if (env.AWS_LIVE_ADAPTER_METRICS !== "true" || process.env.NODE_ENV === "test") return null;

  const dimRaw = env.AWS_CLOUDWATCH_DIMENSIONS_JSON.trim();
  if (!dimRaw) return null;

  let dimensions: { Name: string; Value: string }[] = [];
  try {
    const o = JSON.parse(dimRaw) as Record<string, string>;
    dimensions = Object.entries(o).map(([Name, Value]) => ({ Name, Value: String(Value) }));
  } catch {
    return null;
  }
  if (!dimensions.length) return null;

  try {
    const { CloudWatchClient, GetMetricStatisticsCommand } = await import("@aws-sdk/client-cloudwatch");
    const client = new CloudWatchClient({ region: env.AWS_REGION.trim() || "us-east-1" });
    const end = new Date();
    const start = new Date(end.getTime() - 15 * 60 * 1000);
    const out = await client.send(
      new GetMetricStatisticsCommand({
        Namespace: env.AWS_CLOUDWATCH_NAMESPACE.trim() || "AWS/EC2",
        MetricName: env.AWS_CLOUDWATCH_METRIC_NAME.trim() || "CPUUtilization",
        Dimensions: dimensions,
        StartTime: start,
        EndTime: end,
        Period: 300,
        Statistics: ["Average"],
      })
    );
    const sorted = [...(out.Datapoints ?? [])].sort(
      (a, b) => (b.Timestamp?.getTime() ?? 0) - (a.Timestamp?.getTime() ?? 0)
    );
    const avg = sorted[0]?.Average;
    if (typeof avg !== "number" || Number.isNaN(avg)) return null;
    return Math.round(Math.min(100, Math.max(0, avg)) * 10) / 10;
  } catch {
    return null;
  }
}
