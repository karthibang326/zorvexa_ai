import { env } from "../../config/env";
import type { DecisionResult } from "../ai-decision-engine/types";
import { getRecentSuccessRate } from "./learning.service";

/**
 * When historical success for this resource+action is below threshold, require explicit approval
 * (same break-glass as high-risk: AI_K8S_HIGH_RISK_APPROVED).
 */
export async function shouldBlockForLowLearningSuccess(
  decision: DecisionResult,
  resource: string
): Promise<{ blocked: boolean; reason?: string }> {
  if (decision.action === "none") return { blocked: false };
  if (env.AI_LEARNING_ENABLED !== "true") return { blocked: false };
  if (env.AI_LEARNING_LOW_SUCCESS_BLOCKS !== "true") return { blocked: false };

  const rate = await getRecentSuccessRate(resource, decision.action, 20, env.AI_LEARNING_ORG_ID);
  if (rate === null) return { blocked: false };
  if (rate >= env.AI_LEARNING_MIN_SUCCESS_RATE) return { blocked: false };
  if (env.AI_LEARNING_APPROVED === "true" || env.AI_K8S_HIGH_RISK_APPROVED === "true") return { blocked: false };

  return {
    blocked: true,
    reason: `Learning guard: recent success rate for ${decision.action} on ${resource} is ${(rate * 100).toFixed(0)}% (min ${(env.AI_LEARNING_MIN_SUCCESS_RATE * 100).toFixed(0)}%). Set AI_LEARNING_APPROVED=true to proceed.`,
  };
}
