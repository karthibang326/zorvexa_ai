import { prisma } from "../../lib/prisma";
import { usePrismaPersistence } from "../../lib/prisma-env";
import { callLLM, safeJsonParse } from "../../lib/llm";
import { analysisPrompt, anomalyPrompt, generationPrompt } from "./ai.prompts";
import { publishAssistantEvent, publishWorkflowAiEvent } from "./ai.stream";
import { autonomousEngine } from "../autonomous/autonomous-engine.service";
import { realtimeService } from "../realtime/realtime.service";

export type AiRisk = "LOW" | "MEDIUM" | "HIGH";

export interface AnalyzeResult {
  optimizations: string[];
  latencyReduction: string;
  risk: AiRisk;
}

export interface GenerateResult {
  nodes: unknown[];
  edges: unknown[];
}

export interface AnomalyResult {
  anomaly: boolean;
  reason: string;
  suggestion: string;
}

export interface AssistantChatInput {
  message: string;
  sessionId?: string;
  context?: {
    workflowId?: string | null;
    runId?: string | null;
    deploymentStatus?: string | null;
    activeTab?: string | null;
  };
}

export const aiCopilotService = {
  async analyzeWorkflow(input: { nodes: unknown[]; edges: unknown[]; workflowId?: string }) {
    const fallback: AnalyzeResult = {
      optimizations: ["Consider batching sequential steps into a single worker to reduce overhead."],
      latencyReduction: "0ms",
      risk: "LOW",
    };

    let result: AnalyzeResult = fallback;
    try {
      const text = await callLLM(analysisPrompt(input.nodes, input.edges), { timeoutMs: 10_000 });
      const parsed = safeJsonParse<AnalyzeResult>(text);
      if (parsed.ok && Array.isArray(parsed.value.optimizations)) result = parsed.value;
    } catch {
      // fallback
    }

    if (input.workflowId) {
      // Best-effort persistence (tests/dev may not have DATABASE_URL).
      if (usePrismaPersistence()) {
        try {
          await prisma.aIInsight.create({
            data: {
              workflowId: input.workflowId,
              type: "ANALYSIS",
              result: result as any,
            },
          });
        } catch {
          // ignore
        }
      }
      publishWorkflowAiEvent(input.workflowId, { type: "ai.analysis", workflowId: input.workflowId, result });
    }

    return result;
  },

  async generateWorkflow(input: { prompt: string }) {
    const fallback: GenerateResult = {
      nodes: [
        { id: "trigger", type: "K8S", label: "Trigger" },
        { id: "scale", type: "K8S", label: "Scale pods" },
      ],
      edges: [{ source: "trigger", target: "scale" }],
    };

    try {
      const text = await callLLM(generationPrompt(input.prompt), { timeoutMs: 12_000 });
      const parsed = safeJsonParse<GenerateResult>(text);
      if (parsed.ok && Array.isArray(parsed.value.nodes) && Array.isArray(parsed.value.edges)) return parsed.value;
      return fallback;
    } catch {
      return fallback;
    }
  },

  async detectAnomaly(input: { metrics: Record<string, unknown>; runId?: string; workflowId?: string }) {
    const fallback: AnomalyResult = {
      anomaly: true,
      reason: "Potential anomaly detected (AI unavailable)",
      suggestion: "Review recent changes and scale critical workers if needed.",
    };

    let result: AnomalyResult = fallback;
    try {
      const text = await callLLM(anomalyPrompt(input.metrics), { timeoutMs: 8_000 });
      const parsed = safeJsonParse<AnomalyResult>(text);
      if (parsed.ok && typeof parsed.value.anomaly === "boolean") result = parsed.value;
    } catch {
      // fallback
    }

    if (usePrismaPersistence()) {
      try {
        await prisma.aIInsight.create({
          data: {
            runId: input.runId,
            workflowId: input.workflowId,
            type: "ANOMALY",
            result: result as any,
          },
        });
      } catch {
        // ignore
      }
    }

    return result;
  },

  async chat(input: AssistantChatInput) {
    const sessionId = input.sessionId ?? "default-session";
    realtimeService.appendChat(sessionId, {
      role: "user",
      content: input.message,
    });
    const mappedAction = realtimeService.mapCommandToAction(input.message);
    if (mappedAction) {
      realtimeService.publish({
        channel: "ai_actions",
        title: mappedAction.type,
        detail: `${mappedAction.reason} (${mappedAction.status})`,
        metadata: { sessionId, command: input.message },
      });
    }

    const fallback = "I can help with reliability, deployment, scaling, and cost optimization. Share a target service and desired outcome.";
    const contextText = JSON.stringify(input.context ?? {});
    let response = fallback;
    try {
      response = await callLLM(
        [
          "You are Zorvexa AI for cloud operations.",
          "Answer concisely with actionable steps.",
          `Context: ${contextText}`,
          `User: ${input.message}`,
        ].join("\n"),
        { timeoutMs: 12_000 }
      );
    } catch {
      response = fallback;
    }

    const decision = autonomousEngine.buildCopilotDecision({
      message: input.message,
      activeTab: input.context?.activeTab ?? null,
    });
    const decisionText = [
      "",
      "Problem:",
      decision.problem,
      "",
      "Root Cause:",
      decision.rootCause,
      "",
      "Impact:",
      decision.impact,
      "",
      "Action Plan:",
      decision.actionPlan,
      "",
      `Confidence: ${Math.round(decision.confidence * 100)}%`,
    ].join("\n");
    response = `${response}\n${decisionText}`;
    autonomousEngine.ingestSignal("logs", {
      source: "copilot_chat",
      activeTab: input.context?.activeTab ?? "unknown",
      confidence: decision.confidence,
    });

    const payload = {
      type: "assistant.reply",
      sessionId,
      message: input.message,
      response,
      mappedAction,
      context: input.context ?? {},
      ts: Date.now(),
    };
    realtimeService.appendChat(sessionId, {
      role: "assistant",
      content: response,
    });
    realtimeService.publish({
      channel: "logs",
      title: "copilot.reply",
      detail: `Copilot responded in ${input.context?.activeTab ?? "dashboard"} context`,
      metadata: { sessionId },
    });
    publishAssistantEvent(payload);
    return payload;
  },
};

