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
    // 1. STATISTICAL DETECTION (Deterministic, FAANG-grade)
    let isAnomaly = false;
    let statReason = "";
    const errorRate = Number(input.metrics.errorRate ?? 0);
    const cpuUsage = Number(input.metrics.cpuUsage ?? 0);
    const p95Latency = Number(input.metrics.p95Latency ?? input.metrics.latency ?? 0);

    if (errorRate > 0.05) {
      isAnomaly = true;
      statReason = `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds 5% threshold.`;
    } else if (cpuUsage > 85) {
      isAnomaly = true;
      statReason = `CPU usage (${cpuUsage}%) exceeds 85% threshold.`;
    } else if (p95Latency > 1000) {
      isAnomaly = true;
      statReason = `P95 Latency (${p95Latency}ms) exceeds 1000ms SLA.`;
    }

    if (!isAnomaly) {
      return { anomaly: false, reason: "Metrics within normal statistical bounds.", suggestion: "No action required." };
    }

    // 2. LLM EXPLANATION ONLY (Separating Decision from Execution)
    let suggestion = "Take preventative action: scale deployments or investigate metrics.";
    let llmExplanation = statReason;
    
    try {
      const explanationPrompt = `An anomaly was deterministically detected by the policy engine: ${statReason}. Given the metrics ${JSON.stringify(input.metrics)}, provide a 1-sentence operational suggestion and a 1-sentence explanation. Return exactly JSON: { "suggestion": "...", "explanation": "..." }`;
      const text = await callLLM(explanationPrompt, { timeoutMs: 8_000 });
      const parsed = safeJsonParse<{ suggestion: string; explanation: string }>(text);
      if (parsed.ok && parsed.value.suggestion && parsed.value.explanation) {
        suggestion = parsed.value.suggestion;
        llmExplanation = parsed.value.explanation;
      }
    } catch {
      // Graceful fallback during LLM hallucinations or timeouts
    }

    const result: AnomalyResult = {
      anomaly: true,
      reason: llmExplanation,
      suggestion,
    };

    if (usePrismaPersistence()) {
      try {
        await prisma.aIInsight.create({
          data: {
            runId: input.runId,
            workflowId: input.workflowId,
            type: "ANOMALY",
            result: {
              ...result,
              auditLog: {
                inputMetrics: input.metrics,
                llmExplanation,
                policyDecision: isAnomaly ? "DETECTED_ANOMALY" : "STABLE",
              }
            } as any,
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

