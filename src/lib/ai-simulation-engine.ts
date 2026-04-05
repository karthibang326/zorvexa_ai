import type { MetricsState } from "@/lib/ai-ops-learning";

export type RiskTier = "low" | "medium" | "high";

export type SimulationOption = {
  id: string;
  action: string;
  resource: string;
  /** Short label for UI */
  title: string;
  /** Predicted p95 latency change (negative = improvement) */
  latencyImpactPct: number;
  /** Predicted monthly cost change */
  costImpactPct: number;
  risk: RiskTier;
  confidence: number;
  expectedOutcome: string;
  isBest: boolean;
  /** Set when this option is not the recommended path */
  rejectedBecause?: string;
};

export type SimulationResult = {
  issue: string;
  findings: string[];
  scenarioNote?: string;
  options: SimulationOption[];
  bestOptionId: string;
  baseline: MetricsState;
};

function detectFindings(state: MetricsState): string[] {
  const findings: string[] = [];
  const cpu = Number(state.cpu ?? 0);
  const lat = Number(state.latency ?? 0);
  const err = Number(state.errorRate ?? 0);
  const cost = Number(state.cost ?? 0);
  if (cpu >= 85) findings.push("high_cpu");
  if (lat >= 220) findings.push("high_latency");
  if (err >= 2.5) findings.push("high_errors");
  if (lat >= 220) findings.push("latency_spike");
  if (cost >= 75) findings.push("cost_anomaly");
  if (err >= 2.5) findings.push("error_rate_anomaly");
  return findings;
}

function decideBestAction(findings: string[]): { action: string; resource: string } {
  if (findings.includes("high_errors") && findings.includes("high_latency")) {
    return { action: "rollback_deployment", resource: "payments-api" };
  }
  if (findings.includes("high_errors")) return { action: "restart_service", resource: "payments-api" };
  if (findings.includes("high_cpu") || findings.includes("high_latency")) return { action: "scale_replicas", resource: "payments-api" };
  if (findings.includes("security_anomaly")) return { action: "isolate_threat", resource: "security-gateway" };
  if (findings.includes("latency_spike")) return { action: "scale_replicas", resource: "payments-api" };
  if (findings.includes("cost_anomaly")) return { action: "rightsizing_review", resource: "global-infra" };
  if (findings.includes("error_rate_anomaly")) return { action: "canary_scale", resource: "critical-services" };
  return { action: "observe", resource: "platform" };
}

const PRESETS: Record<
  string,
  { latencyImpactPct: number; costImpactPct: number; risk: RiskTier; confidence: number; outcome: string }
> = {
  rollback_deployment: {
    latencyImpactPct: -22,
    costImpactPct: -3,
    risk: "medium",
    confidence: 0.88,
    outcome: "Revert to last known-good release; expect error rate and p95 to drop sharply within one roll cycle.",
  },
  restart_service: {
    latencyImpactPct: -12,
    costImpactPct: 0,
    risk: "medium",
    confidence: 0.82,
    outcome: "Cold restart clears poisoned workers; brief spike possible, then stability.",
  },
  scale_replicas: {
    latencyImpactPct: -18,
    costImpactPct: 6,
    risk: "low",
    confidence: 0.86,
    outcome: "Added capacity absorbs load; p95 trends down; cost rises slightly with replica count.",
  },
  isolate_threat: {
    latencyImpactPct: -8,
    costImpactPct: 1,
    risk: "low",
    confidence: 0.91,
    outcome: "Threat path segmented; legitimate traffic rerouted with minimal blast radius.",
  },
  rightsizing_review: {
    latencyImpactPct: 2,
    costImpactPct: -12,
    risk: "low",
    confidence: 0.79,
    outcome: "Deferred compute removal and SKU tuning; savings materialize after next scheduling window.",
  },
  canary_scale: {
    latencyImpactPct: -10,
    costImpactPct: 3,
    risk: "medium",
    confidence: 0.84,
    outcome: "Gradual traffic shift limits risk; monitor canary metrics before full promotion.",
  },
  observe: {
    latencyImpactPct: 0,
    costImpactPct: 0,
    risk: "low",
    confidence: 0.72,
    outcome: "No automated change; telemetry and alerts continue; revisit if thresholds persist.",
  },
};

const ALL_ACTIONS: Array<{ action: string; resource: string; title: string }> = [
  { action: "rollback_deployment", resource: "payments-api", title: "Rollback deployment" },
  { action: "restart_service", resource: "payments-api", title: "Restart service" },
  { action: "scale_replicas", resource: "payments-api", title: "Scale replicas" },
  { action: "isolate_threat", resource: "security-gateway", title: "Isolate threat" },
  { action: "rightsizing_review", resource: "global-infra", title: "Rightsizing review" },
  { action: "canary_scale", resource: "critical-services", title: "Canary scale" },
  { action: "observe", resource: "platform", title: "Observe only" },
];

function rejectionFor(nonBest: { action: string }, best: { action: string }): string {
  if (nonBest.action === best.action) return "";
  const lines: Record<string, Record<string, string>> = {
    rollback_deployment: {
      restart_service: "Superseded: combined error+latency pattern requires full rollback first.",
      scale_replicas: "Would amplify a bad release — revert before scaling.",
    },
    restart_service: {
      rollback_deployment: "Rollback bar not met — restart addresses instance health first.",
      scale_replicas: "Capacity not the root cause yet.",
    },
    scale_replicas: {
      restart_service: "Throughput-bound; restart alone won’t add headroom.",
      rightsizing_review: "Acute latency wins over cost tuning this tick.",
    },
    observe: {
      scale_replicas: "Signals below automated remediation threshold.",
    },
  };
  return (
    lines[best.action]?.[nonBest.action] ??
    `Lower priority vs ${best.action} given current finding mix.`
  );
}

/** Apply naive what-if hints from free text to metrics */
export function applyScenarioHint(state: MetricsState, hint: string): { state: MetricsState; note?: string } {
  const h = hint.toLowerCase().trim();
  if (!h) return { state };
  const next = { ...state };
  const notes: string[] = [];

  const cpuM = h.match(/cpu\s*(\d+)/);
  if (cpuM) {
    next.cpu = Math.min(100, Number(cpuM[1]));
    notes.push(`CPU forced to ${next.cpu}%`);
  }
  const latM = h.match(/latenc(?:y)?\s*(\d+)/);
  if (latM) {
    next.latency = Number(latM[1]);
    notes.push(`Latency set to ${next.latency}ms`);
  }
  const errM = h.match(/error[s]?\s*(\d+(?:\.\d+)?)/);
  if (errM) {
    next.errorRate = Number(errM[1]);
    notes.push(`Error rate ${next.errorRate}%`);
  }
  const securityScenario = h.includes("security") || h.includes("threat");
  if (securityScenario) {
    notes.push("Security anomaly flag assumed for simulation");
  }
  if (h.includes("cost")) {
    next.cost = Math.max(next.cost ?? 50, 78);
    notes.push("Cost pressure elevated for scenario");
  }

  return { state: next, note: notes.length ? notes.join(" · ") : undefined };
}

export function runSimulation(baseline: MetricsState, scenarioHint?: string): SimulationResult {
  let state = { ...baseline };
  let scenarioNote: string | undefined;
  let securityScenario = false;

  if (scenarioHint?.trim()) {
    const applied = applyScenarioHint(state, scenarioHint);
    state = applied.state;
    scenarioNote = applied.note;
    const hl = scenarioHint.toLowerCase();
    securityScenario = hl.includes("security") || hl.includes("threat");
  }

  const findings = detectFindings(state);
  if (securityScenario) {
    findings.push("security_anomaly");
  }

  const issue =
    findings.length > 0
      ? `Detected: ${findings.map((f) => f.replace(/_/g, " ")).join(", ")}`
      : "Telemetry within normal bands — observation path unless scenario overrides apply.";

  const best = decideBestAction(findings.length ? findings : []);

  const options: SimulationOption[] = ALL_ACTIONS.map((row, idx) => {
    const preset = PRESETS[row.action] ?? PRESETS.observe;
    const isBest = row.action === best.action && row.resource === best.resource;
    const id = `opt-${idx}-${row.action}`;
    const jitter = (idx % 5) - 2;
    return {
      id,
      action: row.action,
      resource: row.resource,
      title: row.title,
      latencyImpactPct: preset.latencyImpactPct + (isBest ? 0 : jitter),
      costImpactPct: preset.costImpactPct + (isBest ? 0 : (idx % 3) - 1),
      risk: preset.risk,
      confidence: Math.min(0.97, preset.confidence + (isBest ? 0.05 : -0.06)),
      expectedOutcome: preset.outcome,
      isBest,
      rejectedBecause: isBest ? undefined : rejectionFor({ action: row.action }, { action: best.action }),
    };
  });

  const bestOpt = options.find((o) => o.isBest) ?? options[options.length - 1];
  return {
    issue,
    findings,
    scenarioNote,
    options: options.sort((a, b) => (a.isBest ? -1 : b.isBest ? 1 : a.confidence - b.confidence)),
    bestOptionId: bestOpt.id,
    baseline: state,
  };
}

export function riskLabel(r: RiskTier): string {
  switch (r) {
    case "high":
      return "High — policy review or approval may be required";
    case "medium":
      return "Medium — monitor blast radius and rollback readiness";
    default:
      return "Low — within typical automated guardrails";
  }
}
