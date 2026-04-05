import React, { useEffect, useMemo, useState } from "react";
import { Activity, Bot, BrainCircuit, Loader2, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import ModuleHeader from "./ModuleHeader";
import {
  getAutonomousActions,
  getAutonomousMode,
  getPredictions,
  runAutonomousLoop,
  setAutonomousMode,
  type MetricSample,
} from "@/lib/autonomous";
import { getOpsMemory, postOpsAnalyze, postOpsExecute, postOpsFeedback } from "@/lib/ai-ops-learning";
import { withContextQuery } from "@/lib/context";
import { getAIEmptyStateCopy } from "@/lib/ai-empty-state";

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const AIAutonomousView: React.FC = () => {
  const empty = getAIEmptyStateCopy();
  const [mode, setMode] = useState({ enabled: false, confidenceThreshold: 0.7, maxActionsPerHour: 20, manualOverride: false });
  const [predictions, setPredictions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  const [opsCpu, setOpsCpu] = useState(87);
  const [opsLat, setOpsLat] = useState(120);
  const [opsErr, setOpsErr] = useState(1.2);
  const [opsCost, setOpsCost] = useState(15);
  const [opsAnalyze, setOpsAnalyze] = useState<Record<string, unknown> | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsExperienceId, setOpsExperienceId] = useState<string | null>(null);
  const [opsManualApprove, setOpsManualApprove] = useState(false);
  const [memoryStats, setMemoryStats] = useState<{ count: number; avgReward: number } | null>(null);

  const refresh = async () => {
    const [m, p, a] = await Promise.all([getAutonomousMode(), getPredictions(), getAutonomousActions()]);
    setMode(m);
    setPredictions(p);
    setActions(a);
  };

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load autonomous state");
      } finally {
        setBooting(false);
      }
    })();
    void (async () => {
      try {
        const m = await getOpsMemory(30);
        setMemoryStats(m.stats);
      } catch {
        // optional
      }
    })();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/autonomous/stream`));
    const handler = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data);
        setEvents((prev) => [...prev, parsed].slice(-200));
      } catch {
        // no-op
      }
    };
    es.addEventListener("prediction", handler as EventListener);
    es.addEventListener("decision", handler as EventListener);
    es.addEventListener("action", handler as EventListener);
    return () => es.close();
  }, []);

  const toggleMode = async () => {
    try {
      const next = await setAutonomousMode({ enabled: !mode.enabled });
      setMode(next);
      toast.success(next.enabled ? "Autonomous mode enabled" : "Autonomous mode disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle mode");
    }
  };

  const runClosedLoopAnalyze = async () => {
    setOpsLoading(true);
    try {
      const out = await postOpsAnalyze({
        state: { cpu: opsCpu, latency: opsLat, errorRate: opsErr, cost: opsCost },
      });
      setOpsAnalyze(out);
      toast.success("Multi-agent analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setOpsLoading(false);
    }
  };

  const runClosedLoopExecute = async () => {
    const decision = String(opsAnalyze?.decision ?? "");
    if (!decision) {
      toast.error("Run Analyze first");
      return;
    }
    setOpsLoading(true);
    try {
      const out = await postOpsExecute({
        state: { cpu: opsCpu, latency: opsLat, errorRate: opsErr, cost: opsCost },
        action: decision,
        resource: "api-gateway",
        namespace: "prod",
        provider: "aws",
        manualApproval: opsManualApprove,
      });
      setOpsExperienceId(typeof out.experienceId === "string" ? out.experienceId : null);
      toast.success(String(out.status ?? "ok"));
      const m = await getOpsMemory(30);
      setMemoryStats(m.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setOpsLoading(false);
    }
  };

  const runClosedLoopFeedback = async () => {
    if (!opsExperienceId) {
      toast.error("No experience id — execute first");
      return;
    }
    setOpsLoading(true);
    try {
      const out = await postOpsFeedback({
        experienceId: opsExperienceId,
        before: { cpu: opsCpu, latency: opsLat, errorRate: opsErr, cost: opsCost },
        after: { cpu: 62, latency: 90, errorRate: 0.9, cost: opsCost + 2 },
      });
      toast.success(String(out.insight ?? "Feedback recorded"));
      const m = await getOpsMemory(30);
      setMemoryStats(m.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setOpsLoading(false);
    }
  };

  const runLoop = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const metrics: MetricSample[] = Array.from({ length: 12 }).map((_, i) => ({
        ts: new Date(now - (11 - i) * 5 * 60 * 1000).toISOString(),
        cpu: Math.min(0.98, 0.35 + Math.random() * 0.6),
        memory: Math.min(0.98, 0.4 + Math.random() * 0.55),
        traffic: Math.min(0.98, 0.3 + Math.random() * 0.65),
        errors: Math.min(0.95, 0.02 + Math.random() * 0.3),
      }));
      await runAutonomousLoop({
        provider: "aws",
        deploymentName: "api-gateway",
        namespace: "prod",
        historicalMetrics: metrics,
      });
      toast.success("Autonomous control loop executed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Loop execution failed");
    } finally {
      setLoading(false);
    }
  };

  const systemHealth = useMemo(() => {
    const recent = actions.slice(0, 20);
    const ok = recent.filter((x) => String(x.status).includes("EXECUTED")).length;
    return recent.length ? Math.round((ok / recent.length) * 100) : 100;
  }, [actions]);

  return (
    <div className="space-y-6 pb-10">
      <ModuleHeader title="Autonomous AI Control Plane" subtitle="Observe → Predict → Decide → Act → Learn" />

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/45">Autonomous Mode</p>
          <p className="text-sm text-white/80 mt-1">{mode.enabled ? "ON — AI control active" : "OFF — manual control"}</p>
        </div>
        <button onClick={() => void toggleMode()} className="h-10 px-4 rounded-xl bg-[#111827] border border-white/10 text-white">
          {mode.enabled ? <ToggleRight className="w-5 h-5 inline mr-2 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 inline mr-2 text-white/40" />}
          {mode.enabled ? "Disable" : "Enable"}
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Predictions</p>
          <p className="text-3xl font-bold text-white mt-2">{predictions.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Actions Taken</p>
          <p className="text-3xl font-bold text-white mt-2">{actions.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45">System Health</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{systemHealth}%</p>
        </div>
      </div>

      <section className="rounded-2xl border border-indigo-500/20 bg-[#0B1220] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-indigo-300">Closed-loop learning</p>
            <p className="text-sm text-white/80 mt-1">Detect → orchestrate → act → measure reward → memory</p>
          </div>
          {memoryStats && (
            <div className="text-right text-[11px] text-white/50">
              Memory: {memoryStats.count} experiences · avg reward {memoryStats.avgReward}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          <label className="space-y-1">
            <span className="text-white/45">CPU %</span>
            <input
              type="number"
              value={opsCpu}
              onChange={(e) => setOpsCpu(Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-white/10 bg-[#111827] px-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-white/45">Latency ms</span>
            <input
              type="number"
              value={opsLat}
              onChange={(e) => setOpsLat(Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-white/10 bg-[#111827] px-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-white/45">Error %</span>
            <input
              type="number"
              step="0.1"
              value={opsErr}
              onChange={(e) => setOpsErr(Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-white/10 bg-[#111827] px-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-white/45">Cost index</span>
            <input
              type="number"
              value={opsCost}
              onChange={(e) => setOpsCost(Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-white/10 bg-[#111827] px-2 text-white"
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-white/70">
          <input type="checkbox" checked={opsManualApprove} onChange={(e) => setOpsManualApprove(e.target.checked)} className="accent-indigo-500" />
          Treat as approved (high-risk policy bypass for demo)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={opsLoading}
            onClick={() => void runClosedLoopAnalyze()}
            className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-sm"
          >
            Analyze
          </button>
          <button
            type="button"
            disabled={opsLoading}
            onClick={() => void runClosedLoopExecute()}
            className="h-9 px-4 rounded-xl bg-emerald-700/80 text-white text-sm border border-emerald-500/30"
          >
            Execute decision
          </button>
          <button
            type="button"
            disabled={opsLoading}
            onClick={() => void runClosedLoopFeedback()}
            className="h-9 px-4 rounded-xl bg-[#111827] border border-white/10 text-white text-sm"
          >
            Submit feedback (simulated after)
          </button>
        </div>
        {opsAnalyze && (
          <div className="rounded-xl border border-white/10 bg-[#060a12] p-3 font-mono text-[11px] text-white/80 space-y-2">
            <p>
              <span className="text-indigo-300">Decision:</span> {String(opsAnalyze.decision ?? "")} ·{" "}
              <span className="text-white/50">{String(opsAnalyze.reason ?? "")}</span>
            </p>
            <p className="text-emerald-300/90">{String(opsAnalyze.learningInsight ?? "")}</p>
            <p className="text-white/55">
              SRE: {String((opsAnalyze.agents as any)?.sre?.recommendation ?? "")} · Cost:{" "}
              {String((opsAnalyze.agents as any)?.cost?.recommendation ?? "")} · Sec:{" "}
              {String((opsAnalyze.agents as any)?.security?.recommendation ?? "")}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Control Loop</p>
          <button
            type="button"
            disabled={loading || booting}
            onClick={() => void runLoop()}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 inline mr-2" />}
            Run Loop
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/45">Predictions Panel</p>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
            {predictions.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-white/35">
                <p>{empty.title}</p>
                <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
              </div>
            ) : predictions.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <p className="text-sm text-white/85">{p.predictedIssue}</p>
                <p className="text-[11px] text-white/45">Risk {(p.riskScore * 100).toFixed(0)}% · Failure {(p.failureProbability * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#060a12] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/45">Decision & Action Stream</p>
          </div>
          <div className="p-3 h-[420px] overflow-y-auto font-mono text-[12px]">
            {events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/35">
                <p>{empty.title}</p>
                <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
              </div>
            ) : events.map((e, idx) => (
              <div key={`${e.ts}-${idx}`} className="grid grid-cols-[120px_90px_1fr] gap-2 py-1">
                <span className="text-white/35">{new Date(e.ts).toLocaleTimeString()}</span>
                <span className="text-indigo-300 uppercase">{e.type}</span>
                <span className="text-white/80">{JSON.stringify(e.payload ?? {})}</span>
              </div>
            ))}
          </div>
          <div className="h-10 px-4 border-t border-white/10 text-[10px] text-white/35 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Confidence threshold {Math.round(mode.confidenceThreshold * 100)}% · Max actions/hr {mode.maxActionsPerHour}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIAutonomousView;

