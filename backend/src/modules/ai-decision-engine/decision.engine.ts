import type {
  DecisionResult,
  DetectionResult,
  MetricSnapshot,
  ActionKind,
  RiskLevel,
  LearningHints,
} from "./types";
import { resolveAiTargetProvider } from "../multi-cloud/ai-target-provider";
import { env } from "../../config/env";

function riskFromSignals(has: boolean, critical: boolean): RiskLevel {
  if (!has) return "LOW";
  return critical ? "HIGH" : "MEDIUM";
}

function confidenceFor(action: ActionKind, critical: boolean): number {
  const base =
    action === "restart" ? 0.74 : action === "scale_up" ? 0.81 : action === "scale_down" ? 0.77 : 0.72;
  return Math.min(0.96, critical ? base + 0.06 : base);
}

/** Uses rolling success from `ai_learning` (per action) to scale confidence — closed loop: store → analyze → adapt. */
function applyLearningToConfidence(base: number, action: ActionKind, hints: LearningHints | undefined): number {
  if (!hints || env.AI_LEARNING_ENABLED !== "true") return base;
  const n = hints.sampleSizeByAction[action] ?? 0;
  if (n < env.AI_LEARNING_MIN_SAMPLES) return base;
  const sr = hints.successRateByAction[action];
  if (typeof sr !== "number") return base;
  const factor = 0.72 + 0.28 * sr;
  return Math.min(0.96, Math.max(0.22, base * factor));
}

/**
 * Decision Engine — maps anomaly patterns to actions with confidence & risk.
 * Optional `learningHints` adjusts confidence from `ai_learning` historical success rates.
 */
export function decide(
  detection: DetectionResult,
  m: MetricSnapshot,
  learningHints?: LearningHints
): DecisionResult {
  const provider = resolveAiTargetProvider(m);

  if (!detection.hasAnomaly) {
    return {
      action: "none",
      confidence: 0.91,
      risk: "LOW",
      reason: "No threshold breaches; maintain observe-only posture.",
      detail: "Continue sampling metrics; no mutating change recommended.",
      provider,
    };
  }

  const critical = detection.signals.some((s) => s.severity === "critical");
  const kinds = new Set(detection.signals.map((s) => s.kind));

  let action: ActionKind = "scale_up";
  let reason = "Horizontal scale to absorb load";
  let detail = "Add replicas to spread CPU/latency pressure.";
  let targetReplicas: number | undefined = 3;

  if (kinds.has("memory") && m.memoryPct >= 85 && !kinds.has("latency")) {
    action = "restart";
    reason = "Memory pressure isolated to workload — bounded restart before OOM";
    detail = "Rolling restart of unhealthy pods with maxUnavailable guard.";
    targetReplicas = undefined;
  } else if (kinds.has("latency") && m.latencyP95Ms >= 300 && kinds.has("cpu")) {
    action = "scale_up";
    targetReplicas = critical ? 5 : 4;
    reason = "Coupled CPU + latency regression — capacity expansion first";
    detail = `Target ${targetReplicas} replicas; validate p95 after warm-up.`;
  } else if (kinds.has("errors") && !kinds.has("cpu")) {
    action = "optimize";
    reason = "Error budget burn without CPU saturation — tune timeouts / deps";
    detail = "Circuit-breaker and dependency hedging (simulation).";
    targetReplicas = undefined;
  } else if (kinds.has("cpu")) {
    action = "scale_up";
    targetReplicas = critical ? 6 : 4;
    reason = "CPU saturation — scale out per HPA-style policy";
    detail = `Scale deployment toward ${targetReplicas} replicas (simulated).`;
  }

  const baseConf = confidenceFor(action, critical);
  const confidence = applyLearningToConfidence(baseConf, action, learningHints);
  const learningAdjusted = Math.abs(confidence - baseConf) > 0.004;

  return {
    action,
    confidence,
    risk: riskFromSignals(true, critical),
    reason,
    detail,
    targetReplicas,
    provider,
    learningAdjusted,
  };
}
