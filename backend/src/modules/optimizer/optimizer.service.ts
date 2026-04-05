import { cloudService } from "../cloud/cloud.service";

export async function optimizeCostPerformance(input: {
  latencyTargetMs?: number;
  providers?: Array<"aws" | "gcp" | "azure">;
}) {
  const out = await cloudService.optimize({
    latency: input.latencyTargetMs ?? 250,
    providers: (input.providers as any) ?? ["aws", "gcp", "azure"],
  });

  return {
    scaleRecommendation: out.fastestProvider === out.cheapestProvider ? "keep current replica plan" : "split critical traffic to fastest provider",
    cloudSwitchSuggestion: `consider switching baseline workloads to ${out.cheapestProvider}`,
    aiSuggestion: out.aiSuggestion,
    metrics: out.metrics,
  };
}

