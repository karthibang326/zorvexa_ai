import { SreMetrics } from "./sre-system.types";

export function detectAnomalies(metrics: SreMetrics) {
  const anomalies: string[] = [];
  if ((metrics.latencyP95 ?? 0) > 450) anomalies.push("latency_spike");
  if ((metrics.cpu ?? 0) > 80) anomalies.push("cpu_saturation");
  if ((metrics.errorRate ?? 0) > 2) anomalies.push("error_rate_increase");
  if ((metrics.costDeltaPct ?? 0) > 25) anomalies.push("cost_anomaly");
  return {
    detected: anomalies.length > 0,
    anomalies,
  };
}

