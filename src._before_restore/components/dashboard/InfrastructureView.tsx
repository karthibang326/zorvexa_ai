import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Brain, DollarSign, PauseCircle, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ModuleHeader from "./ModuleHeader";
import {
  getAICeoStatus,
  postOptimizeAllSystems,
  postPauseAICeo,
  postScaleCriticalServices,
  postStabilizeSystem,
} from "@/lib/ai-ceo";
import { getAutonomousActions, getAutonomousMode, setAutonomousMode } from "@/lib/autonomous";
import { withContextQuery } from "@/lib/context";

type Risk = "low" | "medium" | "high";

type ClusterCardModel = {
  id: string;
  name: string;
  region: string;
  nodes: number;
  pods: number;
  cost: number;
  alerts: number;
  risk: Risk;
  aiAction: string;
  prediction: string;
};

const seedClusters: ClusterCardModel[] = [
  { id: "c1", name: "prod-us-east-1", region: "us-east-1", nodes: 12, pods: 84, cost: 520, alerts: 2, risk: "medium", aiAction: "Scaling +2 nodes", prediction: "CPU spike predicted in 12 min" },
  { id: "c2", name: "prod-eu-west-1", region: "eu-west-1", nodes: 8, pods: 56, cost: 380, alerts: 1, risk: "low", aiAction: "No action", prediction: "Traffic stable for next 30 min" },
  { id: "c3", name: "prod-ap-south-1", region: "ap-south-1", nodes: 6, pods: 38, cost: 240, alerts: 4, risk: "high", aiAction: "Security patch rollout", prediction: "Failure probability elevated to 74%" },
];

const riskClass: Record<Risk, string> = {
  low: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  high: "text-red-300 border-red-500/30 bg-red-500/10",
};

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  return `${root}/api`;
}

const InfrastructureView: React.FC = () => {
  const [clusters, setClusters] = useState<ClusterCardModel[]>(seedClusters);
  const [actions, setActions] = useState<Array<{ id: string; type: string; decision: string; status: string; confidence: number; createdAt: string }>>([]);
  const [events, setEvents] = useState<Array<{ ts?: string; type?: string; payload?: Record<string, unknown> }>>([]);
  const [aiOn, setAiOn] = useState(false);
  const [approvalMode, setApprovalMode] = useState(true);
  const [maxActions, setMaxActions] = useState(8);
  const [rollback, setRollback] = useState(true);
  const [busy, setBusy] = useState<null | "opt" | "stab" | "cost" | "pause">(null);

  const refresh = async () => {
    try {
      const [ceo, autoMode, recentActions] = await Promise.all([
        getAICeoStatus(),
        getAutonomousMode(),
        getAutonomousActions(),
      ]);
      setAiOn(Boolean(ceo.enabled) && !ceo.paused);
      setApprovalMode(Boolean(ceo.approvalMode ?? autoMode.manualOverride));
      setMaxActions(Number(ceo.maxActionsPerHour ?? autoMode.maxActionsPerHour ?? 8));
      setRollback(Boolean(ceo.rollbackEnabled));
      setActions(recentActions.slice(0, 8));
    } catch {
      // keep optimistic defaults
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/autonomous/stream`));
    const handler = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data) as { ts?: string; type?: string; payload?: Record<string, unknown> };
        setEvents((prev) => [parsed, ...prev].slice(0, 40));
        if (parsed.type === "action" && parsed.payload) {
          const target = String(parsed.payload.target ?? "");
          const action = String(parsed.payload.action ?? "autonomous action");
          setClusters((prev) =>
            prev.map((c) => (target.includes(c.name) || target === "organization" ? { ...c, aiAction: action } : c))
          );
        }
      } catch {
        // no-op
      }
    };
    es.addEventListener("signal", handler as EventListener);
    es.addEventListener("decision", handler as EventListener);
    es.addEventListener("action", handler as EventListener);
    return () => es.close();
  }, []);

  const runAction = async (kind: "opt" | "stab" | "cost" | "pause") => {
    setBusy(kind);
    try {
      if (kind === "opt") await postOptimizeAllSystems();
      if (kind === "stab") await postStabilizeSystem();
      if (kind === "cost") await postScaleCriticalServices();
      if (kind === "pause") await postPauseAICeo();
      toast.success("Action executed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const saveSafety = async () => {
    try {
      await setAutonomousMode({
        enabled: aiOn,
        manualOverride: approvalMode,
        maxActionsPerHour: maxActions,
      });
      toast.success("Safety controls updated");
    } catch {
      toast.error("Failed to update safety controls");
    }
  };

  const activeOptimizations = useMemo(
    () => actions.filter((a) => String(a.status).toUpperCase().includes("EXECUTED")).length,
    [actions]
  );
  const risksDetected = useMemo(() => clusters.filter((c) => c.risk !== "low").length, [clusters]);
  const confidence = useMemo(() => {
    if (!actions.length) return 94;
    return Math.round((actions.reduce((acc, x) => acc + Number(x.confidence || 0.9), 0) / actions.length) * 100);
  }, [actions]);

  return (
    <div className="space-y-5 pb-10">
      <ModuleHeader
        title="Infrastructure AI Control Plane"
        subtitle="Autonomous cluster operations, prediction, and safe execution"
      />

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45">AI Control</p>
            <p className={`mt-1 text-lg font-black ${aiOn ? "text-emerald-300" : "text-red-300"}`}>{aiOn ? "ON" : "OFF"}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45">Active Optimizations</p>
            <p className="mt-1 text-lg font-black text-indigo-300">{activeOptimizations}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45">Risks Detected</p>
            <p className="mt-1 text-lg font-black text-amber-300">{risksDetected}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45">System Confidence</p>
            <p className="mt-1 text-lg font-black text-blue-300">{confidence}%</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => void runAction("opt")} disabled={busy !== null} className="h-9 rounded-xl text-[10px] uppercase tracking-widest">
          <Sparkles className="w-4 h-4 mr-2" /> Optimize All Clusters
        </Button>
        <Button onClick={() => void runAction("stab")} disabled={busy !== null} className="h-9 rounded-xl text-[10px] uppercase tracking-widest bg-gradient-to-r from-amber-600 to-orange-500 text-white">
          <ShieldCheck className="w-4 h-4 mr-2" /> Stabilize Infrastructure
        </Button>
        <Button onClick={() => void runAction("cost")} disabled={busy !== null} variant="outline" className="h-9 rounded-xl text-[10px] uppercase tracking-widest">
          <DollarSign className="w-4 h-4 mr-2" /> Reduce Cost
        </Button>
        <Button onClick={() => void runAction("pause")} disabled={busy !== null} variant="outline" className="h-9 rounded-xl text-[10px] uppercase tracking-widest border-red-500/30 text-red-300">
          <PauseCircle className="w-4 h-4 mr-2" /> Pause AI
        </Button>
        <Button onClick={() => void refresh()} variant="ghost" className="h-9 rounded-xl text-[10px] uppercase tracking-widest ml-auto">
          <RefreshCw className="w-4 h-4 mr-2" /> Sync
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {clusters.map((c) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black">{c.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/45">{c.region}</p>
              </div>
              <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border ${riskClass[c.risk]}`}>{c.risk}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div className="rounded-lg border border-white/10 p-2"><p className="text-sm font-black">{c.nodes}</p><p className="text-[9px] text-white/45">nodes</p></div>
              <div className="rounded-lg border border-white/10 p-2"><p className="text-sm font-black">{c.pods}</p><p className="text-[9px] text-white/45">pods</p></div>
              <div className="rounded-lg border border-white/10 p-2"><p className="text-sm font-black">${c.cost}</p><p className="text-[9px] text-white/45">cost/day</p></div>
              <div className="rounded-lg border border-white/10 p-2"><p className="text-sm font-black">{c.alerts}</p><p className="text-[9px] text-white/45">alerts</p></div>
            </div>
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2 mb-2">
              <p className="text-[9px] uppercase tracking-widest text-indigo-200">AI Action</p>
              <p className="text-xs text-white/85 mt-1">{c.aiAction}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
              <p className="text-[9px] uppercase tracking-widest text-amber-200">Prediction</p>
              <p className="text-xs text-white/85 mt-1">{c.prediction}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-blue-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">AI Predictions</p></div>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg border border-white/10 p-2">Traffic spike forecast: +28% in 18m</div>
            <div className="rounded-lg border border-white/10 p-2">Node saturation risk: 67% in us-east-1</div>
            <div className="rounded-lg border border-white/10 p-2">Failure probability: 0.74 in prod-ap-south-1</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-indigo-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">AI Decision Log</p></div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {actions.length === 0 ? (
              <p className="text-xs text-white/40">No decisions yet.</p>
            ) : (
              actions.map((a) => (
                <div key={a.id} className="rounded-lg border border-white/10 p-2">
                  <p className="text-[11px] text-white/85">{a.type}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{a.decision}</p>
                  <p className="text-[10px] mt-1 text-indigo-200">Outcome: {a.status}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">Safety Controls</p></div>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs border border-white/10 rounded-lg p-2">
              Approval mode
              <input type="checkbox" className="accent-indigo-500" checked={approvalMode} onChange={(e) => setApprovalMode(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between text-xs border border-white/10 rounded-lg p-2">
              Max actions/hour
              <input type="number" min={1} max={30} value={maxActions} onChange={(e) => setMaxActions(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="w-14 rounded border border-white/10 bg-[#111827] px-2 py-1 text-xs" />
            </label>
            <label className="flex items-center justify-between text-xs border border-white/10 rounded-lg p-2">
              Rollback enabled
              <input type="checkbox" className="accent-indigo-500" checked={rollback} onChange={(e) => setRollback(e.target.checked)} />
            </label>
            <Button onClick={() => void saveSafety()} className="w-full h-9 rounded-xl text-[10px] uppercase tracking-widest">
              <Zap className="w-4 h-4 mr-2" /> Save Safety
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4">
        <div className="flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-blue-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">Real-Time Infrastructure Stream</p></div>
        <div className="max-h-[220px] overflow-y-auto space-y-1 font-mono text-[11px]">
          {events.length === 0 ? (
            <p className="text-white/40">Waiting for stream events...</p>
          ) : (
            events.map((e, i) => (
              <div key={`${e.ts ?? "n"}-${i}`} className="grid grid-cols-[110px_90px_1fr] gap-2">
                <span className="text-white/35">{e.ts ? new Date(e.ts).toLocaleTimeString() : "--:--:--"}</span>
                <span className="uppercase text-indigo-300">{e.type ?? "event"}</span>
                <span className="text-white/80">{JSON.stringify(e.payload ?? {})}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InfrastructureView;
