import OpenAI from "openai";
import {
  devOpenAiKeyFromRequest,
  openAiConfigurationError,
  openai,
} from "../config/openai";
import { demoSynthesis } from "../ai/agents/demoSynthesis";
import { collectAgentBundle, orchestrate } from "../ai/agents/orchestrator";
import { memoryService } from "./memory.service";
import { executeAction } from "./action.service";

export async function handleCopilot(
  sessionId: string,
  message: string,
  options?: { openaiApiKey?: string }
) {
  memoryService.add(sessionId, { role: "user", content: message });
  const history = memoryService.get(sessionId);

  const devKey = devOpenAiKeyFromRequest(options?.openaiApiKey ?? null);
  const llmClient = devKey ? new OpenAI({ apiKey: devKey }) : openai;

  const missingOpenAi = devKey ? null : openAiConfigurationError();

  const { telemetry, logs, metrics, k8s, synthesis } = missingOpenAi
    ? await (async () => {
        const bundle = await collectAgentBundle(message);
        return {
          ...bundle,
          synthesis: demoSynthesis(message, bundle),
        };
      })()
    : await orchestrate(message, history, llmClient);

  let rawReply = synthesis;
  let finalReply = rawReply;
  let actionResults: string | null = null;

  if (!missingOpenAi) {
    try {
      const jsonMatch = rawReply.match(
        /\{[\s\S]*?"action":\s*?"(.*?)"[\s\S]*?\}/
      );
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { action?: string };
        if (parsed.action) {
          const result = await executeAction(parsed.action);
          actionResults = typeof result === "string" ? result : String(result);
          finalReply = `${rawReply.replace(jsonMatch[0], "").trim()}\n\n[SYSTEM EXECUTION]: ${actionResults}`;
        }
      }
    } catch (e) {
      console.error("Agentic Parsing Error:", e);
    }
  }

  memoryService.add(sessionId, { role: "assistant", content: finalReply });

  return {
    reply: finalReply,
    sessionId,
    context: telemetry,
    actionTaken: actionResults,
    agents: { logs, metrics, k8s },
    demoMode: Boolean(missingOpenAi),
    keySource:
      devKey ? ("dev_session" as const)
      : missingOpenAi ? ("none" as const)
      : ("env" as const),
  };
}
