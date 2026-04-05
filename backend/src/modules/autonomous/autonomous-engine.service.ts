import { optimizeSystem } from "../ai-optimizer/ai-optimizer.service";
import { autoScale } from "../scaling/scaling.service";
import { triggerIncident } from "../ai-sre-agent/incident.service";

export type AutonomousAgentType =
  | "monitoring"
  | "incident_response"
  | "cost_optimization"
  | "security"
  | "performance";

export type SignalType = "metrics" | "logs" | "incidents" | "cost_anomalies" | "security_alerts";

export type ExecutionMode = "manual" | "assist" | "auto_execute";

export type LoopSignal = {
  type: SignalType;
  payload: Record<string, unknown>;
  ts: string;
};

export type ActionRecord = {
  id: string;
  ts: string;
  agent: AutonomousAgentType;
  action: string;
  target: string;
  reasoning: string;
  confidence: number;
  expectedImpact: string;
  status: "EXECUTED" | "SKIPPED" | "BLOCKED" | "FAILED";
  rollback?: string;
};

type LoopEvent = {
  type: "signal" | "decision" | "action";
  ts: string;
  payload: Record<string, unknown>;
};

type EngineMode = {
  enabled: boolean;
  executionMode: ExecutionMode;
  approvalMode: boolean;
  maxActionsPerHour: number;
  rollbackEnabled: boolean;
};

const subscribers = new Set<(ev: LoopEvent) => void>();
const signals: LoopSignal[] = [];
const actions: ActionRecord[] = [];
const predictions: Array<{ id: string; predictedIssue: string; riskScore: number; failureProbability: number; recommendation: string; createdAt: string }> = [];
const inFlightTargets = new Set<string>();

let mode: EngineMode = {
  enabled: false,
  executionMode: "assist",
  approvalMode: true,
  maxActionsPerHour: 12,
  rollbackEnabled: true,
};

let actionBudgetWindowStart = Date.now();
let actionsInWindow = 0;

function emit(event: LoopEvent) {
  for (const s of subscribers) s(event);
}

function nowIso() {
  return new Date().toISOString();
}

function resetBudgetIfNeeded() {
  if (Date.now() - actionBudgetWindowStart > 60 * 60 * 1000) {
    actionBudgetWindowStart = Date.now();
    actionsInWindow = 0;
  }
}

function canAct() {
  resetBudgetIfNeeded();
  return actionsInWindow < mode.maxActionsPerHour;
}

function parseRisk(metrics: Array<{ cpu?: number; memory?: number; errors?: number }>) {
  const avgCpu = metrics.reduce((a, x) => a + Number(x.cpu ?? 0), 0) / Math.max(1, metrics.length);
  const avgErrors = metrics.reduce((a, x) => a + Number(x.errors ?? 0), 0) / Math.max(1, metrics.length);
  const risk = Math.min(0.99, Math.max(0.2, avgCpu * 0.7 + avgErrors * 0.9));
  const issue = risk > 0.8 ? "traffic_surge" : risk > 0.6 ? "latency_regression" : "stable";
  return { risk, issue };
}

async function executeAction(input: Omit<ActionRecord, "id" | "ts" | "status">, run: () => Promise<unknown>) {
  const targetKey = `${input.agent}:${input.target}`;
  if (inFlightTargets.has(targetKey)) {
    const blocked: ActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: nowIso(),
      ...input,
      status: "BLOCKED",
    };
    actions.unshift(blocked);
    emit({ type: "action", ts: blocked.ts, payload: blocked as unknown as Record<string, unknown> });
    return blocked;
  }
  if (!canAct()) {
    const skipped: ActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: nowIso(),
      ...input,
      status: "SKIPPED",
    };
    actions.unshift(skipped);
    emit({ type: "action", ts: skipped.ts, payload: skipped as unknown as Record<string, unknown> });
    return skipped;
  }

  inFlightTargets.add(targetKey);
  try {
    await run();
    actionsInWindow += 1;
    const ok: ActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: nowIso(),
      ...input,
      status: "EXECUTED",
    };
    actions.unshift(ok);
    if (actions.length > 400) actions.length = 400;
    emit({ type: "action", ts: ok.ts, payload: ok as unknown as Record<string, unknown> });
    return ok;
  } catch {
    const fail: ActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: nowIso(),
      ...input,
      status: "FAILED",
    };
    actions.unshift(fail);
    emit({ type: "action", ts: fail.ts, payload: fail as unknown as Record<string, unknown> });
    return fail;
  } finally {
    inFlightTargets.delete(targetKey);
  }
}

export const autonomousEngine = {
  subscribe(handler: (ev: LoopEvent) => void) {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  },
  ingestSignal(type: SignalType, payload: Record<string, unknown>) {
    const ev: LoopSignal = { type, payload, ts: nowIso() };
    signals.unshift(ev);
    if (signals.length > 500) signals.length = 500;
    emit({ type: "signal", ts: ev.ts, payload: ev as unknown as Record<string, unknown> });
  },
  getMode() {
    return mode;
  },
  setMode(input: Partial<EngineMode> & { enabled: boolean }) {
    mode = {
      ...mode,
      ...input,
      executionMode: input.executionMode ?? mode.executionMode,
    };
    return mode;
  },
  getActions(limit = 100) {
    return actions.slice(0, Math.max(1, Math.min(200, limit)));
  },
  getTelemetry() {
    const total = actions.length;
    const success = actions.filter((a) => a.status === "EXECUTED").length;
    return {
      totalActions: total,
      successRate: total ? Number((success / total).toFixed(2)) : 1,
      recentSignals: signals.slice(0, 20),
      recentPredictions: predictions.slice(0, 20),
    };
  },
  async runControlLoop(input: {
    provider: "aws" | "gcp" | "azure";
    deploymentName: string;
    namespace?: string;
    historicalMetrics: Array<{ ts: string; cpu?: number; memory?: number; traffic?: number; errors?: number }>;
  }) {
    if (!mode.enabled) {
      return { acted: false, reason: "engine_disabled" };
    }
    const risk = parseRisk(input.historicalMetrics);
    const prediction = {
      id: `pred-${Date.now()}`,
      predictedIssue: risk.issue,
      riskScore: Number(risk.risk.toFixed(2)),
      failureProbability: Number((risk.risk * 0.92).toFixed(2)),
      recommendation: risk.risk > 0.7 ? "scale_and_optimize" : "observe",
      createdAt: nowIso(),
    };
    predictions.unshift(prediction);
    if (predictions.length > 250) predictions.length = 250;
    emit({ type: "decision", ts: nowIso(), payload: { agent: "monitoring", prediction } });

    if (mode.executionMode === "manual" || (mode.approvalMode && mode.executionMode !== "auto_execute")) {
      return { acted: false, prediction, reason: "approval_required" };
    }

    const out: ActionRecord[] = [];
    if (prediction.riskScore > 0.7) {
      out.push(
        await executeAction(
          {
            agent: "performance",
            action: "scale_service",
            target: input.deploymentName,
            reasoning: "CPU and error trend predicts imminent latency regression",
            confidence: prediction.riskScore,
            expectedImpact: "reduce p95 latency and stabilize throughput",
            rollback: mode.rollbackEnabled ? "restore previous replica count" : undefined,
          },
          () =>
            autoScale({
              provider: input.provider,
              deploymentName: input.deploymentName,
              namespace: input.namespace,
              predictedLoad: 0.88,
              confidence: prediction.riskScore,
              manualOverride: false,
            })
        )
      );
    }

    out.push(
      await executeAction(
        {
          agent: "cost_optimization",
          action: "optimize_cost_performance",
          target: "global",
          reasoning: "Cross-cloud optimization run scheduled by control loop",
          confidence: 0.83,
          expectedImpact: "improve cost efficiency without SLO regressions",
          rollback: mode.rollbackEnabled ? "revert optimization recommendations" : undefined,
        },
        async () => {
          await optimizeSystem({
            autoMode: true,
            safety: { approvalMode: mode.approvalMode, maxChangesPerHour: mode.maxActionsPerHour },
          });
        }
      )
    );

    return { acted: out.some((x) => x.status === "EXECUTED"), prediction, actions: out };
  },
  buildCopilotDecision(input: { message: string; activeTab?: string | null }) {
    const m = input.message.toLowerCase();
    const problem = m.includes("latency")
      ? "Elevated latency in critical service"
      : m.includes("cost")
      ? "Cloud cost anomaly trend detected"
      : m.includes("security")
      ? "Potential threat escalation risk"
      : "Operational stability risk detected";
    const rootCause = m.includes("latency")
      ? "CPU saturation under burst traffic"
      : m.includes("cost")
      ? "Over-provisioned baseline resources"
      : m.includes("security")
      ? "Suspicious auth/login pattern deviations"
      : "Multi-signal anomaly from metrics and incidents";
    const impact = m.includes("security")
      ? "Increased breach likelihood and service disruption"
      : "SLO degradation and possible incident escalation";
    const actionPlan = m.includes("security")
      ? "Block threat source, enforce strict policy, and isolate impacted service"
      : m.includes("cost")
      ? "Apply rightsizing and optimize non-critical workloads"
      : "Scale service and trigger controlled self-heal workflow";
    const confidence = m.includes("security") ? 0.93 : m.includes("cost") ? 0.9 : 0.88;
    return { problem, rootCause, impact, actionPlan, confidence, activeTab: input.activeTab ?? "unknown" };
  },
  async executeOrganizationAction(action: "optimize" | "scale" | "stabilize") {
    if (action === "optimize") {
      return executeAction(
        {
          agent: "cost_optimization",
          action: "optimize_global",
          target: "organization",
          reasoning: "Organization-level optimization requested",
          confidence: 0.89,
          expectedImpact: "improve global efficiency score",
          rollback: mode.rollbackEnabled ? "rollback optimization profile" : undefined,
        },
        async () => {
          await optimizeSystem({
            autoMode: true,
            safety: { approvalMode: mode.approvalMode, maxChangesPerHour: mode.maxActionsPerHour },
          });
        }
      );
    }
    if (action === "scale") {
      return executeAction(
        {
          agent: "performance",
          action: "scale_critical",
          target: "astraops-critical",
          reasoning: "Critical services preemptive scaling",
          confidence: 0.9,
          expectedImpact: "protect reliability during demand spikes",
          rollback: mode.rollbackEnabled ? "restore baseline replicas" : undefined,
        },
        () =>
          autoScale({
            provider: "aws",
            deploymentName: "astraops-critical",
            namespace: "prod",
            predictedLoad: 0.9,
            confidence: 0.9,
            manualOverride: false,
          })
      );
    }
    return executeAction(
      {
        agent: "incident_response",
        action: "stabilize_platform",
        target: "organization",
        reasoning: "Autonomous stabilization requested",
        confidence: 0.87,
        expectedImpact: "reduce active incidents and restore healthy baseline",
        rollback: mode.rollbackEnabled ? "revert latest stabilization playbook action" : undefined,
      },
      async () => {
        await triggerIncident({
          source: "metrics_anomaly",
          issue: "Autonomous stabilization runbook triggered",
          metadata: { source: "autonomous-engine", auto: true },
        });
      }
    );
  },
};

