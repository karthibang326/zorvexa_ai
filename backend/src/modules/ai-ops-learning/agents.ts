import { AgentProposal, MetricsState } from "./types";

/** Structured multi-agent outputs (JSON-serializable). */
export function sreAgent(state: MetricsState): AgentProposal {
  const cpu = Number(state.cpu ?? 0);
  const lat = Number(state.latency ?? 0);
  const err = Number(state.errorRate ?? 0);
  let action = "observe";
  let reasoning = "Signals within acceptable bounds.";
  if (cpu > 80 || lat > 400 || err > 2) {
    action = "scale_replicas";
    reasoning = "CPU/latency/error indicate saturation risk; horizontal scale recommended.";
  } else if (err > 1 && cpu < 60) {
    action = "rollback_deployment";
    reasoning = "Errors elevated without CPU saturation — likely bad release.";
  }
  const confidence = Math.min(0.95, 0.55 + (cpu / 200) * 0.25 + (err / 10) * 0.15);
  return {
    agent: "SRE",
    recommendation: action,
    confidence,
    reasoning,
    structured: {
      action,
      priority: cpu > 85 || err > 3 ? 10 : 7,
      risk: cpu > 90 || err > 4 ? "high" : "medium",
    },
  };
}

export function costAgent(state: MetricsState): AgentProposal {
  const cost = Number(state.cost ?? 0);
  const cpu = Number(state.cpu ?? 0);
  const warn = cost > 20 || cpu > 75;
  return {
    agent: "COST",
    recommendation: warn ? "defer_scale_or_rightsizing" : "allow_scale",
    confidence: 0.78,
    reasoning: warn
      ? "Cost pressure or high utilization — prefer rightsizing before aggressive scale."
      : "Cost headroom acceptable for reliability action.",
    structured: {
      action: warn ? "cost_review" : "approve_budget",
      priority: 5,
      estimatedCostDeltaPct: state.cpu && state.cpu > 80 ? 12 : 4,
      risk: warn ? "medium" : "low",
    },
  };
}

export function securityAgent(state: MetricsState): AgentProposal {
  const err = Number(state.errorRate ?? 0);
  const suspicious = err > 5;
  return {
    agent: "SECURITY",
    recommendation: suspicious ? "block_suspicious_traffic" : "monitor",
    confidence: 0.72,
    reasoning: suspicious
      ? "Error pattern may indicate abuse or injection — tighten network policy."
      : "No strong security signal from current metrics.",
    structured: {
      action: suspicious ? "tighten_policy" : "no_security_block",
      priority: suspicious ? 9 : 3,
      risk: suspicious ? "high" : "low",
    },
  };
}

export function runAllAgents(state: MetricsState) {
  return {
    sre: sreAgent(state),
    cost: costAgent(state),
    security: securityAgent(state),
  };
}
