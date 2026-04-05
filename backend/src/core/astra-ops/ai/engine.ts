export type RiskLevel = "low" | "medium" | "high";

export type AiDecisionResult = {
  action: string;
  reason: string;
  confidence: number;
  risk: RiskLevel;
  /** UX / explainability */
  expectedImpact?: string;
};

function riskFor(cpu: number, mem: number, cost: number): RiskLevel {
  if (cpu > 95 || mem > 95 || cost > 5000) return "high";
  if (cpu > 90 || mem > 92 || cost > 2500) return "medium";
  return "low";
}

/** Rule-based decision layer (swap for LLM later). */
export function aiDecisionEngine(workload: {
  cpu_usage?: number | null;
  memory_usage?: number | null;
  cost?: number | null;
}): AiDecisionResult {
  const cpu = workload.cpu_usage ?? 0;
  const mem = workload.memory_usage ?? 0;
  const cost = workload.cost ?? 0;
  const risk = riskFor(cpu, mem, cost);

  if (cpu > 85) {
    return {
      action: "scale_up",
      reason: "CPU sustained above threshold",
      confidence: 0.93,
      risk,
      expectedImpact: "Lower queueing; latency expected ↓ after scale-out",
    };
  }
  if (cost > 1000) {
    return {
      action: "optimize_cost",
      reason: "High cost anomaly",
      confidence: 0.92,
      risk,
      expectedImpact: "Reduced spend; watch for latency if over-aggressive",
    };
  }
  if (mem > 90) {
    return {
      action: "restart",
      reason: "Memory pressure",
      confidence: 0.9,
      risk,
      expectedImpact: "Pod recycle; brief disruption possible",
    };
  }
  return { action: "none", reason: "stable", confidence: 0.7, risk: "low" };
}
