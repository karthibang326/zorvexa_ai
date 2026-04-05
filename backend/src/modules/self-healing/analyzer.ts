import { aiCopilotService } from "../ai-copilot/ai.service";

export interface AnalyzerInput {
  runId?: string;
  workflowId?: string;
  metrics: Record<string, unknown>;
  reasons: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface AnalyzerResult {
  rootCause: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  suggestedActions: string[];
}

export async function analyzerService(input: AnalyzerInput): Promise<AnalyzerResult> {
  const ai = await aiCopilotService.detectAnomaly({
    runId: input.runId,
    workflowId: input.workflowId,
    metrics: { ...input.metrics, reasons: input.reasons, severity: input.severity },
  });

  return {
    rootCause: ai.reason || input.reasons.join("; ") || "Unknown anomaly",
    severity: input.severity,
    suggestedActions: [ai.suggestion].filter(Boolean),
  };
}

