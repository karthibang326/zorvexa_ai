import { runAllAgents } from "./agents";
import { memoryService } from "./memory.service";
import { explorationDraw } from "./learning.engine";
import { checkPolicy } from "./policy";
import { MetricsState, OpsScope } from "./types";

export async function orchestrateDecision(params: {
  state: MetricsState;
  scope: OpsScope;
  manualApproval: boolean;
  explorationEpsilon?: number;
}) {
  const { state, scope, manualApproval } = params;
  const eps = params.explorationEpsilon ?? 0.1;
  const agents = runAllAgents(state);
  const failed = await memoryService.getFailedActions(scope);
  const similar = await memoryService.findSimilarExperiences(scope, state, 8);
  const bestHistorical = await memoryService.getBestHistoricalAction(scope, state);

  let candidate = agents.sre.structured.action;
  let reason = "SRE agent primary recommendation.";
  let confidence = agents.sre.confidence;

  if (bestHistorical && !failed.has(bestHistorical.action)) {
    if (bestHistorical.avgReward > 0.35 && bestHistorical.action !== candidate) {
      candidate = bestHistorical.action;
      reason = `Memory: historically highest average reward (${bestHistorical.avgReward}) for similar states.`;
      confidence = Math.min(0.95, confidence + 0.05);
    }
  }

  if (failed.has(candidate)) {
    candidate = agents.cost.structured.action === "defer_scale_or_rightsizing" ? "rightsizing_review" : "observe";
    reason = "Prior strategy underperformed in memory — switching to safer path.";
    confidence *= 0.85;
  }

  const explore = explorationDraw(eps);
  if (explore && candidate === "scale_replicas") {
    candidate = "canary_scale";
    reason += " Exploration: trying canary_scale variant.";
  }

  const risk = agents.sre.structured.risk;
  const estCost = agents.cost.structured.estimatedCostDeltaPct;
  const policy = checkPolicy({
    action: candidate,
    proposedReplicas: candidate.includes("scale") ? 10 : undefined,
    estimatedCostDeltaPct: estCost,
    risk,
    manualApproval,
  });

  return {
    decision: candidate,
    reason,
    confidence: Number(confidence.toFixed(3)),
    agents: {
      sre: agents.sre,
      cost: agents.cost,
      security: agents.security,
    },
    memory: {
      similarExperiences: similar,
      bestHistorical,
      blockedStrategies: Array.from(failed),
    },
    exploration: explore,
    policy,
  };
}
