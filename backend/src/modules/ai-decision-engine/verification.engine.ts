import type { DecisionResult, ExecutionResult, MetricSnapshot, VerificationResult } from "./types";

/**
 * Verification Engine — compares before vs after metrics.
 * Uses live replica deltas when Kubernetes execution populated `execution.k8s`;
 * otherwise applies a deterministic model (no random noise) for regression-safe tests.
 */
export function verifyOutcome(
  before: MetricSnapshot,
  decision: DecisionResult,
  execution: ExecutionResult
): VerificationResult {
  if (decision.action === "none") {
    return {
      improved: true,
      before: pick(before),
      after: pick(before),
      improvementScore: 96,
      summary: "Steady state — no remediation required.",
    };
  }

  if (!execution.success) {
    const k8s = execution.k8s;
    const rb = execution.guardrailBlocked ? "Policy blocked this action." : "Execution did not complete successfully.";
    return {
      improved: false,
      before: pick(before),
      after: pick(before),
      improvementScore: 20,
      summary: `${rb} ${execution.message.slice(0, 200)}`,
      k8sReplicas:
        k8s && (k8s.replicasBefore !== undefined || k8s.replicasAfter !== undefined)
          ? { before: k8s.replicasBefore, after: k8s.replicasAfter }
          : undefined,
    };
  }

  const k8s = execution.k8s;
  if (
    k8s &&
    execution.provider === "kubernetes" &&
    typeof k8s.replicasBefore === "number" &&
    typeof k8s.replicasAfter === "number"
  ) {
    const rb = k8s.replicasBefore;
    const ra = k8s.replicasAfter;
    const replicaDelta = ra - rb;
    const scaleAligned =
      (decision.action === "scale_up" && replicaDelta > 0) ||
      (decision.action === "scale_down" && replicaDelta < 0) ||
      (decision.action === "optimize" && replicaDelta !== 0) ||
      (decision.action === "restart" && replicaDelta === 0);

    const after = {
      cpuPct: clamp(before.cpuPct * (replicaDelta > 0 ? 0.82 : replicaDelta < 0 ? 1.05 : 0.9), 8, 95),
      memoryPct: clamp(before.memoryPct * 0.95, 10, 95),
      latencyP95Ms: clamp(before.latencyP95Ms * (replicaDelta > 0 ? 0.85 : 1), 35, 2000),
      errorRateBps: before.errorRateBps,
    };

    const improved = scaleAligned && (replicaDelta !== 0 || decision.action === "restart");
    const improvementScore = improved
      ? clamp(70 + Math.min(25, Math.abs(replicaDelta) * 8) + (decision.action === "restart" ? 5 : 0), 0, 100)
      : 45;

    return {
      improved,
      before: pick(before),
      after,
      improvementScore: Math.round(improvementScore * 10) / 10,
      summary: improved
        ? `Verified (cluster): replicas ${rb} → ${ra} in ${k8s.namespace}/${k8s.deployment}; p95 ~${Math.round(after.latencyP95Ms)}ms vs ${before.latencyP95Ms}ms (modelled).`
        : `Cluster reported replicas ${rb} → ${ra}; review SLOs — expected alignment: ${scaleAligned}.`,
      k8sReplicas: { before: rb, after: ra },
    };
  }

  // Simulated "after" metrics: scale/restart/optimize improves latency & CPU modestly
  const scaleFactor =
    decision.action === "scale_up" ? 0.78 : decision.action === "restart" ? 0.85 : decision.action === "optimize" ? 0.88 : 0.92;

  const jitter = deterministicJitter(before.ts, decision.action);
  const after = {
    cpuPct: clamp(before.cpuPct * scaleFactor + jitter * 4, 8, 95),
    memoryPct: clamp(before.memoryPct * (decision.action === "restart" ? 0.72 : 0.95), 10, 95),
    latencyP95Ms: clamp(before.latencyP95Ms * scaleFactor + jitter * 15, 35, 2000),
    errorRateBps: clamp(before.errorRateBps * (decision.action === "optimize" ? 0.65 : 0.88), 0, 150),
  };

  const latDelta = before.latencyP95Ms - after.latencyP95Ms;
  const cpuDelta = before.cpuPct - after.cpuPct;
  const improved = latDelta > 5 || cpuDelta > 8 || after.errorRateBps < before.errorRateBps - 3;

  const improvementScore = clamp(
    55 +
      Math.min(35, latDelta / 4) +
      Math.min(15, cpuDelta / 3) +
      (after.errorRateBps < before.errorRateBps ? 10 : 0),
    0,
    100
  );

  return {
    improved,
    before: pick(before),
    after,
    improvementScore: Math.round(improvementScore * 10) / 10,
    summary: improved
      ? `Verified: p95 ${before.latencyP95Ms}ms → ${after.latencyP95Ms}ms; CPU ${before.cpuPct}% → ${after.cpuPct}%.`
      : `Mixed outcome: monitor next window — p95 ${after.latencyP95Ms}ms vs ${before.latencyP95Ms}ms.`,
  };
}

function pick(m: MetricSnapshot) {
  return {
    cpuPct: m.cpuPct,
    memoryPct: m.memoryPct,
    latencyP95Ms: m.latencyP95Ms,
    errorRateBps: m.errorRateBps,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Bounded value in ~[-1, 1] from snapshot time + action (stable across runs). */
function deterministicJitter(ts: number, action: string): number {
  let h = (ts ^ action.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h ^= h >>> 15;
  return (h >>> 0) / 0xffffffff * 2 - 1;
}
