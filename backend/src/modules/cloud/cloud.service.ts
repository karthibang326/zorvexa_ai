import { aiCopilotService } from "../ai-copilot/ai.service";
import { awsAdapter } from "./adapters/aws.adapter";
import { azureAdapter } from "./adapters/azure.adapter";
import { gcpAdapter } from "./adapters/gcp.adapter";
import { CloudAdapter, CloudMetrics, CloudOperationParams, CloudProvider } from "./cloud.types";

export function getAdapter(provider: CloudProvider): CloudAdapter {
  switch (provider) {
    case "aws":
      return awsAdapter;
    case "gcp":
      return gcpAdapter;
    case "azure":
      return azureAdapter;
    default:
      throw new Error(`Unsupported provider: ${provider satisfies never}`);
  }
}

export const cloudService = {
  getAdapter,

  async execute(params: CloudOperationParams & { operation: "scaleDeployment" | "restartService" | "deployWorkflow" }) {
    const adapter = getAdapter(params.provider);
    if (params.operation === "scaleDeployment") return adapter.scaleDeployment(params);
    if (params.operation === "restartService") return adapter.restartService(params);
    return adapter.deployWorkflow(params);
  },

  async metrics(provider?: CloudProvider): Promise<CloudMetrics[]> {
    if (provider) {
      const m = await getAdapter(provider).getMetrics({ provider });
      return [m];
    }
    return Promise.all([
      awsAdapter.getMetrics({ provider: "aws" }),
      gcpAdapter.getMetrics({ provider: "gcp" }),
      azureAdapter.getMetrics({ provider: "azure" }),
    ]);
  },

  async optimize(params: { latency?: number; providers?: CloudProvider[] }) {
    const providers = params.providers && params.providers.length ? params.providers : (["aws", "gcp", "azure"] as CloudProvider[]);
    const metrics = await Promise.all(providers.map((p) => getAdapter(p).getMetrics({ provider: p })));
    const cheapest = metrics.slice().sort((a, b) => a.cost - b.cost)[0];
    const fastest = metrics.slice().sort((a, b) => a.cpu - b.cpu)[0];

    const ai = await aiCopilotService.detectAnomaly({
      metrics: {
        cloudCosts: metrics.map((m) => ({ provider: m.provider, cost: m.cost })),
        cloudCpu: metrics.map((m) => ({ provider: m.provider, cpu: m.cpu })),
      },
    });

    return {
      recommendation: `Move workload to ${cheapest.provider} for lower cost; prefer ${fastest.provider} for lower utilization.`,
      cheapestProvider: cheapest.provider,
      fastestProvider: fastest.provider,
      aiSuggestion: ai.suggestion,
      metrics,
    };
  },
};

