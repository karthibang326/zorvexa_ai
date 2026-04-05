import { randomUUID } from "crypto";
import { WSServer } from "../../websocket";
import { prisma } from "../../lib/prisma";
import { logError } from "../../lib/logger";
import { env } from "../../config/env";
import { publishAiStreamToRedis, startAiStreamRedisSubscriber } from "./ai-stream.redis";
import type { AiStreamEventPayload, AiStreamPhase } from "./ai-stream.types";
import { MetricsSimulator } from "../ai-decision-engine/metrics-simulator";
import { detectAnomalies } from "../ai-decision-engine/detection.engine";
import { decide } from "../ai-decision-engine/decision.engine";
import { executeUnifiedAiDecision } from "../multi-cloud/unified-execution.engine";
import { verifyOutcome } from "../ai-decision-engine/verification.engine";
import { getLearningHintsForResource, recordAiLearningOutcome } from "../ai-learning/learning.service";
import type { AiLoopOutcome, MetricSnapshot } from "../ai-decision-engine/types";

const recentRing: AiStreamEventPayload[] = [];
const MAX_RECENT = 400;

let timer: ReturnType<typeof setInterval> | null = null;
let redisUnsub: (() => void) | null = null;
const metricsSimulator = new MetricsSimulator();
let loopInFlight = false;

function pushRecent(e: AiStreamEventPayload) {
  recentRing.unshift(e);
  if (recentRing.length > MAX_RECENT) recentRing.length = MAX_RECENT;
}

async function persistStreamEvent(e: AiStreamEventPayload) {
  if (env.AI_STREAM_PERSIST !== "true") return;
  try {
    await prisma.aiStreamEvent.create({
      data: {
        phase: e.phase,
        title: e.title,
        detail: e.detail,
        correlationId: e.correlationId,
        payload: (e.meta ?? {}) as object,
      },
    });
  } catch (err) {
    logError("ai_stream_persist_failed", { message: err instanceof Error ? err.message : String(err) });
  }
}

async function persistDecisionRun(args: {
  correlationId: string;
  resource: string;
  detection: unknown;
  decision: unknown;
  execution: unknown;
  verification: unknown;
  outcome: AiLoopOutcome;
  improvementScore: number | null;
}) {
  if (env.AI_DECISION_PERSIST !== "true") return;
  try {
    await prisma.aiDecisionRun.create({
      data: {
        correlationId: args.correlationId,
        resource: args.resource,
        detection: args.detection as object,
        decision: args.decision as object,
        execution: args.execution as object,
        verification: args.verification as object,
        outcome: args.outcome,
        improvementScore: args.improvementScore ?? undefined,
      },
    });
  } catch (err) {
    logError("ai_decision_persist_failed", { message: err instanceof Error ? err.message : String(err) });
  }
}

function buildEvent(partial: {
  phase: AiStreamPhase;
  title: string;
  detail: string;
  correlationId: string;
  meta?: AiStreamEventPayload["meta"];
}): AiStreamEventPayload {
  return {
    type: "ai.stream",
    version: 1,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phase: partial.phase,
    title: partial.title,
    detail: partial.detail,
    ts: Date.now(),
    correlationId: partial.correlationId,
    meta: partial.meta,
  };
}

/**
 * @param options.publishRedis — set true when fan-out to other API instances via Redis (avoid for local synthetic ticks).
 */
export function emitAiStreamEvent(event: AiStreamEventPayload, options?: { publishRedis?: boolean }) {
  pushRecent(event);
  WSServer.broadcastAiStream(event);
  void persistStreamEvent(event);
  if (options?.publishRedis === true || env.AI_STREAM_PUBLISH_SYNTHETIC_TO_REDIS === "true") {
    void publishAiStreamToRedis(event);
  }
}

const PHASE_GAP_MS = 180;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function outcomeFromVerification(improved: boolean, actionNone: boolean): AiLoopOutcome {
  if (actionNone) return "noop";
  return improved ? "success" : "partial";
}

/** Full autonomous loop: detect → decide → act → verify; streams 4 WebSocket phases (ACTION runs after DECISION). */
export async function runAiDecisionLoopCycle(): Promise<void> {
  const correlationId = randomUUID();
  const beforeMetrics: MetricSnapshot = metricsSimulator.next();
  const detection = detectAnomalies(beforeMetrics);
  const learningHints = await getLearningHintsForResource(beforeMetrics.resource, env.AI_LEARNING_ORG_ID);
  const decision = decide(detection, beforeMetrics, learningHints);

  const emitPhase = (phase: AiStreamPhase, title: string, detail: string, meta: AiStreamEventPayload["meta"]) => {
    emitAiStreamEvent(buildEvent({ phase, title, detail, correlationId, meta }));
  };

  // DETECT
  emitPhase(
    "DETECT",
    detection.hasAnomaly ? "Anomaly identified" : "Health check — within SLO",
    detection.summary,
    {
      resource: beforeMetrics.resource,
      cloudTargetProvider: beforeMetrics.provider,
      confidence: detection.hasAnomaly ? 0.88 : 0.93,
      latencyMs: beforeMetrics.latencyP95Ms,
      healthScore: detection.hasAnomaly ? 72 : 96,
      anomalyKinds: detection.signals.map((s) => s.kind),
      kpiDelta: {
        cpu: beforeMetrics.cpuPct,
        memory: beforeMetrics.memoryPct,
        latency: beforeMetrics.latencyP95Ms,
        errorsBps: beforeMetrics.errorRateBps,
      },
    }
  );
  await delay(PHASE_GAP_MS);

  // DECISION
  emitPhase(
    "DECISION",
    decision.action === "none" ? "Observe — no change" : "Remediation selected",
    `${decision.reason} — ${decision.detail}`,
    {
      resource: beforeMetrics.resource,
      cloudTargetProvider: decision.provider,
      confidence: Math.round(decision.confidence * 100),
      risk: decision.risk,
      action: decision.action,
      anomalyKinds: detection.signals.map((s) => s.kind),
      learningAdjusted: decision.learningAdjusted,
    }
  );
  await delay(PHASE_GAP_MS);

  const execution = await executeUnifiedAiDecision(decision, beforeMetrics.resource);
  const verification = verifyOutcome(beforeMetrics, decision, execution);

  const actionTitle =
    decision.action === "none"
      ? "No mutation"
      : execution.guardrailBlocked
        ? "Guardrail — action blocked"
        : execution.success
          ? execution.provider === "kubernetes"
            ? "Kubernetes apply"
            : execution.provider === "simulation"
              ? `Simulated · ${decision.provider}`
              : `${execution.provider.toUpperCase()} apply`
          : "Execution failed";

  // ACTION
  emitPhase("ACTION", actionTitle, execution.message, {
    resource: beforeMetrics.resource,
    cloudTargetProvider: decision.provider,
    confidence: Math.round(decision.confidence * 100),
    risk: decision.risk,
    action: decision.action,
    provider: execution.provider,
    targetProvider: execution.targetProvider ?? decision.provider,
    k8s: execution.k8s,
    guardrailBlocked: execution.guardrailBlocked,
  });
  await delay(PHASE_GAP_MS);

  // RESULT
  const outcome = outcomeFromVerification(verification.improved, decision.action === "none");
  emitPhase("RESULT", verification.improved ? "Verification passed" : "Verification — follow-up", verification.summary, {
    resource: beforeMetrics.resource,
    cloudTargetProvider: decision.provider,
    healthScore: verification.improvementScore,
    improvementScore: verification.improvementScore,
    confidence: Math.round(decision.confidence * 100),
    k8sReplicas: verification.k8sReplicas,
    kpiDelta: {
      p95Before: verification.before.latencyP95Ms,
      p95After: verification.after.latencyP95Ms,
      cpuBefore: verification.before.cpuPct,
      cpuAfter: verification.after.cpuPct,
    },
  });

  await persistDecisionRun({
    correlationId,
    resource: beforeMetrics.resource,
    detection,
    decision,
    execution,
    verification,
    outcome,
    improvementScore: verification.improvementScore,
  });

  await recordAiLearningOutcome({
    correlationId,
    orgId: env.AI_LEARNING_ORG_ID,
    resource: beforeMetrics.resource,
    action: decision.action,
    provider: decision.provider,
    detection,
    decision,
    execution,
    verification,
    outcome,
    beforeMetrics,
  });
}

/** Legacy static narrative (4 unrelated lines). Only used when AI_DECISION_ENGINE=false. */
const LEGACY_PIPELINE: Array<{ phase: AiStreamPhase; title: string; detail: string; resource: string }> = [
  {
    phase: "DETECT",
    title: "Anomaly signal",
    detail: "Elevated p95 latency on payments-api in prod-eu-west-1 (SLO burn 12%).",
    resource: "payments-api",
  },
  {
    phase: "DECISION",
    title: "Remediation plan",
    detail: "Scale deployment +2 replicas; enable circuit breaker on checkout dependency.",
    resource: "payments-api",
  },
  {
    phase: "ACTION",
    title: "Execute change",
    detail: "Rolling scale-out with maxUnavailable=1; canary traffic 5% for 2m.",
    resource: "payments-api",
  },
  {
    phase: "RESULT",
    title: "Verification",
    detail: "p95 −18%, error rate flat; rollback window closed — state healthy.",
    resource: "payments-api",
  },
];

let legacyIndex = 0;
let legacyCorrelation = randomUUID();

function tickLegacyPipeline() {
  const step = LEGACY_PIPELINE[legacyIndex % LEGACY_PIPELINE.length];
  if (legacyIndex % LEGACY_PIPELINE.length === 0) {
    legacyCorrelation = randomUUID();
  }
  const idx = legacyIndex % LEGACY_PIPELINE.length;
  legacyIndex += 1;
  const confidence = 72 + ((idx * 7 + Date.now()) % 25);
  const latencyMs = 40 + idx * 35 + (Date.now() % 80);
  const healthScore = Math.min(99.5, 82 + idx * 4 + (Date.now() % 5));
  emitAiStreamEvent(
    buildEvent({
      phase: step.phase,
      title: step.title,
      detail: step.detail,
      correlationId: legacyCorrelation,
      meta: {
        resource: step.resource,
        confidence,
        latencyMs,
        healthScore,
        kpiDelta: { p95Ms: -18 - (idx % 3), errorRateBps: -2, costUnits: idx === 3 ? -4 : 0 },
      },
    })
  );
}

async function tickPipeline() {
  if (loopInFlight) return;
  loopInFlight = true;
  try {
    if (env.AI_DECISION_ENGINE === "true" && env.AI_STREAM_SYNTHETIC !== "false") {
      await runAiDecisionLoopCycle();
    } else if (env.AI_STREAM_SYNTHETIC !== "false") {
      tickLegacyPipeline();
    }
  } catch (e) {
    logError("ai_decision_loop_failed", { message: e instanceof Error ? e.message : String(e) });
  } finally {
    loopInFlight = false;
  }
}

export function getRecentAiStreamEvents(limit: number): AiStreamEventPayload[] {
  return recentRing.slice(0, Math.max(1, Math.min(200, limit)));
}

export function startAiStreamPipeline() {
  if (env.AI_STREAM_SYNTHETIC === "false") {
    // Redis-only mode
  } else {
    const intervalMs = env.AI_STREAM_INTERVAL_MS;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      void tickPipeline();
    }, Math.max(2500, intervalMs));
  }

  redisUnsub = startAiStreamRedisSubscriber((payload) => {
    pushRecent(payload);
    WSServer.broadcastAiStream(payload);
  });
}

export function stopAiStreamPipeline() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  redisUnsub?.();
  redisUnsub = null;
}
