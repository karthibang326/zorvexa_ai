import OpenAI from "openai";
import { openai } from "../../config/openai";
import type { AgentBundle } from "./types";
import { BRAND } from "../../shared/branding";

function formatHistorySnippet(history: OpenAI.Chat.ChatCompletionMessageParam[]): string {
  return history
    .slice(-6)
    .map((m) => {
      const role = m.role;
      const content =
        typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content ?? "");
      return `${role}: ${content.slice(0, 500)}`;
    })
    .join("\n");
}

export async function decisionAgent(
  query: string,
  bundle: AgentBundle,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  client: OpenAI = openai
): Promise<string> {
  const payload = {
    query,
    conversationTurns: formatHistorySnippet(history),
    agents: {
      logs: bundle.logs,
      metrics: bundle.metrics,
      k8s: bundle.k8s,
    },
    rawTelemetry: bundle.telemetry,
  };

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are ${BRAND.name} AI Copilot — a Staff+ SRE. You MUST only reason from the JSON user payload (logs, metrics, k8s, telemetry). Do not invent clusters, pods, or metrics not present there.

Correlate signals across agents: e.g. log errors + CPU + alerts + cluster snapshot.

Output format (exact section headers):
Insight: <one line>
Analysis: <multi-sentence, cite agent fields>
Root Cause: <hypothesis tied to evidence or "Insufficient data in snapshot" if gaps>
Impact: <user/system impact from evidence only>
Recommendation: <concrete next steps>
Actions: <operational summary>

If remediation is appropriate and you propose executing a built-in action, end your reply with a single JSON object on its own final line:
{"action":"restart_service"|"scale_deployment"|"purge_cache"}

Use restart_service when auth/upstream errors dominate; scale_deployment when CPU sustained high; purge_cache only if logs indicate cache-related issues. Omit the JSON if no automated action is justified.`,
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  return response.choices[0].message.content ?? "";
}
