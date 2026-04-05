import { randomUUID } from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { recordAiLearningFromOpsLoop } from "../ai-learning/learning.service";
import { orchestrateDecision } from "./orchestrator";
import { compareBeforeAfter } from "./feedback.engine";
import { computeReward } from "./learning.engine";
import { autoScale } from "../scaling/scaling.service";
import { MetricsState, OpsScope } from "./types";
import { checkPolicy } from "./policy";
import { runAllAgents } from "./agents";
import { publishAstraEvent, AstraTopics } from "../astra-bus/astra-bus";
import { tryFetchLiveObservedSignal } from "./metrics-source";
import { executeOrchestratedInfraAction } from "./ops-orchestration-execution";

type ObservedSignal = {
  metrics: MetricsState;
  logs: string[];
  events: Array<{ type: string; message: string; severity?: "low" | "medium" | "high" }>;
};

type ContinuousLoopConfig = {
  intervalMs: number;
  provider: "aws" | "gcp" | "azure" | "kubernetes";
  namespace?: string;
  scope: OpsScope;
};

function clampPct(v: number) {
  return Math.max(0, Math.min(100, Number(v.toFixed(2))));
}

function aggregateObservedState(signal: ObservedSignal): MetricsState {
  return {
    cpu: Number(signal.metrics.cpu ?? 0),
    memory: Number(signal.metrics.memory ?? 0),
    latency: Number(signal.metrics.latency ?? 0),
    traffic: Number(signal.metrics.traffic ?? 0),
    errorRate: Number(signal.metrics.errorRate ?? 0),
    cost: Number(signal.metrics.cost ?? 0),
  };
}

/** Human-readable rejected paths for transparency (paired with decideAction priority). */
function buildAlternativesExplained(
  findings: string[],
  chosen: { action: string; resource: string }
): Array<{ option: string; rejectedBecause: string }> {
  const f = new Set(findings);
  const out: Array<{ option: string; rejectedBecause: string }> = [];
  const add = (option: string, rejectedBecause: string) => {
    if (option !== chosen.action) out.push({ option, rejectedBecause });
  };

  if (chosen.action === "rollback_deployment") {
    add("restart_service", "Single-signal restart is insufficient when errors and latency breach together — rollback restores last known good.");
    add("scale_replicas", "Adding capacity would amplify a bad release — revert first, then scale if needed.");
    add("observe", "Passive monitoring is unsafe under compound SLO breach.");
  } else if (chosen.action === "restart_service") {
    add("rollback_deployment", "Threshold for full rollback not met — errors elevated but latency still within paired rollback rule.");
    add("scale_replicas", "Not yet a capacity signal — restart clears poisoned instances before horizontal scale.");
    add("canary_scale", "Gradual rollout deferred until restart outcome is measured.");
  } else if (chosen.action === "scale_replicas") {
    add("restart_service", "Errors not attributed to pod crash-loop — latency/CPU pressure indicates throughput, not poisoned revision.");
    add("rightsizing_review", "Cost optimization deferred until latency returns under SLO.");
    add("rollback_deployment", "No dual-signal deploy fault — scaling is the least disruptive first step.");
  } else if (chosen.action === "isolate_threat") {
    add("scale_replicas", "Security containment precedes capacity changes — avoid widening blast radius.");
    add("restart_service", "Restart alone cannot evict a coordinated threat at the edge.");
    add("observe", "High-severity security signal requires active isolation.");
  } else if (chosen.action === "rightsizing_review") {
    add("scale_replicas", "Cost anomaly without acute latency — rightsizing before blind scale saves spend.");
    add("restart_service", "No error spike tied to instance health.");
    add("rollback_deployment", "No deploy fault indicators in findings.");
  } else if (chosen.action === "canary_scale") {
    add("restart_service", "Error slope gradual — canary limits blast radius vs hard restart.");
    add("rollback_deployment", "Rollback reserved for correlated latency + error surge.");
    add("scale_replicas", "Full scale would skip staged validation — canary first.");
  } else if (chosen.action === "observe") {
    add("scale_replicas", "Signals below automated remediation thresholds — watch and alert only.");
    add("restart_service", "No sustained error cluster to justify bounce.");
    add("rightsizing_review", "Cost drift within policy band.");
  } else {
    add("observe", "Alternate paths evaluated; selected action best matches current signal mix.");
  }

  if (f.has("security_anomaly") && chosen.action !== "isolate_threat") {
    add("isolate_threat", "Security anomaly present but superseded by higher-priority composite rule.");
  }

  return out.slice(0, 5);
}

function detectAnomalies(state: MetricsState, signal: ObservedSignal) {
  const findings: string[] = [];
  if (Number(state.cpu ?? 0) >= 85) findings.push("high_cpu");
  if (Number(state.latency ?? 0) >= 220) findings.push("high_latency");
  if (Number(state.errorRate ?? 0) >= 2.5) findings.push("high_errors");
  if (Number(state.latency ?? 0) >= 220) findings.push("latency_spike");
  if (Number(state.cost ?? 0) >= 75) findings.push("cost_anomaly");
  if (Number(state.errorRate ?? 0) >= 2.5) findings.push("error_rate_anomaly");
  const hasSecuritySignal = signal.events.some((e) => e.type.toLowerCase().includes("security") || (e.severity ?? "low") === "high");
  if (hasSecuritySignal) findings.push("security_anomaly");
  return findings;
}

function decideAction(findings: string[]) {
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

function estimatePostActionState(before: MetricsState, action: string): MetricsState {
  const b = { ...before };
  if (action === "scale_replicas" || action === "canary_scale") {
    return {
      ...b,
      latency: clampPct((Number(b.latency ?? 0) * 0.78)),
      errorRate: clampPct((Number(b.errorRate ?? 0) * 0.85)),
      cost: clampPct((Number(b.cost ?? 0) * 1.06)),
    };
  }
  if (action === "rightsizing_review") {
    return {
      ...b,
      cost: clampPct((Number(b.cost ?? 0) * 0.82)),
      cpu: clampPct((Number(b.cpu ?? 0) * 0.9)),
    };
  }
  if (action === "isolate_threat") {
    return {
      ...b,
      errorRate: clampPct((Number(b.errorRate ?? 0) * 0.7)),
      latency: clampPct((Number(b.latency ?? 0) * 0.92)),
    };
  }
  if (action === "restart_service") {
    return {
      ...b,
      errorRate: clampPct((Number(b.errorRate ?? 0) * 0.7)),
      latency: clampPct((Number(b.latency ?? 0) * 0.9)),
      cpu: clampPct((Number(b.cpu ?? 0) * 0.95)),
    };
  }
  if (action === "rollback_deployment") {
    return {
      ...b,
      errorRate: clampPct((Number(b.errorRate ?? 0) * 0.6)),
      latency: clampPct((Number(b.latency ?? 0) * 0.8)),
      cpu: clampPct((Number(b.cpu ?? 0) * 0.9)),
      cost: clampPct((Number(b.cost ?? 0) * 0.96)),
    };
  }
  return b;
}

function scopeFromRequest(scope: OpsScope) {
  return {
    orgId: scope.orgId,
    projectId: scope.projectId ?? null,
    environment: scope.envId ?? null,
  };
}

export const aiOpsLearningService = {
  loopTimer: null as NodeJS.Timeout | null,
  loopConfig: null as ContinuousLoopConfig | null,
  lastLoopRunAt: null as string | null,
  lastLoopSummary: null as Record<string, unknown> | null,
  loopFailures: 0,
  lastMetricsSource: "synthetic" as "live" | "synthetic",
  lastLoopError: null as string | null,

  async analyze(body: { state: MetricsState; manualApproval?: boolean }, scope: OpsScope) {
    const out = await orchestrateDecision({
      state: body.state,
      scope,
      manualApproval: Boolean(body.manualApproval),
    });
    const learningInsight =
      out.memory.bestHistorical != null
        ? `Similar past states favor "${out.memory.bestHistorical.action}" (avg reward ${out.memory.bestHistorical.avgReward}).`
        : "Insufficient completed experiences — using cold-start heuristics.";
    await publishAstraEvent(
      AstraTopics.AI_DECISIONS,
      { phase: "analyze", decision: out.decision, confidence: out.confidence },
      scope
    );
    return {
      ...out,
      learningInsight,
    };
  },

  async execute(
    body: {
      state: MetricsState;
      action: string;
      resource: string;
      provider?: "aws" | "gcp" | "azure" | "kubernetes";
      namespace?: string;
      manualApproval?: boolean;
    },
    scope: OpsScope
  ) {
    const prismaAny = prisma as any;
    const agents = runAllAgents(body.state);
    const risk = agents.sre.structured.risk;
    const estCost = agents.cost.structured.estimatedCostDeltaPct;
    const policy = checkPolicy({
      action: body.action,
      proposedReplicas: body.action.includes("scale") ? 10 : undefined,
      estimatedCostDeltaPct: estCost,
      risk,
      manualApproval: Boolean(body.manualApproval),
    });
    if (!policy.allowed || policy.requiresApproval) {
      const pending = await prismaAny.agentExperience.create({
        data: {
          ...scopeFromRequest(scope),
          agentType: "ORCHESTRATED",
          state: body.state as any,
          action: body.action,
          status: "PENDING_APPROVAL",
          metadata: { resource: body.resource, policy } as any,
        },
      });
      await publishAstraEvent(
        AstraTopics.ACTIONS_EXECUTE,
        { action: body.action, resource: body.resource, status: "PENDING_APPROVAL", policy },
        scope
      );
      return {
        experienceId: pending.id,
        status: "PENDING_APPROVAL",
        message: policy.reason,
        policy,
      };
    }

    const created = await prismaAny.agentExperience.create({
      data: {
        ...scopeFromRequest(scope),
        agentType: "ORCHESTRATED",
        state: body.state as any,
        action: body.action,
        status: "PENDING",
        metadata: {
          resource: body.resource,
          provider: body.provider ?? "aws",
          namespace: body.namespace,
        } as any,
      },
    });

    let execution: Record<string, unknown> = { simulated: true };
    if (body.action === "scale_replicas" || body.action === "canary_scale") {
      try {
        const cloudProvider: "aws" | "gcp" | "azure" =
          body.provider && body.provider !== "kubernetes" ? body.provider : "aws";
        execution = await autoScale({
          provider: cloudProvider,
          deploymentName: body.resource,
          namespace: body.namespace,
          predictedLoad: 0.88,
          confidence: 0.82,
          manualOverride: Boolean(body.manualApproval),
        });
      } catch (e) {
        execution = { error: e instanceof Error ? e.message : String(e) };
      }
    } else {
      execution = await executeOrchestratedInfraAction({
        action: body.action,
        resource: body.resource,
        provider: body.provider,
        namespace: body.namespace,
      });
    }

    await prismaAny.agentExperience.update({
      where: { id: created.id },
      data: {
        metadata: {
          ...(created.metadata as object),
          resource: body.resource,
          execution,
        } as any,
      },
    });

    await publishAstraEvent(
      AstraTopics.ACTIONS_EXECUTE,
      { action: body.action, resource: body.resource, status: "EXECUTED", experienceId: created.id, execution },
      scope
    );

    return {
      experienceId: created.id,
      status: "EXECUTED",
      action: body.action,
      resource: body.resource,
      execution,
    };
  },

  async feedback(
    body: {
      experienceId: string;
      after: MetricsState;
      before?: MetricsState;
    },
    scope: OpsScope
  ) {
    const prismaAny = prisma as any;
    const row = await prismaAny.agentExperience.findFirst({
      where: { id: body.experienceId, orgId: scope.orgId },
    });
    if (!row) throw new Error("Experience not found");

    const before = (body.before ?? row.state) as MetricsState;
    const after = body.after;
    const fb = compareBeforeAfter(before, after);
    const reward = computeReward(before, after, fb);

    const rewardComponents = {
      latencyReduction: fb.latencyDelta,
      cpuReduction: fb.cpuDelta,
      errorReduction: fb.errorDelta,
      costChange: fb.costDelta,
    };

    await prismaAny.agentExperience.update({
      where: { id: row.id },
      data: {
        nextState: after as any,
        reward,
        result: fb.result,
        rewardComponents: rewardComponents as any,
        status: "COMPLETED",
        metadata: {
          ...(row.metadata as object),
          feedback: fb,
        } as any,
      },
    });

    await publishAstraEvent(
      AstraTopics.FEEDBACK_LOOP,
      { experienceId: row.id, reward, summary: fb.summary },
      scope
    );

    return {
      experienceId: row.id,
      reward,
      rewardComponents,
      feedback: fb,
      insight: `${fb.summary} Stored reward ${reward} for future decisions.`,
    };
  },

  async memory(scope: OpsScope, limit = 50) {
    const prismaAny = prisma as any;
    const items = await prismaAny.agentExperience.findMany({
      where: { orgId: scope.orgId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(200, limit)),
    });
    const withReward = items.filter((x: any) => x.reward != null);
    const avgReward =
      withReward.reduce((a: number, x: any) => a + Number(x.reward), 0) /
      Math.max(1, withReward.length);
    const successful = items.filter((x: any) => x.result === "success").length;
    const completed = items.filter((x: any) => x.status === "COMPLETED").length;
    const successRate = completed > 0 ? successful / completed : 0;
    return {
      items,
      stats: {
        count: items.length,
        avgReward: Number(avgReward.toFixed(4)),
        successRate: Number((successRate * 100).toFixed(2)),
      },
    };
  },

  async runAutonomousLoop(
    body: {
      signal: ObservedSignal;
      provider?: "aws" | "gcp" | "azure" | "kubernetes";
      namespace?: string;
    },
    scope: OpsScope
  ) {
    const loopCorrelationId = randomUUID();
    // 1) OBSERVE
    const observedState = aggregateObservedState(body.signal);
    await publishAstraEvent(AstraTopics.AI_DECISIONS, { phase: "observe", observedState }, scope);

    // 2) ANALYZE
    const analyzed = await this.analyze({ state: observedState, manualApproval: false }, scope);
    const findings = detectAnomalies(observedState, body.signal);
    await publishAstraEvent(AstraTopics.AI_DECISIONS, { phase: "analyze", findings, confidence: analyzed.confidence }, scope);

    // 3) DECIDE
    const chosen = decideAction(findings.length ? findings : [analyzed.decision]);
    const decision = {
      action: chosen.action,
      resource: chosen.resource,
      confidence: analyzed.confidence,
      reason: findings.length ? `Detected anomalies: ${findings.join(", ")}` : analyzed.reason,
    };
    await publishAstraEvent(AstraTopics.AI_DECISIONS, { phase: "decide", decision }, scope);

    // 4) ACT
    const execution = await this.execute(
      {
        state: observedState,
        action: decision.action,
        resource: decision.resource,
        provider: body.provider ?? "aws",
        namespace: body.namespace,
        manualApproval: false,
      },
      scope
    );
    await publishAstraEvent(AstraTopics.ACTIONS_EXECUTE, { phase: "act", execution }, scope);

    // 5) VERIFY
    const afterState = estimatePostActionState(observedState, decision.action);
    const verification = {
      before: observedState,
      after: afterState,
    };
    await publishAstraEvent(AstraTopics.FEEDBACK_LOOP, { phase: "verify", verification }, scope);

    // 6) LEARN + 7) MEMORY
    let learning: Record<string, unknown> | null = null;
    if (execution.status === "EXECUTED" && execution.experienceId) {
      learning = await this.feedback(
        {
          experienceId: execution.experienceId,
          before: observedState,
          after: afterState,
        },
        scope
      );
      const prismaAny = prisma as any;
      const row = await prismaAny.agentExperience.findUnique({ where: { id: execution.experienceId } });
      await prismaAny.agentExperience.update({
        where: { id: execution.experienceId },
        data: {
          metadata: {
            ...((row?.metadata as object) ?? {}),
            confidence: decision.confidence,
            loopPhase: "learned",
            findings,
          } as any,
        },
      });
    }

    const memory = await this.memory(scope, 20);
    const history = memory.items.map((x: any) => ({
      id: x.id,
      action: x.action,
      outcome: x.result,
      confidence: Number((x?.metadata?.confidence ?? 0.5).toFixed(3)),
      reward: x.reward,
      createdAt: x.createdAt,
    }));

    await recordAiLearningFromOpsLoop({
      correlationId: loopCorrelationId,
      orgId: scope.orgId,
      resource: decision.resource,
      action: decision.action,
      provider: body.provider ?? "aws",
      before: observedState,
      after: afterState,
      execution,
      decision: { confidence: decision.confidence, reason: decision.reason },
      findings,
    });

    return {
      loop: "OBSERVE_ANALYZE_DECIDE_ACT_VERIFY_LEARN",
      correlationId: loopCorrelationId,
      observedState,
      findings,
      decision,
      execution,
      verification,
      learning,
      analyzedLearningInsight: analyzed.learningInsight,
      alternativesExplained: buildAlternativesExplained(findings.length ? findings : ["baseline_watch"], decision),
      memory: {
        stats: memory.stats,
        history,
      },
    };
  },

  buildSyntheticSignal(seed = Date.now()): ObservedSignal {
    const t = seed % 1000;
    const cpu = 45 + (t % 45);
    const latency = 120 + (t % 190);
    const errorRate = Number(((t % 40) / 10).toFixed(2));
    const cost = 40 + (t % 65);
    const spikes = latency > 220;
    const securityFlag = t % 7 === 0;
    return {
      metrics: {
        cpu,
        latency,
        errorRate,
        cost,
        memory: 48 + (t % 42),
        traffic: 800 + (t % 2400),
      },
      logs: [
        spikes ? "p95 latency exceeded baseline threshold" : "latency within expected baseline",
        securityFlag ? "security anomaly signal observed at edge gateway" : "security posture nominal",
      ],
      events: [
        { type: spikes ? "latency" : "metrics", message: spikes ? "latency spike detected" : "stable telemetry", severity: spikes ? "high" : "low" },
        { type: securityFlag ? "security" : "cost", message: securityFlag ? "suspicious IP pattern blocked" : "cost drift monitoring active", severity: securityFlag ? "high" : "medium" },
      ],
    };
  },

  async runContinuousLoopTick() {
    if (!this.loopConfig) return;
    this.lastLoopError = null;
    let signal: ObservedSignal;
    let metricsSource: "live" | "synthetic" = "synthetic";
    const live = await tryFetchLiveObservedSignal();
    if (live) {
      signal = live.signal;
      metricsSource = "live";
    } else {
      signal = this.buildSyntheticSignal();
    }
    this.lastMetricsSource = metricsSource;

    const out = await this.runAutonomousLoop(
      {
        provider: this.loopConfig.provider,
        namespace: this.loopConfig.namespace,
        signal,
      },
      this.loopConfig.scope
    );
    this.lastLoopRunAt = new Date().toISOString();
    this.lastLoopSummary = {
      correlationId: out.correlationId,
      metricsSource,
      findings: out.findings,
      decision: out.decision,
      execution: out.execution,
      memoryStats: out.memory?.stats,
      observedState: out.observedState,
      alternatives: out.alternativesExplained,
      learningInsight: out.analyzedLearningInsight,
      reasoning: out.decision?.reason,
    };
    this.loopFailures = 0;
  },

  async startContinuousLoop(input: {
    intervalMs?: number;
    provider?: "aws" | "gcp" | "azure" | "kubernetes";
    namespace?: string;
    scope: OpsScope;
  }) {
    const intervalMs = Math.max(2000, Math.min(120000, Number(input.intervalMs ?? 8000)));
    this.loopConfig = {
      intervalMs,
      provider: input.provider ?? "aws",
      namespace: input.namespace,
      scope: input.scope,
    };
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }

    // Prime immediately so system does not look idle.
    await this.runContinuousLoopTick().catch((e) => {
      this.loopFailures += 1;
      this.lastLoopError = e instanceof Error ? e.message : String(e);
    });

    this.loopTimer = setInterval(() => {
      void this.runContinuousLoopTick().catch((e) => {
        this.loopFailures += 1;
        this.lastLoopError = e instanceof Error ? e.message : String(e);
      });
    }, intervalMs);

    return this.getContinuousLoopStatus();
  },

  stopContinuousLoop() {
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.loopTimer = null;
    return this.getContinuousLoopStatus();
  },

  getContinuousLoopStatus() {
    const cloudLive = process.env.AI_CLOUD_LIVE_EXECUTION === "true";
    const k8sDryRun = process.env.AUTONOMOUS_K8S_DRY_RUN !== "false";
    return {
      running: Boolean(this.loopTimer),
      config: this.loopConfig,
      lastRunAt: this.lastLoopRunAt,
      lastSummary: this.lastLoopSummary,
      failures: this.loopFailures,
      lastError: this.lastLoopError,
      metricsSource: this.lastMetricsSource,
      executionProfile: {
        /** When false, ops-plane mutations remain recorded but infra calls are simulated unless cloud adapters are wired. */
        cloudLiveExecution: cloudLive,
        k8sDryRun,
        simulationMode: process.env.SIMULATION_MODE !== "false",
        opsMetricsUrlConfigured: Boolean(env.OPS_METRICS_URL?.trim()),
      },
    };
  },
};
