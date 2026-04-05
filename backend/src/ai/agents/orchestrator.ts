import OpenAI from "openai";
import { openai } from "../../config/openai";
import { getContext } from "../../services/context.service";
import { logsAgent } from "./logs.agent";
import { metricsAgent } from "./metrics.agent";
import { k8sAgent } from "./k8s.agent";
import { decisionAgent } from "./decision.agent";
import type { AgentBundle, TelemetrySnapshot } from "./types";

function emptyLogsReason(reason: string) {
  return {
    source: "loki-simulated" as const,
    summary: [] as string[],
    anomalies: [] as string[],
    queryTerms: [] as string[],
    error: reason,
  };
}

/** Collect log / metrics / K8s agent outputs (no LLM). */
export async function collectAgentBundle(query: string): Promise<AgentBundle> {
  const telemetry: TelemetrySnapshot = await getContext();

  const settled = await Promise.allSettled([
    logsAgent(query, telemetry),
    metricsAgent(query, telemetry),
    k8sAgent(query, telemetry),
  ]);

  const logs =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : emptyLogsReason(
          settled[0].reason instanceof Error
            ? settled[0].reason.message
            : "logsAgent failed"
        );

  const metrics =
    settled[1].status === "fulfilled"
      ? settled[1].value
      : {
          source: "prometheus-simulated" as const,
          cpuPercent: 0,
          memoryGb: 0,
          latencyMs: 0,
          cpuSpike: false,
          alerts: telemetry.alerts,
          error:
            settled[1].reason instanceof Error
              ? settled[1].reason.message
              : "metricsAgent failed",
        };

  const k8s =
    settled[2].status === "fulfilled"
      ? settled[2].value
      : {
          source: "cluster-simulated" as const,
          cluster: telemetry.cluster,
          activePods: telemetry.activePods,
          signals: ["k8sAgent failed — partial data"],
          unhealthySummary: [],
          error:
            settled[2].reason instanceof Error
              ? settled[2].reason.message
              : "k8sAgent failed",
        };

  return { logs, metrics, k8s, telemetry };
}

export async function orchestrate(
  query: string,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  client: OpenAI = openai
): Promise<AgentBundle & { synthesis: string }> {
  const bundle = await collectAgentBundle(query);
  const synthesis = await decisionAgent(query, bundle, history, client);
  return { ...bundle, synthesis };
}
