import { aiCopilotService } from "../ai-copilot/ai.service";
import { NormalizedCostRecord } from "./cost-collector";

export async function optimizeCost(records: NormalizedCostRecord[]) {
  const byProvider = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.provider] = (acc[r.provider] ?? 0) + r.cost;
    return acc;
  }, {});

  const ai = await aiCopilotService.detectAnomaly({
    metrics: {
      costByProvider: byProvider,
      usageSignals: "multi-cloud workload",
    },
  });

  const sorted = Object.entries(byProvider).sort((a, b) => a[1] - b[1]);
  const cheapest = sorted[0]?.[0] ?? "gcp";
  return {
    suggestions: [
      `Move workload to ${cheapest} (estimated cheaper)`,
      "Reduce idle nodes",
      ai.suggestion,
    ],
  };
}

