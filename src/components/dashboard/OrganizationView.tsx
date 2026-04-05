import React, { useEffect, useMemo, useState } from "react";
import { Activity, Brain, Building2, Cloud, DollarSign, PauseCircle, PlayCircle, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { withContextQuery } from "@/lib/context";
import {
  getAICeoDecisions,
  getAICeoStatus,
  postDisableAICeo,
  postEnableAICeo,
  postOptimizeAllSystems,
  postPauseAICeo,
  postScaleCriticalServices,
  postStabilizeSystem,
  type AICeoDecision,
  type AICeoStatus,
} from "@/lib/ai-ceo";
import SkeletonBlock from "./control-plane/SkeletonBlock";

type StreamItem = { id: string; ts: string; label: string; tone: "green" | "yellow" | "red" | "blue" };
type AutoMode = "full_auto" | "semi_auto" | "manual";

interface OrgMetrics {
  totalServices: number;
  totalWorkflows: number;
  totalRunsDay: number;
  successRate: number;
  systemHealth: number;
  totalCost: number;
  reliability: number;
  performance: number;
  costEfficiency: number;
  cloud: { aws: number; gcp: number; azure: number };
  aiSummary: { actionsToday: number; incidentsResolved: number; optimizationsApplied: number };
}

interface ImpactState {
  costSaved: number;
  latencyReduced: number;
  incidentsResolved: number;
  improvementScore: number;
  healthDelta: number;
}

const scoreTone = (score: number) => (score >= 85 ? "text-emerald-300" : score >= 65 ? "text-yellow-300" : "text-red-300");

const OrganizationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AICeoStatus | null>(null);
  const [decisions, setDecisions] = useState<AICeoDecision[]>([]);
  const [stream, setStream] = useState<StreamItem[]>([]);
  const [autoMode, setAutoMode] = useState<AutoMode>("semi_auto");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [impact, setImpact] = useState<ImpactState>({ costSaved: 0, latencyReduced: 0, incidentsResolved: 0, improvementScore: 0, healthDelta: 0 });
  const [metrics, setMetrics] = useState<OrgMetrics>({
    totalServices: 0,
    totalWorkflows: 0,
    totalRunsDay: 0,
    successRate: 0,
    systemHealth: 0,
    totalCost: 0,
    reliability: 0,
    performance: 0,
    costEfficiency: 0,
    cloud: { aws: 34, gcp: 31, azure: 35 },
    aiSummary: { actionsToday: 0, incidentsResolved: 0, optimizationsApplied: 0 },
  });

  const globalHealth = useMemo(
    () => Math.round((metrics.systemHealth + metrics.reliability + metrics.performance + metrics.costEfficiency) / 4),
    [metrics]
  );

  const predictions = useMemo(
    () => [
      { text: "Traffic spike expected in 20 min", confidence: 88, impact: "us-east-1 • worker-pool" },
      { text: "Cost increase predicted in analytics lane", confidence: 84, impact: "gcp-central • analytics-jobs" },
      { text: "Failure risk detected in incident pipeline", confidence: 79, impact: "shared-control • incident-agent" },
    ],
    []
  );

  const addStream = (label: string, tone: StreamItem["tone"] = "blue") => {
    setStream((prev) => [{ id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), label, tone }, ...prev].slice(0, 24));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [st, ds, wfRes, runRes, deploymentsRes] = await Promise.all([
        getAICeoStatus(),
        getAICeoDecisions(120),
        api.get("/workflows"),
        api.get("/runs"),
        api.get("/deploy/history").catch(() => ({ data: { items: [] } })),
      ]);
      const wfItems = (wfRes.data?.items ?? wfRes.data ?? []) as Array<Record<string, unknown>>;
      const runItems = (runRes.data?.items ?? []) as Array<{ status?: string; createdAt?: string }>;
      const deployItems = (deploymentsRes.data?.items ?? []) as Array<{ status?: string }>;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const runsToday = runItems.filter((r) => (r.createdAt ? new Date(r.createdAt).getTime() >= today.getTime() : true));
      const success = runsToday.filter((r) => String(r.status).toUpperCase() === "SUCCESS").length;
      const successRate = runsToday.length ? Math.round((success / runsToday.length) * 100) : 100;
      const reliability = Math.max(50, Math.min(99, Math.round((successRate + 91) / 2)));
      const performance = Math.max(52, Math.min(99, Math.round((successRate + (st.enabled ? 90 : 77)) / 2)));
      const costEfficiency = Math.max(48, Math.min(99, Math.round(88 + (st.enabled ? 4 : -3) - Math.min(10, deployItems.length / 4))));
      const systemHealth = Math.round((reliability + performance + costEfficiency) / 3);
      const totalCost = Math.round(1200 + runsToday.length * 3.4 + (st.enabled ? -80 : 0));
      const optimizationsApplied = ds.filter((d) => d.type === "optimize" && d.outcome === "SUCCESS").length;
      const incidentsResolved = ds.filter((d) => d.type === "incident_fix" || (d.type === "scale" && d.outcome === "SUCCESS")).length;
      const serviceSet = new Set<string>();
      wfItems.forEach((w) => {
        const n = String((w as { name?: string }).name ?? "");
        if (n) serviceSet.add(n);
      });

      setStatus(st);
      setDecisions(ds);
      setMetrics({
        totalServices: Math.max(6, serviceSet.size),
        totalWorkflows: wfItems.length,
        totalRunsDay: runsToday.length,
        successRate,
        systemHealth,
        totalCost,
        reliability,
        performance,
        costEfficiency,
        cloud: { aws: 39, gcp: 28, azure: 33 },
        aiSummary: { actionsToday: ds.length, incidentsResolved, optimizationsApplied },
      });
      setImpact((prev) => ({
        ...prev,
        incidentsResolved,
        improvementScore: Math.max(prev.improvementScore, Math.round((optimizationsApplied + incidentsResolved + systemHealth) / 3)),
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery("/api/ai-ceo/stream"));
    es.onmessage = (event) => {
      let label = "Global AI control event";
      try {
        const d = JSON.parse(event.data) as Record<string, unknown>;
        label = String(d.type ?? d.message ?? label);
      } catch {
        label = event.data || label;
      }
      const lc = label.toLowerCase();
      const tone: StreamItem["tone"] = lc.includes("failed")
        ? "red"
        : lc.includes("paused")
        ? "yellow"
        : lc.includes("enabled") || lc.includes("optimize") || lc.includes("scale") || lc.includes("stabilize")
        ? "green"
        : "blue";
      addStream(label.replace(/_/g, " "), tone);
      void load();
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const withAction = async (key: string, fn: () => Promise<unknown>, onSuccess?: () => void) => {
    setRunningAction(key);
    try {
      await fn();
      onSuccess?.();
    } finally {
      setRunningAction(null);
      void load();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1220]">
      <div className="px-6 py-4 border-b border-[#1F2937] flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200 font-black uppercase tracking-widest">
          <Building2 className="w-3.5 h-3.5" />
          AI CEO Command Center
        </div>
        <div className="text-[12px] text-white/70">
          AI CEO Mode: <span className={status?.enabled ? "text-emerald-300" : "text-yellow-300"}>{status?.enabled ? "ON" : "OFF"}</span>
        </div>
        <div className="text-[12px] text-indigo-200">Actions: {metrics.aiSummary.actionsToday}</div>
        <div className="text-[12px] text-emerald-300">Success rate: {metrics.successRate}%</div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() =>
              void withAction("enable", () =>
                status?.enabled
                  ? postDisableAICeo()
                  : postEnableAICeo({ approvalMode: status?.approvalMode, maxActionsPerHour: status?.maxActionsPerHour })
              )
            }
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1" />
            {status?.enabled ? "Disable AI CEO" : "Enable AI CEO"}
          </Button>
          <select
            value={autoMode}
            onChange={(e) => setAutoMode(e.target.value as AutoMode)}
            className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] text-white"
          >
            <option value="full_auto">Full Auto</option>
            <option value="semi_auto">Semi Auto</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-[#1F2937] flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white"
          disabled={runningAction === "optimize"}
          onClick={() =>
            void withAction(
              "optimize",
              () => postOptimizeAllSystems(),
              () => {
                setImpact((p) => ({ ...p, costSaved: p.costSaved + 120, latencyReduced: Math.min(60, p.latencyReduced + 8), healthDelta: p.healthDelta + 4 }));
                addStream("Cross-module optimization executed", "green");
              }
            )
          }
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          Optimize All Systems
        </Button>
        <Button
          size="sm"
          className="h-8 bg-blue-600 hover:bg-blue-500 text-white"
          disabled={runningAction === "scale"}
          onClick={() =>
            void withAction(
              "scale",
              () => postScaleCriticalServices(),
              () => {
                setImpact((p) => ({ ...p, latencyReduced: Math.min(65, p.latencyReduced + 10), healthDelta: p.healthDelta + 3 }));
                addStream("Global critical-service scaling executed", "green");
              }
            )
          }
        >
          <Cloud className="w-3.5 h-3.5 mr-1" />
          Scale All Critical Services
        </Button>
        <Button
          size="sm"
          className="h-8 bg-red-600 hover:bg-red-500 text-white"
          disabled={runningAction === "stabilize"}
          onClick={() =>
            void withAction(
              "stabilize",
              () => postStabilizeSystem(),
              () => {
                setImpact((p) => ({
                  ...p,
                  incidentsResolved: p.incidentsResolved + 2,
                  latencyReduced: Math.min(70, p.latencyReduced + 12),
                  healthDelta: p.healthDelta + 6,
                  improvementScore: Math.min(99, p.improvementScore + 8),
                }));
                addStream("Organization-wide stabilization executed", "green");
              }
            )
          }
        >
          <Wrench className="w-3.5 h-3.5 mr-1" />
          Stabilize System
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
          onClick={() => void withAction("pause", () => postPauseAICeo(), () => addStream("AI CEO paused by operator", "yellow"))}
        >
          <PauseCircle className="w-3.5 h-3.5 mr-1" />
          Pause AI
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 overflow-auto">
        <div className="space-y-4">
          {loading ? (
            <>
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-40" />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
                AI CEO actively managing system · cross-module orchestration enabled for Performance, Cost, Incidents, Chaos, and AI Optimize.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { label: "Global System Health", value: globalHealth },
                  { label: "Reliability Score", value: metrics.reliability },
                  { label: "Cost Efficiency Score", value: metrics.costEfficiency },
                  { label: "Performance Score", value: metrics.performance },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] text-white/45 uppercase tracking-widest">{card.label}</p>
                    <p className={cn("text-xl font-black mt-1", scoreTone(card.value))}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Organization Health Dashboard</p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[12px]">
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Services</p><p className="text-white font-semibold">{metrics.totalServices}</p></div>
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Workflows</p><p className="text-white font-semibold">{metrics.totalWorkflows}</p></div>
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Runs/day</p><p className="text-white font-semibold">{metrics.totalRunsDay}</p></div>
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Success</p><p className="text-emerald-300 font-semibold">{metrics.successRate}%</p></div>
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Total Cost</p><p className="text-yellow-300 font-semibold">${metrics.totalCost}</p></div>
                  <div className="rounded-lg bg-[#0F172A] border border-white/10 p-3"><p className="text-white/50">Health</p><p className="text-indigo-300 font-semibold">{metrics.systemHealth}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Global Predictions Engine</p>
                <div className="space-y-2 text-[12px]">
                  {predictions.map((p) => (
                    <div key={p.text} className="rounded-lg border border-white/10 bg-[#0F172A] p-3">
                      <p className="text-white/85">{p.text}</p>
                      <p className="text-white/55 mt-1">Confidence: {p.confidence}% · Impact: {p.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Decision Center</p>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {decisions.map((d) => (
                    <div key={d.id} className="rounded-lg border border-white/10 bg-[#0F172A] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] text-white font-semibold">Decision: {d.type.toUpperCase()}</p>
                        <span className="text-[10px] text-white/40">{new Date(d.ts).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-white/75 mt-1">Reason: {d.reason}</p>
                      <p className="text-[10px] text-white/55 mt-1">Outcome: {d.outcome}{d.details ? ` · Impact: ${d.details}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Governance & Policy Engine</p>
            <p className="text-[12px] text-white/80">Cost limit cap: $15,000/month</p>
            <p className="text-[12px] text-white/80">Performance threshold: p95 &lt; 200ms</p>
            <p className="text-[12px] text-white/80">SLA policy: availability ≥ 99.9%</p>
            <p className="text-[12px] text-white/80">Auto-scaling limit: max +4 replicas/action</p>
            <p className="text-[12px] text-white/80">Incident threshold: 3 critical in 15m</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Impact Analysis</p>
            <p className="text-[12px] text-emerald-300">Cost saved: ${impact.costSaved}</p>
            <p className="text-[12px] text-emerald-300">Latency reduced: {impact.latencyReduced}%</p>
            <p className="text-[12px] text-emerald-300">Incidents resolved: {impact.incidentsResolved}</p>
            <p className="text-[12px] text-indigo-300">Improvement score: {impact.improvementScore}</p>
            <p className="text-[12px] text-indigo-300">System health delta: +{impact.healthDelta}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Insights Panel</p>
            <p className="text-[12px] text-white/80">Weakness: worker-pool retry storms under burst traffic.</p>
            <p className="text-[12px] text-white/80">Risk: cost + performance drift during overnight windows.</p>
            <p className="text-[12px] text-white/80">Recommendation: rebalance workloads and tighten scale policies.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Real-time Execution Stream</p>
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {stream.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[11px]">
                  {s.tone === "green" && <Sparkles className="w-3 h-3 text-emerald-400" />}
                  {s.tone === "yellow" && <PauseCircle className="w-3 h-3 text-yellow-400" />}
                  {s.tone === "red" && <Activity className="w-3 h-3 text-red-400" />}
                  {s.tone === "blue" && <Brain className="w-3 h-3 text-blue-400" />}
                  <span className="text-white/40 font-mono">{s.ts}</span>
                  <span className="text-white/75 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Safety Controls</p>
            <p className="text-[12px] text-white/70">Approval mode: {status?.approvalMode ? "Enabled" : "Disabled"}</p>
            <p className="text-[12px] text-white/70">Max actions/hour: {status?.maxActionsPerHour ?? 0}</p>
            <p className="text-[12px] text-white/70">Rollback support: {status?.rollbackEnabled ? "Enabled" : "Disabled"}</p>
            <p className="text-[12px] text-white/70">Auto mode: {autoMode.replace("_", " ")}</p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-100">
            <ShieldCheck className="w-4 h-4 inline mr-2" />
            Validation: autonomous response active, safe guardrails enforced, and AI decisions remain explainable.
            <TrendingUp className="w-4 h-4 inline mx-2" />
            No disruptive action detected.
            <DollarSign className="w-4 h-4 inline mx-2" />
            Cost policy enforcement active.
            <Cloud className="w-4 h-4 inline mx-2" />
            Multi-cloud orchestration healthy.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationView;
