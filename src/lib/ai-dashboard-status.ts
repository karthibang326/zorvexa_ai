/** Unified AI control surface — single source of truth for header + dashboard copy. */

export type AiControlMode =
  | "autonomous_active"
  | "partial_control"
  | "ai_paused"
  /** No org linked — stream and controls are not tenant-scoped (global / demo). */
  | "no_tenant_workspace";

export type SystemHealthTier = "operational" | "degraded" | "simulated";

export function deriveAiControlMode(params: {
  autonomousEnabled: boolean;
  manualOverride: boolean;
  /** `false` = API returned zero orgs; `null`/`undefined` = unknown or still loading. */
  tenantWorkspaceLinked?: boolean | null;
}): AiControlMode {
  if (params.tenantWorkspaceLinked === false) return "no_tenant_workspace";
  if (!params.autonomousEnabled) return "ai_paused";
  if (params.manualOverride) return "partial_control";
  return "autonomous_active";
}

export function deriveSystemHealth(params: {
  hasLiveInfra: boolean;
  demoMode: boolean;
  loopRunning: boolean;
  loopFailures: number;
}): SystemHealthTier {
  if (params.demoMode || !params.hasLiveInfra) return "simulated";
  if (params.loopFailures > 2) return "degraded";
  if (params.loopRunning) return "operational";
  return "degraded";
}

export function riskLevelWithContext(level: "LOW" | "MED" | "HIGH"): { label: string; detail: string } {
  switch (level) {
    case "HIGH":
      return {
        label: "HIGH",
        detail: "Multiple stress signals or policy pressure — AI is prioritizing containment and recovery paths.",
      };
    case "MED":
      return {
        label: "MED",
        detail: "Within elevated watch — autonomous loop is tightening observation and pre-emptive guardrails.",
      };
    default:
      return {
        label: "LOW",
        detail: "Stable posture — no acute risk concentration in the current evaluation window.",
      };
  }
}

export const AI_CONTROL_MODE_COPY: Record<
  AiControlMode,
  { title: string; short: string; className: string }
> = {
  autonomous_active: {
    title: "Autonomous Active",
    short: "Full AI loop",
    className: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  },
  partial_control: {
    title: "Partial Control",
    short: "Overrides on",
    className: "border-amber-400/35 bg-amber-500/12 text-amber-100",
  },
  ai_paused: {
    title: "AI Paused",
    short: "Supervisor hold",
    className: "border-zinc-500/40 bg-zinc-800/60 text-zinc-200",
  },
  no_tenant_workspace: {
    title: "AI · Not tenant-scoped",
    short: "No workspace linked — global / simulation only",
    className: "border-sky-400/35 bg-sky-500/12 text-sky-100",
  },
};

export const SYSTEM_HEALTH_COPY: Record<SystemHealthTier, { label: string; detail: string; className: string }> = {
  operational: {
    label: "Healthy",
    detail: "Control loop and signals within expected bounds.",
    className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  },
  degraded: {
    label: "Degraded",
    detail: "Loop lagging or signals uneven — AI is compensating.",
    className: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  },
  simulated: {
    label: "Simulation",
    detail: "AI in Simulation Mode — no live infrastructure path; outputs are synthetic.",
    className: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  },
};

const FINDING_LABEL: Record<string, string> = {
  high_cpu: "CPU pressure above comfort band",
  high_latency: "Latency elevated vs baseline",
  high_errors: "Error budget consuming faster than target",
  latency_spike: "Latency spike vs rolling baseline",
  cost_anomaly: "Spend drift outside expected band",
  error_rate_anomaly: "Error rate anomaly detected",
  security_anomaly: "Security signal at the edge",
};

/** Human-readable issue line from loop findings or API reason. */
export function formatLoopIssue(findings?: string[] | null, reason?: string | null): string {
  if (reason && reason.trim()) return reason.trim();
  if (!findings?.length) return "";
  return findings.map((f) => FINDING_LABEL[f] ?? f.replace(/_/g, " ")).join(" · ");
}

/** Nominal demo baselines — same scale as `postOpsAutonomousRun` fallback metrics in Dashboard. */
const IMPACT_LAT_BASE_MS = 200;
const IMPACT_COST_INDEX = 100;

/**
 * Derive “impact” % rows for the decision card from ops-loop `observedState` (latency ms, cost index 0–100).
 * When fields are missing, returns nulls so the card falls back to its keyword heuristics.
 */
export function deriveImpactPercentFromObserved(observed?: {
  latency?: number;
  cost?: number;
} | null): { latencyImpactPct: number | null; costImpactPct: number | null } {
  if (!observed) return { latencyImpactPct: null, costImpactPct: null };
  let latencyImpactPct: number | null = null;
  let costImpactPct: number | null = null;
  if (typeof observed.latency === "number" && Number.isFinite(observed.latency) && observed.latency > 0) {
    latencyImpactPct = Math.round(((observed.latency - IMPACT_LAT_BASE_MS) / IMPACT_LAT_BASE_MS) * 100);
  }
  if (typeof observed.cost === "number" && Number.isFinite(observed.cost) && observed.cost > 0) {
    costImpactPct = Math.round(((observed.cost - IMPACT_COST_INDEX) / IMPACT_COST_INDEX) * 100);
  }
  return { latencyImpactPct, costImpactPct };
}

export function humanizeExecutionStatus(status?: string | null): string {
  if (!status) return "";
  const s = status.trim();
  if (s === "EXECUTED") return "Executed successfully";
  return s.replace(/_/g, " ");
}

export type AiDecisionSource = "ops" | "k8s";

export type OpsLoopSnapshot = {
  running: boolean;
  action?: string;
  execStatus?: string;
  confidence?: number;
  issue?: string;
  resource?: string;
} | null;

export type K8sAutonomousSnapshot = {
  lastActions?: Array<{ action: string; target: string; outcome: string; confidence: number }>;
  lastIssues?: Array<{
    type: string;
    reason: string;
    confidence: number;
    namespace?: string;
    pod?: string;
    node?: string;
  }>;
} | null;

function normalizeConfidence(c: number | undefined): number | undefined {
  if (typeof c !== "number" || Number.isNaN(c)) return undefined;
  return c > 1 ? c / 100 : c;
}

/**
 * When the ops loop is idle, prefer the latest Kubernetes AI signal if present.
 * When the loop is running, prefer ops decisions; fall back to K8s if ops has no summary yet.
 */
export function resolveAIDecisionPanelModel(
  loop: OpsLoopSnapshot,
  k8s: K8sAutonomousSnapshot
): {
  source: AiDecisionSource;
  issue?: string;
  action?: string;
  confidence?: number;
  result?: string;
  resource?: string;
} | null {
  const opsHas = Boolean(loop?.action?.trim() || loop?.issue?.trim());
  const k8sA = k8s?.lastActions?.[0];
  const k8sI = k8s?.lastIssues?.[0];
  const k8sHas = Boolean(k8sA || k8sI);
  const loopRunning = Boolean(loop?.running);

  const fromOps = () => ({
    source: "ops" as const,
    issue: loop?.issue,
    action: loop?.action,
    confidence: loop?.confidence,
    result: humanizeExecutionStatus(loop?.execStatus) || (loop?.execStatus ? String(loop.execStatus) : undefined),
    resource: loop?.resource,
  });

  const fromK8s = () => {
    const issue = k8sI
      ? `${k8sI.type} — ${k8sI.reason}`
      : k8sA
        ? "No open issue — proactive cluster adjustment"
        : undefined;
    const action = k8sA ? `${k8sA.action} on ${k8sA.target}` : k8sI ? "Triage cluster signal" : undefined;
    const confidence = normalizeConfidence(k8sA?.confidence ?? k8sI?.confidence);
    let result = k8sA?.outcome?.trim() || undefined;
    if (!result && k8sI && !k8sA) result = "Observing — remediation pending";
    const resource = k8sA?.target || k8sI?.namespace || k8sI?.pod || k8sI?.node;
    return {
      source: "k8s" as const,
      issue,
      action,
      confidence,
      result,
      resource,
    };
  };

  if (!loopRunning && k8sHas) return fromK8s();
  if (loopRunning && opsHas) return fromOps();
  if (loopRunning && !opsHas && k8sHas) return fromK8s();
  if (!loopRunning && !k8sHas && opsHas) return fromOps();
  if (opsHas) return fromOps();
  if (k8sHas) return fromK8s();
  return null;
}
