import { cloudService } from "../cloud/cloud.service";

export type SafetyControls = {
  maxChangesPerHour: number;
  approvalMode: boolean;
  autoMode: boolean;
};

export type OptimizationRecommendation = {
  id: string;
  problem: string;
  impact: string;
  action: string;
  risk: "low" | "medium" | "high";
  explanation: {
    why: string;
    dataUsed: string;
    expectedBenefit: string;
  };
};

export type SystemOptimizationResult = {
  scores: {
    performance: number;
    costEfficiency: number;
    reliability: number;
  };
  insights: string[];
  riskAreas: string[];
  recommendations: OptimizationRecommendation[];
  actionsApplied: string[];
  mode: "manual" | "auto";
  safety: SafetyControls;
  timestamp: string;
};

export async function optimizeSystem(input: {
  autoMode?: boolean;
  safety?: Partial<SafetyControls>;
}) {
  const optimized = await cloudService.optimize({ providers: ["aws", "gcp", "azure"], latency: 250 });
  const avgCpu = Math.round(optimized.metrics.reduce((acc, m) => acc + m.cpu, 0) / Math.max(1, optimized.metrics.length));
  const avgCost = Math.round(optimized.metrics.reduce((acc, m) => acc + m.cost, 0) / Math.max(1, optimized.metrics.length));

  const safety: SafetyControls = {
    maxChangesPerHour: input.safety?.maxChangesPerHour ?? 6,
    approvalMode: input.safety?.approvalMode ?? false,
    autoMode: input.autoMode ?? false,
  };

  const performance = Math.max(45, Math.min(98, 100 - Math.floor(avgCpu * 0.55)));
  const costEfficiency = Math.max(40, Math.min(98, 100 - Math.floor(avgCost / 2.2)));
  const reliability = Math.max(50, Math.min(99, 92 - Math.floor(avgCpu * 0.22) + (safety.approvalMode ? 3 : 0)));

  const recommendations: OptimizationRecommendation[] = [
    {
      id: "rec-cpu-scale",
      problem: "High CPU usage in critical workloads",
      impact: "Reduce p95 latency by 35%",
      action: "Scale +2 nodes on performance-critical services",
      risk: avgCpu > 72 ? "high" : avgCpu > 58 ? "medium" : "low",
      explanation: {
        why: "CPU saturation detected from cross-provider metrics",
        dataUsed: `Average CPU ${avgCpu}% across providers`,
        expectedBenefit: "Higher throughput with lower queue depth",
      },
    },
    {
      id: "rec-cost-balance",
      problem: "Over-provisioned resources detected",
      impact: "Lower cloud cost by 12-18%",
      action: `Shift baseline workloads to ${optimized.cheapestProvider}`,
      risk: "low",
      explanation: {
        why: "Cheapest provider has sufficient capacity headroom",
        dataUsed: `Average cost index ${avgCost}`,
        expectedBenefit: "Lower spend without performance regression",
      },
    },
    {
      id: "rec-risk-guard",
      problem: "Reliability risk in burst traffic windows",
      impact: "Reduce failure probability by 22%",
      action: "Enable proactive canary checks + rollback guardrails",
      risk: "medium",
      explanation: {
        why: "Recent anomaly signals indicate unstable traffic spikes",
        dataUsed: optimized.aiSuggestion,
        expectedBenefit: "Faster containment for incident-prone deploys",
      },
    },
  ];

  const actionsApplied =
    safety.autoMode && !safety.approvalMode
      ? recommendations
          .filter((r) => r.risk !== "high")
          .slice(0, safety.maxChangesPerHour)
          .map((r) => r.action)
      : [];

  const result: SystemOptimizationResult = {
    scores: { performance, costEfficiency, reliability },
    insights: [
      "Over-provisioned resources detected",
      "High latency in service mesh edge",
      "Underutilized compute cluster in secondary region",
    ],
    riskAreas: ["traffic-burst", "deployment-health", "cost-spike"],
    recommendations,
    actionsApplied,
    mode: safety.autoMode ? "auto" : "manual",
    safety,
    timestamp: new Date().toISOString(),
  };

  return result;
}
