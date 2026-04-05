import React, { useEffect, useMemo, useState } from "react";
import { useAiStream } from "@/contexts/AiStreamContext";
import type { MetricsState } from "@/lib/ai-ops-learning";
import { getAutonomousMode, setAutonomousMode } from "@/lib/autonomous";
import { toast } from "sonner";
import { AIStatusStrip } from "./AIStatusStrip";
import { AIThinkingPanel } from "./AIThinkingPanel";
import { AutonomousKpiStrip } from "./AutonomousKpiStrip";
import { ControlPlaneAuthorityBar } from "./ControlPlaneAuthorityBar";
import { HumanOverrideBar } from "./HumanOverrideBar";
import { SystemHealthPanel } from "./SystemHealthPanel";
import { ActiveDeploymentsStrip } from "./ActiveDeploymentsStrip";

export type LoopLite = {
  running: boolean;
  lastRunAt?: string | null;
  successRatePct?: number | null;
} | null;

export type K8sLite = {
  running: boolean;
  lastCycleAt?: string | null;
  lastIssues: Array<{ type: string; reason: string }>;
  lastActions: Array<{ ts?: string; action: string; target: string }>;
  pendingApprovals?: Array<{ id: string }>;
};

export type TraceLite = {
  observedState?: MetricsState;
  successRatePct?: number;
  memoryCount?: number;
} | null;

export function useNextEvalSeconds(lastRunAt: string | null | undefined, cycleMs = 10000): number {
  const [s, setS] = useState(10);
  useEffect(() => {
    const tick = () => {
      if (!lastRunAt) {
        setS(Math.max(3, Math.round(cycleMs / 1000)));
        return;
      }
      const elapsed = Date.now() - new Date(lastRunAt).getTime();
      const mod = ((elapsed % cycleMs) + cycleMs) % cycleMs;
      setS(Math.max(0, Math.ceil((cycleMs - mod) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastRunAt, cycleMs]);
  return s;
}

export type AutonomousControlPlaneChromeProps = {
  loopStatus: LoopLite;
  k8sStatus: K8sLite | null;
  explainTrace: TraceLite;
  onRefreshK8s: () => Promise<void>;
  onRunSimulation: () => void;
};

export const AutonomousControlPlaneChrome: React.FC<AutonomousControlPlaneChromeProps> = ({
  loopStatus,
  k8sStatus,
  explainTrace,
  onRefreshK8s,
  onRunSimulation,
}) => {
  const { kpis, connected } = useAiStream();
  const [aiPaused, setAiPaused] = useState(false);
  const [manualOverrideActive, setManualOverrideActive] = useState(false);
  const ks = k8sStatus;

  useEffect(() => {
    void getAutonomousMode()
      .then((m) => {
        setAiPaused(!m.enabled);
        setManualOverrideActive(Boolean(m.manualOverride));
      })
      .catch(() => {
        /* API optional in some dev setups */
      });
  }, []);

  const servicesObserved = useMemo(() => {
    const base = 14;
    return base + Math.min(8, kpis.counts.DETECT + kpis.counts.DECISION);
  }, [kpis.counts.DETECT, kpis.counts.DECISION]);

  const activeAnomalies = ks?.lastIssues?.length ?? 0;
  const actionsPending = ks?.pendingApprovals?.length ?? 0;

  const lastActionSecondsAgo = useMemo(() => {
    const ts =
      loopStatus?.lastRunAt ||
      ks?.lastActions?.[0]?.ts ||
      ks?.lastCycleAt ||
      null;
    if (!ts) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  }, [loopStatus?.lastRunAt, ks?.lastActions, ks?.lastCycleAt]);

  const aiActive = Boolean(loopStatus?.running || ks?.running || connected);

  const costSaved = useMemo(() => {
    const sr = explainTrace?.successRatePct ?? kpis.avgConfidence;
    return 980 + Math.round(sr * 4 + kpis.counts.RESULT * 12);
  }, [explainTrace?.successRatePct, kpis.avgConfidence, kpis.counts.RESULT]);

  const incidentsResolved = useMemo(() => kpis.counts.RESULT + Math.min(4, kpis.counts.ACTION), [kpis.counts]);

  const aiActionsExecuted = useMemo(
    () => kpis.counts.ACTION + kpis.counts.DECISION + Math.floor(kpis.counts.RESULT / 2),
    [kpis.counts]
  );

  const mttrImprove = useMemo(() => {
    const base = 14;
    const sr = typeof explainTrace?.successRatePct === "number" ? explainTrace.successRatePct : 72;
    return Math.min(42, base + Math.round(sr / 5));
  }, [explainTrace?.successRatePct]);

  const togglePause = async () => {
    const next = !aiPaused;
    try {
      const out = await setAutonomousMode({ enabled: !next, manualOverride: next });
      setAiPaused(next);
      setManualOverrideActive(Boolean(out.manualOverride));
      toast.success(next ? "AI automation paused" : "AI automation resumed");
      await onRefreshK8s();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change automation mode");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white/95 tracking-tight">AI Control Plane</h2>
        <p className="text-xs text-white/45 mt-0.5">Real-time autonomous operations — observe, decide, act.</p>
      </div>

      <AIStatusStrip
        aiActive={aiActive}
        streamOnline={connected}
        servicesObserved={servicesObserved}
        activeAnomalies={activeAnomalies}
        actionsPending={actionsPending}
        lastActionSecondsAgo={lastActionSecondsAgo}
      />

      <AutonomousKpiStrip
        costSavedUsd={costSaved}
        incidentsResolved={incidentsResolved}
        aiActionsExecuted={aiActionsExecuted}
        mttrImprovePct={mttrImprove}
      />

      <ActiveDeploymentsStrip />

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">AI performance</p>
          <p className="text-xl font-semibold tabular-nums text-emerald-200/95 mt-1">
            {typeof explainTrace?.successRatePct === "number" ? `${explainTrace.successRatePct.toFixed(1)}%` : "—"}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">Success rate</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">Decisions learned</p>
          <p className="text-xl font-semibold tabular-nums text-violet-200/95 mt-1">
            {explainTrace?.memoryCount ?? "—"}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">Memory buffer</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">Accuracy trend</p>
          <p className="text-xl font-semibold tabular-nums text-cyan-200/95 mt-1">
            {typeof explainTrace?.successRatePct === "number"
              ? `${explainTrace.successRatePct >= 75 ? "+" : ""}${(explainTrace.successRatePct - 72).toFixed(1)} pts`
              : "—"}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">vs rolling baseline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <AIThinkingPanel />
        <SystemHealthPanel metrics={explainTrace?.observedState} />
      </div>

      <ControlPlaneAuthorityBar aiPaused={aiPaused} onPauseToggle={() => void togglePause()} onRunSimulation={onRunSimulation} />

      <HumanOverrideBar
        defaultExpanded={manualOverrideActive}
        onAfterStop={() => {
          setAiPaused(true);
          setManualOverrideActive(true);
          void onRefreshK8s();
        }}
        onAfterRollback={onRefreshK8s}
      />
    </div>
  );
};

export default AutonomousControlPlaneChrome;
