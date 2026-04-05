import { env } from "../../config/env";

export type AutonomyModeName = "simulation" | "assisted" | "autonomous" | "legacy";

export type EffectiveAutonomyPolicies = {
  mode: AutonomyModeName;
  /** No real AWS/K8s calls */
  simulation: boolean;
  /** Human approval gate (queue) before execute */
  approvalRequired: boolean;
};

/**
 * Single knob: ASTRA_AUTONOMY_MODE = simulation | assisted | autonomous
 * If unset/empty, falls back to SIMULATION_MODE + ASTRA_APPROVAL_REQUIRED (legacy).
 */
export function getEffectiveAutonomyPolicies(): EffectiveAutonomyPolicies {
  const raw = (env.ASTRA_AUTONOMY_MODE ?? process.env.ASTRA_AUTONOMY_MODE ?? "").trim().toLowerCase();
  if (raw === "simulation") {
    return { mode: "simulation", simulation: true, approvalRequired: false };
  }
  if (raw === "assisted") {
    return { mode: "assisted", simulation: false, approvalRequired: true };
  }
  if (raw === "autonomous") {
    return { mode: "autonomous", simulation: false, approvalRequired: false };
  }
  return {
    mode: "legacy",
    simulation: env.SIMULATION_MODE === "true",
    approvalRequired: env.ASTRA_APPROVAL_REQUIRED === "true",
  };
}

/** In autonomous mode, high-risk actions still require approval (enterprise safety). */
export function requiresApprovalForDecision(
  policies: EffectiveAutonomyPolicies,
  action: string,
  risk: "low" | "medium" | "high"
): boolean {
  if (action === "none") return false;
  if (policies.approvalRequired) return true;
  if (policies.mode === "autonomous" && risk === "high") return true;
  return false;
}

export function shouldAwaitApproval(
  action: string,
  risk: "low" | "medium" | "high",
  approved: boolean | undefined,
  policies: EffectiveAutonomyPolicies
): boolean {
  if (action === "none") return false;
  if (approved) return false;
  if (policies.mode === "legacy") {
    return env.ASTRA_APPROVAL_REQUIRED === "true";
  }
  return requiresApprovalForDecision(policies, action, risk);
}

export function isSimulationEffective(policies: EffectiveAutonomyPolicies): boolean {
  if (policies.mode === "legacy") return env.SIMULATION_MODE === "true";
  return policies.simulation;
}
