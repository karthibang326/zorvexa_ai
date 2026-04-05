import { AstraPlugin } from "../plugin.types";
import { selfHealingService } from "../../self-healing/self-healing.service";

const aiAgentRemediatorPlugin: AstraPlugin = {
  name: "ai-agent-remediator",
  async init(_config: Record<string, unknown>) {
    // Future: bootstrap external AI policy bundle.
  },
  hooks: {
    async onIncident(data) {
      const deploymentName = String(data?.deploymentName ?? "api-gateway");
      await selfHealingService.trigger({
        source: "ANOMALY",
        workflowId: String(data?.workflowId ?? "plugin-workflow"),
        runId: data?.runId ? String(data.runId) : undefined,
        deploymentName,
        namespace: String(data?.namespace ?? "prod"),
        provider: "aws",
        metrics: {
          cpu: Number(data?.cpu ?? 82),
          memory: Number(data?.memory ?? 74),
          cost: Number(data?.cost ?? 0),
        },
      });
    },
  },
};

export default aiAgentRemediatorPlugin;

