import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
  Rocket,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ModuleHeader from "./ModuleHeader";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo, postStabilizeSystem } from "@/lib/ai-ceo";
import { getPredictions } from "@/lib/autonomous";
import { postOptimizeSystem } from "@/lib/ai-optimizer";

type Severity = "low" | "medium" | "high" | "critical";
type StreamTone = "green" | "yellow" | "red" | "blue";

type Issue = {
  id: string;
  service: string;
  severity: Severity;
  rootCause: string;
  recommendedFix: string;
  expectedImprovement: string;
  confidence: number;
  metricsUsed: string[];
};

type PredictionItem = {
  label: string;
  forecast: string;
  timeframe: string;
};

const DEFAULT_ISSUES: Issue[] = [
  {
    id: "perf-1",
    service: "worker-pool",
    severity: "critical",
    rootCause: "CPU saturation under queue burst causing retry storm.",
    recommendedFix: "Scale worker replicas and restart throttled pods.",
    expectedImprovement: "Latency -34%, errors -21%",
    confidence: 92,
    metricsUsed: ["CPU 97%", "Queue depth +180%", "p99 latency 310ms"],
  },
  {
    id: "perf-2",
    service: "api-gateway",
    severity: "high",
    rootCause: "Timeout cascade from dependency backpressure.",
    recommendedFix: "Enable adaptive concurrency and rebalance traffic.",
    expectedImprovement: "Error rate -16%, throughput +11%",
    confidence: 87,
    metricsUsed: ["5xx +2.1%", "Connection wait 140ms", "p95 timeout rise"],
  },
  {
    id: "perf-3",
    service: "ml-inference",
    severity: "medium",
    rootCause: "GPU memory pressure from concurrent model loads.",
    recommendedFix: "Apply model eviction and isolate heavy prompts.",
    expectedImprovement: "Inference latency -18%",
    confidence: 81,
    metricsUsed: ["GPU mem 93%", "Token latency +14%", "OOM warnings 12"],
  },
];

const HEATMAP = [
  [72, 81, 88, 91, 84],
  [64, 71, 76, 79, 68],
  [42, 55, 62, 58, 51],
];

const PerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [aiCeoEnabled, setAiCeoEnabled] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [issues, setIssues] = useState<Issue[]>(DEFAULT_ISSUES);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string>(DEFAULT_ISSUES[0].id);
  const [stream, setStream] = useState<Array<{ id: string; message: string; tone: StreamTone; ts: string }>>([]);
  const [stabilizeLoading, setStabilizeLoading] = useState(false);
  const [stabilizeResult, setStabilizeResult] = useState<{
    latencyReduction: number;
    errorReduction: number;
    recoveryScore: number;
  } | null>(null);

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) ?? issues[0],
    [issues, selectedIssueId]
  );

  const performanceScore = useMemo(() => {
    const latencyHealth = Math.max(0, 100 - (issues.some((i) => i.severity === "critical") ? 34 : 18));
    const throughputHealth = Math.max(0, 100 - (issues.filter((i) => i.severity === "high").length * 11 + 10));
    const errorRateHealth = Math.max(0, 100 - (issues.filter((i) => i.severity === "critical").length * 20 + 9));
    const score = Math.round((latencyHealth + throughputHealth + errorRateHealth) / 3);
    return { score, latencyHealth, throughputHealth, errorRateHealth };
  }, [issues]);

  const addStream = (message: string, tone: StreamTone = "blue") => {
    setStream((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, tone, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 14));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [ceo, preds] = await Promise.all([getAICeoStatus(), getPredictions()]);
      setAiCeoEnabled(Boolean(ceo.enabled));
      const mapped: PredictionItem[] =
        preds.length > 0
          ? preds.slice(0, 3).map((p) => ({
              label: p.predictedIssue,
              forecast: `${Math.round(p.failureProbability * 100)}% probability`,
              timeframe: "next 15 min",
            }))
          : [
              { label: "Latency spike prediction", forecast: "p99 +32%", timeframe: "next 8 min" },
              { label: "Error spike prediction", forecast: "5xx +18%", timeframe: "next 10 min" },
              { label: "CPU saturation forecast", forecast: "worker-pool >95%", timeframe: "next 6 min" },
            ];
      setPredictions(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/ai-ceo/stream");
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        const text = String(payload.type ?? "system update");
        const lc = text.toLowerCase();
        const tone: StreamTone = lc.includes("failed")
          ? "red"
          : lc.includes("stabilize") || lc.includes("enabled")
          ? "green"
          : lc.includes("pause")
          ? "yellow"
          : "blue";
        addStream(text.replaceAll("_", " "), tone);
      } catch {
        addStream("AI control stream update", "blue");
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const toggleCeo = async (enabled: boolean) => {
    if (enabled) {
      await postEnableAICeo({ approvalMode: false });
      addStream("AI CEO Mode enabled for autonomous performance control", "green");
    } else {
      await postDisableAICeo();
      addStream("AI CEO Mode disabled by operator", "yellow");
    }
    setAiCeoEnabled(enabled);
  };

  const runAutoOptimize = async () => {
    const result = await postOptimizeSystem({ autoMode: autoOptimize, safety: { approvalMode: !autoOptimize, maxChangesPerHour: 10 } });
    addStream(`Optimization applied: ${result.actionsApplied.length} actions`, "green");
  };

  const stabilizePerformance = async () => {
    setStabilizeLoading(true);
    try {
      const out = await postStabilizeSystem();
      const latencyReduction = Math.max(8, Math.min(45, Math.round(out.systemRecovery * 0.4)));
      const errorReduction = Math.max(6, Math.min(40, Math.round(out.systemRecovery * 0.33)));
      const recoveryScore = out.systemRecovery;
      setStabilizeResult({ latencyReduction, errorReduction, recoveryScore });
      addStream(`Stabilize Performance completed · Recovery ${recoveryScore}%`, recoveryScore >= 80 ? "green" : "yellow");
    } finally {
      setStabilizeLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <ModuleHeader
            title="Autonomous Performance Control Engine"
            subtitle="AI bottleneck detection, prediction, stabilization, and explainability"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="h-10 px-3 md:px-4 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all inline-flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Re-analyze
          </button>
          <button
            type="button"
            onClick={() => void stabilizePerformance()}
            disabled={stabilizeLoading}
            className="h-10 px-3 md:px-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:brightness-110 transition-all inline-flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap"
          >
            {stabilizeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Stabilize Performance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-indigo-200">AI CEO Mode</p>
            <label className="inline-flex items-center gap-2 text-[10px] text-white/70">
              <input type="checkbox" checked={aiCeoEnabled} onChange={(e) => void toggleCeo(e.target.checked)} className="accent-indigo-500" />
              {aiCeoEnabled ? "ON" : "OFF"}
            </label>
          </div>
          <p className="mt-3 text-sm text-white/80">Auto-detect bottlenecks, auto-scale services, auto-reduce latency, auto-fix errors.</p>
        </motion.div>

        <motion.div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Auto Mode</p>
            <label className="inline-flex items-center gap-2 text-[10px] text-white/70">
              <input type="checkbox" checked={autoOptimize} onChange={(e) => setAutoOptimize(e.target.checked)} className="accent-emerald-500" />
              {autoOptimize ? "Auto Optimize" : "Manual"}
            </label>
          </div>
          <button
            type="button"
            onClick={() => void runAutoOptimize()}
            className="mt-3 h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 text-xs inline-flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Apply Optimizations
          </button>
        </motion.div>

        <motion.div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Performance Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className={cn("text-3xl font-black", performanceScore.score >= 80 ? "text-emerald-300" : performanceScore.score >= 60 ? "text-yellow-300" : "text-red-300")}>
              {performanceScore.score}
            </span>
            <span className="text-white/40 text-xs">/100</span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-white/70">
            <p>Latency Health: {performanceScore.latencyHealth}</p>
            <p>Throughput Health: {performanceScore.throughputHealth}</p>
            <p>Error Rate Health: {performanceScore.errorRateHealth}</p>
          </div>
        </motion.div>
      </div>

      {stabilizeResult && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100 flex flex-wrap items-center gap-5">
          <span>Latency reduction: {stabilizeResult.latencyReduction}%</span>
          <span>Error reduction: {stabilizeResult.errorReduction}%</span>
          <span>Recovery score: {stabilizeResult.recoveryScore}%</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Predictions</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {predictions.map((p) => (
                <div key={p.label} className="rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-3">
                  <p className="text-xs text-yellow-100 font-semibold">{p.label}</p>
                  <p className="text-sm text-yellow-300 mt-1">{p.forecast}</p>
                  <p className="text-[11px] text-yellow-100/70 mt-1">{p.timeframe}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Optimization Panel</p>
            <div className="space-y-2">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    selectedIssueId === issue.id ? "border-indigo-500/40 bg-indigo-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{issue.service}</p>
                    <span
                      className={cn(
                        "text-[10px] uppercase px-2 py-0.5 rounded-full",
                        issue.severity === "critical"
                          ? "bg-red-500/20 text-red-300"
                          : issue.severity === "high"
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      )}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 mt-1">Root cause: {issue.rootCause}</p>
                  <p className="text-xs text-emerald-300 mt-1">Expected improvement: {issue.expectedImprovement}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Advanced Performance Heatmap</p>
            <div className="space-y-2">
              {HEATMAP.map((row, rowIdx) => (
                <div key={`row-${rowIdx}`} className="grid grid-cols-5 gap-2">
                  {row.map((value, idx) => (
                    <div
                      key={`cell-${rowIdx}-${idx}`}
                      className={cn(
                        "h-8 rounded-md",
                        value > 85 ? "bg-red-500/40" : value > 70 ? "bg-yellow-500/35" : "bg-emerald-500/30"
                      )}
                      title={`load ${value}%`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Explanation Panel</p>
            {selectedIssue ? (
              <div className="space-y-2 text-sm">
                <p className="text-white/90 font-semibold">{selectedIssue.service}</p>
                <p className="text-white/70">Why issue occurred: {selectedIssue.rootCause}</p>
                <p className="text-white/70">Decision taken: {selectedIssue.recommendedFix}</p>
                <p className="text-white/70">Metrics used: {selectedIssue.metricsUsed.join(" • ")}</p>
                <p className="text-indigo-300">Confidence: {selectedIssue.confidence}%</p>
              </div>
            ) : (
              <p className="text-white/50 text-sm">No active issue selected.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Root Cause Graph</p>
            <div className="space-y-2 text-xs text-white/70">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2">CPU Saturation</div>
              <div className="pl-4 text-white/40">↓</div>
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2">Queue Backpressure</div>
              <div className="pl-4 text-white/40">↓</div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-2">Retry Storm</div>
              <div className="pl-4 text-white/40">↓</div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2">Latency + Error Spike</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Real-time Stream</p>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {stream.length === 0 ? (
                <p className="text-xs text-white/45">Waiting for AI optimization events...</p>
              ) : (
                stream.map((item) => (
                  <div key={item.id} className="text-xs flex items-center gap-2">
                    {item.tone === "green" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {item.tone === "yellow" && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                    {item.tone === "red" && <Activity className="w-3.5 h-3.5 text-red-400" />}
                    {item.tone === "blue" && <Bot className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="text-white/35 font-mono">{item.ts}</span>
                    <span className="text-white/75">{item.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">AI Decision Engine Status</p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous Detection
          </span>
          <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-200 border border-blue-500/20 inline-flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            Adaptive Scaling
          </span>
          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 inline-flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" />
            Latency Control
          </span>
          <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-200 border border-yellow-500/20 inline-flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Forecast Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceView;
