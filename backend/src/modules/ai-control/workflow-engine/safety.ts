import type { WorkflowAiDecision, WorkflowAiMode, WorkflowExecutionContext } from "./types";

export function evaluateSafety(params: {
  mode: WorkflowAiMode;
  decision: WorkflowAiDecision;
  context: WorkflowExecutionContext;
}) {
  const { mode, decision, context } = params;

  const rateLimitBreached = context.maxActionsPerHour <= 0;
  if (rateLimitBreached) {
    return { allowed: false, requiresApproval: true, reason: "Rate limit reached" };
  }

  const highRisk = decision.risk === "HIGH";
  if (highRisk || context.approvalRequired) {
    return {
      allowed: mode === "manual",
      requiresApproval: true,
      reason: "High risk action requires approval",
    };
  }

  if (mode === "assist") {
    return { allowed: false, requiresApproval: false, reason: "Assist mode suggests but does not execute" };
  }

  return { allowed: true, requiresApproval: false, reason: "Safety policy passed" };
}
