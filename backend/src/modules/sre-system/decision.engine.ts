import { SreActionPlan, SreMetrics } from "./sre-system.types";

export function decideAction(metrics: SreMetrics, resource: string): SreActionPlan {
  if ((metrics.errorRate ?? 0) > 2) {
    return {
      action: "rollback",
      resource,
      reason: "Error rate above threshold",
      riskScore: 0.81,
      confidence: 0.86,
    };
  }

  if ((metrics.cpu ?? 0) > 80 || (metrics.latencyP95 ?? 0) > 450) {
    return {
      action: "scale_up",
      resource,
      reason: "CPU/latency trend indicates saturation",
      replicas: Math.max(2, Number(metrics.currentReplicas ?? 2) + 2),
      riskScore: 0.62,
      confidence: 0.84,
    };
  }

  if ((metrics.costDeltaPct ?? 0) > 25) {
    return {
      action: "restart_pods",
      resource,
      reason: "Cost anomaly + stale workloads suspected",
      riskScore: 0.49,
      confidence: 0.72,
    };
  }

  return {
    action: "no_action",
    resource,
    reason: "System stable",
    riskScore: 0.15,
    confidence: 0.91,
  };
}

