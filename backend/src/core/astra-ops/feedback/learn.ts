import type { AiDecisionResult } from "../ai/engine";
import { feedbackLoop } from "./loop";

/** Maps verification outcome into confidence adjustment (ties to AgentExperience later). */
export function learnFromVerification(
  decision: Pick<AiDecisionResult, "action" | "reason" | "confidence">,
  verification: { success: boolean }
): { improvedConfidence: number } {
  return feedbackLoop(
    { action: decision.action, reason: decision.reason, confidence: decision.confidence },
    { success: verification.success }
  );
}
