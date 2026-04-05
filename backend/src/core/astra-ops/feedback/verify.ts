import type { AiDecisionResult } from "../ai/engine";

export type ExecutorWorkloadSignals = {
  cpu_usage?: number | null;
  memory_usage?: number | null;
  latency_ms?: number | null;
};

/**
 * Post-action verification from observed workload signals (CPU / memory / latency).
 * For cluster-level read-after-write, use `verification.engine` in the AI decision pipeline.
 */
export function verifyOutcome(
  workload: ExecutorWorkloadSignals,
  decision: Pick<AiDecisionResult, "action">
): { success: boolean; latencyImproved: boolean; notes: string } {
  const cpu = Number(workload.cpu_usage ?? 0);
  const mem = Number(workload.memory_usage ?? 0);
  const lat = workload.latency_ms;

  if (decision.action === "none") {
    return { success: true, latencyImproved: true, notes: "no_action" };
  }
  if (decision.action === "scale_up") {
    const latOk = typeof lat !== "number" || lat <= 0 || lat < 400;
    const success = cpu < 70 && mem < 88 && latOk;
    return {
      success,
      latencyImproved: success,
      notes: success ? "cpu_memory_latency_normalized_after_scale" : "pressure_or_latency_still_elevated",
    };
  }
  if (decision.action === "optimize_cost" || decision.action === "optimize") {
    return { success: true, latencyImproved: false, notes: "cost_action_applied" };
  }
  if (decision.action === "restart") {
    const success = mem < 92;
    return {
      success,
      latencyImproved: success,
      notes: success ? "rollout_restarted" : "memory_still_critical_after_restart",
    };
  }
  return { success: true, latencyImproved: true, notes: "generic_ok" };
}
