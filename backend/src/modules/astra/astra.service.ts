import { orchestrateDecision } from "../ai-ops-learning/orchestrator";
import { runAllAgents } from "../ai-ops-learning/agents";
import type { MetricsState, OpsScope } from "../ai-ops-learning/types";
import { publishAstraEvent, AstraTopics } from "../astra-bus/astra-bus";

export type AgentWireOutput = {
  agent: string;
  issue: string;
  recommendation: string;
  confidence: number;
};

function agentsToWire(state: MetricsState): AgentWireOutput[] {
  const a = runAllAgents(state);
  return [
    {
      agent: "SRE",
      issue: inferIssue("sre", state),
      recommendation: a.sre.recommendation,
      confidence: Number(a.sre.confidence.toFixed(3)),
    },
    {
      agent: "COST",
      issue: inferIssue("cost", state),
      recommendation: a.cost.recommendation,
      confidence: Number(a.cost.confidence.toFixed(3)),
    },
    {
      agent: "SECURITY",
      issue: inferIssue("security", state),
      recommendation: a.security.recommendation,
      confidence: Number(a.security.confidence.toFixed(3)),
    },
  ];
}

function inferIssue(kind: "sre" | "cost" | "security", state: MetricsState): string {
  const cpu = state.cpu ?? 0;
  const lat = state.latency ?? 0;
  const err = state.errorRate ?? 0;
  const cost = state.cost ?? 0;
  if (kind === "sre") {
    if (cpu > 85) return `CPU saturation risk at ${cpu}%`;
    if (lat > 300) return `Latency elevated (${lat}ms)`;
    if (err > 2) return `Error rate spike (${err}%)`;
    return "Signals within SRE watch thresholds";
  }
  if (kind === "cost") {
    return cost > 20 || cpu > 75 ? "Cost or utilization pressure detected" : "Cost posture stable";
  }
  return err > 5 ? "Elevated errors — possible abuse or defect" : "No strong security anomaly from metrics";
}

function buildHumanSummary(params: {
  decision: string;
  confidence: number;
  policyReason?: string;
  agents: AgentWireOutput[];
}): string {
  const top = params.agents.sort((a, b) => b.confidence - a.confidence)[0];
  return [
    `Orchestrator selected **${params.decision}** (confidence ${(params.confidence * 100).toFixed(0)}%).`,
    top ? `Strongest agent signal: ${top.agent} — ${top.recommendation.slice(0, 160)}${top.recommendation.length > 160 ? "…" : ""}` : "",
    params.policyReason ? `Policy: ${params.policyReason}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const astraService = {
  /**
   * Unified decision with explicit { machine, human } contract for clients and LLM tools.
   */
  async decide(body: { state: MetricsState; manualApproval?: boolean }, scope: OpsScope) {
    await publishAstraEvent(
      AstraTopics.METRICS_STREAM,
      { state: body.state, source: "astra.decide" },
      scope
    );

    const out = await orchestrateDecision({
      state: body.state,
      scope,
      manualApproval: Boolean(body.manualApproval),
    });

    const agents = agentsToWire(body.state);

    const machine = {
      orchestrator: {
        decision: out.decision,
        reason: out.reason,
        confidence: out.confidence,
        policy: out.policy,
        exploration: out.exploration,
        memory: {
          similarCount: out.memory.similarExperiences?.length ?? 0,
          bestHistorical: out.memory.bestHistorical,
          blockedStrategies: out.memory.blockedStrategies,
        },
      },
      agents,
      context: {
        collectedAt: new Date().toISOString(),
        signals: body.state,
      },
    };

    const human = buildHumanSummary({
      decision: out.decision,
      confidence: out.confidence,
      policyReason: out.policy.requiresApproval ? "Approval required before execution" : out.policy.reason,
      agents,
    });

    await publishAstraEvent(
      AstraTopics.AI_DECISIONS,
      { decision: out.decision, confidence: out.confidence, policy: out.policy },
      scope
    );

    return { machine, human };
  },

  /**
   * Digital twin — lightweight simulation before execution (no cluster mutation).
   */
  simulate(body: {
    action: string;
    replicas?: number;
    state: MetricsState;
    resource?: string;
  }) {
    const state = body.state;
    const cpu = state.cpu ?? 55;
    const lat = state.latency ?? 120;
    const cost = state.cost ?? 12;
    const action = body.action.toLowerCase();
    const replicas = Math.max(1, Math.min(50, body.replicas ?? 6));

    let predictedLatencyPct = 0;
    let cpuReductionPct = 0;
    let costDeltaUsd = 0;
    let risk: "low" | "medium" | "high" = "low";

    if (action.includes("scale") || action === "scale_replicas" || action === "canary_scale") {
      const relief = Math.min(0.45, (cpu / 100) * 0.35 + (replicas / 50) * 0.15);
      predictedLatencyPct = -Math.round(relief * 100);
      cpuReductionPct = -Math.round(Math.min(40, relief * 80));
      costDeltaUsd = Math.round(8 + replicas * 2.2 + (cost > 18 ? 12 : 4));
      risk = cpu > 90 ? "high" : "medium";
    } else if (action.includes("rollback")) {
      predictedLatencyPct = -15;
      cpuReductionPct = -10;
      costDeltaUsd = -5;
      risk = "medium";
    } else if (action.includes("restart")) {
      predictedLatencyPct = 8;
      cpuReductionPct = -5;
      costDeltaUsd = 2;
      risk = "medium";
    } else {
      predictedLatencyPct = -3;
      cpuReductionPct = -2;
      costDeltaUsd = 1;
      risk = "low";
    }

    const machine = {
      action: body.action,
      replicas,
      resource: body.resource ?? "api-gateway",
      predicted_latency_pct: predictedLatencyPct,
      cpu_reduction_pct: cpuReductionPct,
      cost_delta_usd: costDeltaUsd,
      risk,
      assumptions: {
        trafficMix: "steady",
        nodePoolHeadroom: cpu < 70 ? "comfortable" : "tight",
      },
    };

    const human = `Simulating **${body.action}** (${replicas} replicas): expect latency **${predictedLatencyPct}%**, CPU **${cpuReductionPct}%**, cost **${costDeltaUsd >= 0 ? "+" : ""}$${Math.abs(costDeltaUsd)}**; risk **${risk}**.`;

    return { machine, human };
  },

  /** Short horizon prediction for control plane UI */
  predict(state: MetricsState) {
    const cpu = state.cpu ?? 0;
    const lat = state.latency ?? 0;
    const err = state.errorRate ?? 0;
    const minutes =
      cpu > 85 ? 5 : cpu > 70 ? 12 : err > 2 ? 8 : 20;
    const conf = Math.min(0.97, 0.55 + cpu / 200 + err / 25);
    const machine = {
      prediction:
        cpu > 80
          ? `CPU will exceed comfort threshold within ~${minutes} minutes at current trend`
          : lat > 350
            ? `Latency SLO at risk within ~${minutes} minutes`
            : err > 2
              ? `Error budget burn may accelerate within ~${minutes} minutes`
              : "No acute failure predicted in short horizon",
      confidence: Number(conf.toFixed(3)),
      horizonMinutes: minutes,
      signals: { cpu, latency: lat, errorRate: err },
    };
    const human = `${machine.prediction} (${(machine.confidence * 100).toFixed(0)}% confidence).`;
    return { machine, human };
  },
};
