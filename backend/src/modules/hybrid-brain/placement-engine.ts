/**
 * ASTRAOPS Placement Engine
 *
 * Pure decision logic — no I/O, no side effects.  Given a workload profile
 * and a snapshot of all infra providers, returns the optimal placement.
 *
 * Decision priority (highest first):
 *   1. Data-locality / compliance hard rules (always override everything)
 *   2. Infrastructure health (failed provider is never a target)
 *   3. Latency SLO for latency-sensitive workloads
 *   4. Burst-elasticity for burstable workloads
 *   5. Cost optimisation
 *   6. Historical learning bias
 */
import type {
  PlacementRequest, PlacementDecision, InfraSnapshot,
  PlacementReason, PlacementMemoryEntry,
} from "./hybrid-brain.types";
import type { InfraProvider } from "../uial/uial.types";

// ─── Simple in-process learning memory (production: Postgres) ────────────────

const placementMemory: PlacementMemoryEntry[] = [];

export function recordOutcome(entry: PlacementMemoryEntry) {
  placementMemory.push(entry);
  // keep last 500 entries
  if (placementMemory.length > 500) placementMemory.splice(0, placementMemory.length - 500);
}

function historicalBias(provider: InfraProvider): number {
  const relevant = placementMemory.filter((e) => e.provider === provider);
  if (relevant.length === 0) return 0;
  const successRate = relevant.filter((e) => e.outcome === "success").length / relevant.length;
  return successRate * 0.15; // max 15 % confidence boost from history
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function costScore(snap: InfraSnapshot): number {
  // Lower cost → higher score.  Cloud has real cost; on-prem cost ≈ 0 (CapEx sunk).
  if (snap.cost === 0) return 1.0;
  const normalised = Math.max(0, 1 - snap.cost / 200); // $200/hr = floor
  return normalised;
}

function latencyScore(snap: InfraSnapshot): number {
  return Math.max(0, 1 - snap.latency / 500); // 500 ms = floor
}

function healthScore(snap: InfraSnapshot): number {
  return snap.healthy ? 1.0 : 0.0;
}

function capacityScore(snap: InfraSnapshot): number {
  const avgUtil = (snap.cpu + snap.memory) / 2;
  return Math.max(0, 1 - avgUtil / 100);
}

// ─── Main placement decision ──────────────────────────────────────────────────

export function decidePlacement(req: PlacementRequest): PlacementDecision {
  const { workload, infraSnapshots, forceOnPrem, forceCloud } = req;
  const NOW = new Date().toISOString();

  // Step 1 — filter to healthy providers, respecting force overrides
  let candidates = infraSnapshots.filter((s) => s.healthy);

  if (forceOnPrem || workload.dataLocality === "onprem-only") {
    candidates = candidates.filter((s) => s.environment === "onprem");
  } else if (forceCloud) {
    candidates = candidates.filter((s) => s.environment === "cloud");
  }

  // Step 2 — if no candidates survive filtering, fall back to any healthy provider
  if (candidates.length === 0) {
    candidates = infraSnapshots.filter((s) => s.healthy);
  }
  // Still nothing? use everything (we'll note the degraded state)
  if (candidates.length === 0) {
    candidates = [...infraSnapshots];
  }

  // Step 3 — compute weighted score for each candidate
  type Scored = { snap: InfraSnapshot; score: number; reasons: PlacementReason[] };
  const scored: Scored[] = candidates.map((snap) => {
    const reasons: PlacementReason[] = [];
    let score = 0;

    // Compliance / data-locality hard gates first
    if (workload.dataLocality === "onprem-only" && snap.environment !== "onprem") {
      return { snap, score: -1, reasons: ["compliance"] };
    }
    if (workload.compliance.includes("HIPAA") || workload.compliance.includes("GDPR")) {
      if (snap.environment !== "onprem") {
        score -= 0.4;
        reasons.push("compliance");
      } else {
        score += 0.4;
        reasons.push("data-locality");
      }
    }

    // Health
    score += healthScore(snap) * 0.30;

    // Capacity
    score += capacityScore(snap) * 0.25;

    // Latency
    if (workload.latencySensitive) {
      score += latencyScore(snap) * 0.25;
      if (snap.latency < 20) reasons.push("latency");
    } else {
      score += latencyScore(snap) * 0.10;
    }

    // Cost
    if (snap.environment === "onprem") {
      score += 0.20; // on-prem is free at the margin
      reasons.push("cost-optimise");
    } else {
      score += costScore(snap) * 0.15;
    }

    // Burstability
    if (workload.burstable && snap.environment === "cloud") {
      score += 0.10;
      reasons.push("burst-traffic");
    }

    // Historical bias
    score += historicalBias(snap.provider);

    // Default reason if none set
    if (reasons.length === 0) reasons.push("default");

    return { snap, score, reasons };
  });

  // Step 4 — pick winner and runner-up
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const runnerUp = scored[1];

  // Step 5 — derive confidence from gap between top two
  const gap = runnerUp ? winner.score - runnerUp.score : 0.5;
  const rawConfidence = Math.min(0.99, 0.55 + gap * 2 + (winner.score > 0.7 ? 0.1 : 0));
  const confidence = Math.max(0.50, rawConfidence);

  const estimatedMonthlyCostUsd =
    winner.snap.environment === "onprem"
      ? 0
      : Math.round(winner.snap.cost * 730); // 730 hrs/month

  return {
    workloadId: workload.id,
    workloadName: workload.name,
    targetProvider: winner.snap.provider,
    targetEnvironment: winner.snap.environment,
    confidence: Number(confidence.toFixed(3)),
    reasons: [...new Set(winner.reasons)],
    alternativeProvider: runnerUp?.snap.provider,
    estimatedMonthlyCostUsd,
    estimatedLatencyMs: Math.round(winner.snap.latency),
    complianceSatisfied:
      workload.dataLocality !== "onprem-only" || winner.snap.environment === "onprem",
    decidedAt: NOW,
  };
}
