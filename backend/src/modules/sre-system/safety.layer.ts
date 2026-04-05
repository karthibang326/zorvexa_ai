import { SreActionPlan } from "./sre-system.types";

export function checkSafety(params: {
  plan: SreActionPlan;
  aiCeoModeEnabled: boolean;
  approvalRequired: boolean;
  maxActionsPerHour: number;
  actionsInLastHour: number;
}) {
  if (params.actionsInLastHour >= params.maxActionsPerHour) {
    return { allowed: false, reason: "rate_limited", approvalRequired: true };
  }
  if (!params.aiCeoModeEnabled) {
    return { allowed: false, reason: "ai_ceo_mode_disabled", approvalRequired: true };
  }
  const risky = params.plan.riskScore >= 0.75 || params.plan.action === "block_ip";
  if (params.approvalRequired || risky) {
    return { allowed: false, reason: "manual_approval_required", approvalRequired: true };
  }
  return { allowed: true, reason: "allowed", approvalRequired: false };
}

