import { MetricsState } from "./types";

export type PolicyConfig = {
  maxReplicas: number;
  maxCostDeltaPct: number;
  requireApprovalRisk: "high" | "medium" | "low";
};

const defaultPolicy: PolicyConfig = {
  maxReplicas: 20,
  maxCostDeltaPct: 35,
  requireApprovalRisk: "high",
};

export function checkPolicy(params: {
  action: string;
  proposedReplicas?: number;
  estimatedCostDeltaPct?: number;
  risk: "low" | "medium" | "high";
  manualApproval: boolean;
}): { allowed: boolean; reason: string; requiresApproval: boolean } {
  const p = defaultPolicy;
  if (params.proposedReplicas != null && params.proposedReplicas > p.maxReplicas) {
    return { allowed: false, reason: `Replica cap ${p.maxReplicas}`, requiresApproval: true };
  }
  if (
    params.estimatedCostDeltaPct != null &&
    params.estimatedCostDeltaPct > p.maxCostDeltaPct &&
    params.action.includes("scale")
  ) {
    return { allowed: false, reason: "Cost delta exceeds policy threshold", requiresApproval: true };
  }
  const requiresApproval =
    params.risk === "high" ||
    (params.risk === "medium" && p.requireApprovalRisk === "medium");
  if (requiresApproval && !params.manualApproval) {
    return { allowed: false, reason: "High-risk action requires approval", requiresApproval: true };
  }
  return { allowed: true, reason: "Policy OK", requiresApproval: false };
}

export function stateStressScore(s: MetricsState): number {
  const c = (Number(s.cpu ?? 0) / 100) ** 2;
  const l = (Number(s.latency ?? 0) / 800) ** 2;
  const e = (Number(s.errorRate ?? 0) / 10) ** 2;
  return Math.sqrt(c + l + e);
}
