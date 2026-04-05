import { MetricsState } from "./types";
import { FeedbackResult } from "./feedback.engine";

/** Tunable weights for rule-based reward (foundation for future Q-learning). */
export const REWARD_WEIGHTS = {
  latencyReduction: 0.45,
  cpuReduction: 0.3,
  errorReduction: 0.2,
  costPenalty: 0.25,
};

export function computeReward(before: MetricsState, after: MetricsState, feedback: FeedbackResult): number {
  const bLat = Number(before.latency ?? 1);
  const aLat = Number(after.latency ?? bLat);
  const bCpu = Number(before.cpu ?? 1);
  const aCpu = Number(after.cpu ?? bCpu);
  const bErr = Number(before.errorRate ?? 0);
  const aErr = Number(after.errorRate ?? bErr);
  const bCost = Number(before.cost ?? 0);
  const aCost = Number(after.cost ?? bCost);

  const latR = bLat > 0 ? Math.max(0, (bLat - aLat) / bLat) : 0;
  const cpuR = bCpu > 0 ? Math.max(0, (bCpu - aCpu) / bCpu) : 0;
  const errR = bErr > 0 ? Math.max(0, (bErr - aErr) / bErr) : Math.max(0, bErr - aErr) * -0.1;
  const costInc = bCost > 0 ? Math.max(0, (aCost - bCost) / bCost) : aCost > bCost ? 0.1 : 0;

  const reward =
    latR * REWARD_WEIGHTS.latencyReduction +
    cpuR * REWARD_WEIGHTS.cpuReduction +
    errR * REWARD_WEIGHTS.errorReduction -
    costInc * REWARD_WEIGHTS.costPenalty;

  // Penalize explicit failure
  const penalty = feedback.result === "failure" ? -0.5 : feedback.result === "partial" ? -0.1 : 0;
  return Math.max(-1, Math.min(1, Number((reward + penalty).toFixed(4))));
}

export function explorationDraw(epsilon = 0.1): boolean {
  return Math.random() < epsilon;
}
