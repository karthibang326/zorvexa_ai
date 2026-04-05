import type { MetricsState } from "../../ai-ops-learning/types";
import type { WorkflowAiDecision } from "./types";

export function decideNodeAction(metrics: MetricsState): WorkflowAiDecision {
  const cpu = Number(metrics.cpu ?? 0);
  const latency = Number(metrics.latency ?? 0);
  const errorRate = Number(metrics.errorRate ?? 0);
  const cost = Number(metrics.cost ?? 0);

  if (cpu > 85 || latency > 350 || errorRate > 2.5) {
    return {
      action: "scale_up",
      replicas: 10,
      reason: "CPU saturation / latency pressure detected",
      confidence: 0.92,
      risk: cpu > 92 || errorRate > 4 ? "HIGH" : "MEDIUM",
      metricsUsed: { cpu, latency, errorRate, cost },
    };
  }

  if (cost > 22 && cpu < 65) {
    return {
      action: "optimize_cost",
      reason: "Cost anomaly with low compute pressure",
      confidence: 0.84,
      risk: "LOW",
      metricsUsed: { cpu, latency, errorRate, cost },
    };
  }

  return {
    action: "continue",
    reason: "No severe anomaly; continue planned orchestration",
    confidence: 0.78,
    risk: "LOW",
    metricsUsed: { cpu, latency, errorRate, cost },
  };
}
