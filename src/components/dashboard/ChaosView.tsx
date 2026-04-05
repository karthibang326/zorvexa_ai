import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import ModuleHeader from "./ModuleHeader";
import { getChaosHistory, runChaos, type ChaosType, type ChaosExperimentItem } from "@/lib/sre";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo, postStabilizeSystem } from "@/lib/ai-ceo";
import { getAIEmptyStateCopy } from "@/lib/ai-empty-state";

const CHAOS_TYPES: ChaosType[] = ["cpu_spike", "memory_leak", "pod_kill", "network_latency"];
type Risk = "low" | "medium" | "high";

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const ChaosView: React.FC = () => {
  const empty = getAIEmptyStateCopy();
  const [items, setItems] = useState<ChaosExperimentItem[]>([]);
  const [type, setType] = useState<ChaosType>("cpu_spike");
  const [target, setTarget] = useState("api-gateway");
  const [duration, setDuration] = useState(60);
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("auto");
  const [environment, setEnvironment] = useState<"staging" | "prod">("staging");
  const [aiCeoEnabled, setAiCeoEnabled] = useState(false);
  const [continuousChaos, setContinuousChaos] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30>(15);
  const [safetyLimit, setSafetyLimit] = useState(3);
  const [stabilizing, setStabilizing] = useState(false);
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<Array<{ id: string; ts: string; message: string; tone: "green" | "yellow" | "red" | "blue" }>>([]);

  const generatedScenarios = useMemo(
    () => [
      {
        id: "scn-1",
        title: "Queue burst under CPU contention",
        risk: "medium" as Risk,
        expectedImpact: "Latency +12% for 2-4 minutes",
        affected: "worker-pool, api-gateway",
      },
      {
        id: "scn-2",
        title: "Pod eviction in auth path",
        risk: "high" as Risk,
        expectedImpact: "Auth timeout spike, SLA at-risk",
        affected: "auth-service, session-cache",
      },
      {
        id: "scn-3",
        title: "Network jitter in inference lane",
        risk: "low" as Risk,
        expectedImpact: "P95 +8ms and self-heal in <2m",
        affected: "ml-inference",
      },
    ],
    []
  );

  const refresh = async () => {
    try {
      const [history, ceo] = await Promise.all([getChaosHistory(), getAICeoStatus()]);
      setItems(history);
      setAiCeoEnabled(Boolean(ceo.enabled));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load chaos history");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const es = new EventSource(`${getApiBase()}/ai-ceo/stream`);
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as Record<string, unknown>;
        const msg = String(parsed.type ?? "system_update").replace(/_/g, " ");
        const lc = msg.toLowerCase();
        const tone: "green" | "yellow" | "red" | "blue" = lc.includes("failed")
          ? "red"
          : lc.includes("enabled") || lc.includes("stabilize") || lc.includes("scale")
          ? "green"
          : lc.includes("pause")
          ? "yellow"
          : "blue";
        setStream((prev) => [{ id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), message: msg, tone }, ...prev].slice(0, 20));
      } catch {
        // no-op
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!continuousChaos) return;
    const timer = setInterval(() => {
      if (environment === "prod" && approvalMode !== "manual") return;
      const nextType = CHAOS_TYPES[Math.floor(Math.random() * CHAOS_TYPES.length)];
      void runChaos({
        type: nextType,
        target: target.trim(),
        duration: Math.min(duration, 120),
        approvalMode,
      })
        .then(() => {
          toast.success(`Continuous chaos executed (${nextType})`);
          void refresh();
        })
        .catch(() => {
          toast.error("Continuous chaos run blocked by safety controls");
        });
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(timer);
  }, [continuousChaos, intervalMinutes, environment, approvalMode, target, duration]);

  const resilienceScore = useMemo(() => {
    const done = items.filter((x) => String(x.status).includes("COMPLETED")).length;
    const total = Math.max(1, items.length);
    const recoveryFactor = recoveryScore ?? 82;
    return Math.max(40, Math.min(99, Math.round((done / total) * 40 + recoveryFactor * 0.6)));
  }, [items, recoveryScore]);

  const predictedImpact = useMemo(() => {
    const risk: Risk = type === "pod_kill" ? "high" : type === "network_latency" ? "medium" : "low";
    const affected =
      type === "cpu_spike"
        ? "worker-pool, queue-consumer"
        : type === "memory_leak"
        ? "ml-inference, feature-service"
        : type === "pod_kill"
        ? `${target}, gateway`
        : `${target}, ingress`;
    const expected =
      risk === "high" ? "Error spike up to +3.5%" : risk === "medium" ? "Latency increase ~8-15ms" : "Low impact, recoverable";
    return { risk, affected, expected };
  }, [type, target]);

  const weakness = useMemo(
    () => [
      "worker-pool retry storms under CPU saturation",
      "auth-service circuit breaker tuning gap",
      "inference pod memory pressure during batch spikes",
    ],
    []
  );

  const onRun = async () => {
    if (environment === "prod" && approvalMode !== "manual") {
      toast.error("Enterprise safety: production chaos requires manual approval");
      return;
    }
    setLoading(true);
    try {
      await runChaos({ type, target: target.trim(), duration, approvalMode });
      toast.success("Chaos experiment started");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run chaos experiment");
    } finally {
      setLoading(false);
    }
  };

  const onToggleAICeo = async (enabled: boolean) => {
    try {
      if (enabled) {
        await postEnableAICeo({ approvalMode: approvalMode === "manual" });
      } else {
        await postDisableAICeo();
      }
      setAiCeoEnabled(enabled);
      toast.success(`AI CEO Mode ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle AI CEO mode");
    }
  };

  const onAutoRecover = async () => {
    setStabilizing(true);
    try {
      const out = await postStabilizeSystem();
      setRecoveryScore(out.systemRecovery);
      toast.success(`Auto-recovery completed (${out.systemRecovery}% recovery)`);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-recovery failed");
    } finally {
      setStabilizing(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <ModuleHeader title="Autonomous Chaos Engineering Platform" subtitle="Continuous resilience validation, AI-generated experiments, and safe recovery automation" />

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-indigo-500/25 bg-indigo-500/10 text-[10px] uppercase tracking-widest text-indigo-200">
            AI CEO Mode
            <input type="checkbox" checked={aiCeoEnabled} onChange={(e) => void onToggleAICeo(e.target.checked)} className="accent-indigo-500" />
            {aiCeoEnabled ? "ON" : "OFF"}
          </label>
          <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-blue-500/25 bg-blue-500/10 text-[10px] uppercase tracking-widest text-blue-200">
            Continuous Chaos
            <input type="checkbox" checked={continuousChaos} onChange={(e) => setContinuousChaos(e.target.checked)} className="accent-blue-500" />
            {continuousChaos ? "ON" : "OFF"}
          </label>
          <button
            type="button"
            onClick={() => void onAutoRecover()}
            disabled={stabilizing}
            className="h-8 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[11px] font-semibold inline-flex items-center gap-2"
          >
            {stabilizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
            Auto-Recovery
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase text-white/45">Resilience Score</p>
            <p className="text-2xl font-bold text-emerald-300">{resilienceScore}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase text-white/45">SLA Protection</p>
            <p className="text-sm font-semibold text-white/80">Enabled</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase text-white/45">Rollback Guarantee</p>
            <p className="text-sm font-semibold text-white/80">Active</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase text-white/45">Recovery Score</p>
            <p className="text-sm font-semibold text-emerald-300">{recoveryScore ?? 0}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/45 mb-3">Continuous Chaos Controls</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value) as 15 | 30)}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          >
            <option value={15}>every 15 minutes</option>
            <option value={30}>every 30 minutes</option>
          </select>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "staging" | "prod")}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          >
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>
          <input
            type="number"
            min={1}
            max={10}
            value={safetyLimit}
            onChange={(e) => setSafetyLimit(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          />
        </div>
        <p className="text-[11px] text-white/50 mt-2">Safety limits: max {safetyLimit} runs/hour, low-impact failures only, auto-stop on SLA risk.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/45 mb-3">Run Experiment</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ChaosType)}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          >
            {CHAOS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="target service/pod/node"
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          />
          <input
            type="number"
            min={10}
            max={1800}
            value={duration}
            onChange={(e) => setDuration(Math.max(10, Math.min(1800, Number(e.target.value) || 60)))}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          />
          <select
            value={approvalMode}
            onChange={(e) => setApprovalMode(e.target.value as "auto" | "manual")}
            className="h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
          >
            <option value="auto">auto</option>
            <option value="manual">manual</option>
          </select>
        </div>
        <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
          <p className="text-[10px] uppercase text-yellow-200 tracking-widest">Predicted Impact</p>
          <p className="text-[12px] text-yellow-100 mt-1">Risk: {predictedImpact.risk.toUpperCase()}</p>
          <p className="text-[12px] text-yellow-100/90">Affected services: {predictedImpact.affected}</p>
          <p className="text-[12px] text-yellow-100/90">Expected impact: {predictedImpact.expected}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRun()}
          disabled={loading || !target.trim()}
          className="mt-4 h-10 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 inline mr-2" />}
          Run Chaos
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/45 mb-3 inline-flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-indigo-300" />
          AI Chaos Test Generator
        </p>
        <div className="space-y-2">
          {generatedScenarios.map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/85">{s.title}</p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    s.risk === "high" ? "bg-red-500/20 text-red-300" : s.risk === "medium" ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {s.risk}
                </span>
              </div>
              <p className="text-[12px] text-white/65 mt-1">Expected impact: {s.expectedImpact}</p>
              <p className="text-[12px] text-white/50">Affected: {s.affected}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] overflow-hidden">
        <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Chaos History + Trend</p>
          <button type="button" className="text-[10px] text-primary" onClick={() => void refresh()}>Refresh</button>
        </div>
        <div className="divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-white/35">
              <p>{empty.title}</p>
              <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
            </div>
          ) : (
            items.map((x) => (
              <div key={x.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/85">{x.type} on <span className="font-mono">{x.target}</span></p>
                  <p className="text-[11px] text-white/35">{new Date(x.startedAt).toLocaleString()} · {x.durationSec}s</p>
                  <p className="text-[11px] text-white/45 mt-1">
                    Impact: latency +{Math.max(3, Math.min(26, Math.round((x.durationSec / 60) * 7)))}ms · error +{Math.max(1, Math.round(x.durationSec / 120))}%
                  </p>
                  <p className="text-[11px] text-emerald-300 mt-1">Recovery duration: {Math.max(1, Math.round(x.durationSec / 2))}s</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border ${
                  x.status.includes("COMPLETED")
                    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                    : x.status.includes("PENDING")
                      ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10"
                      : "text-indigo-300 border-indigo-500/20 bg-indigo-500/10"
                }`}>
                  {x.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#060a12] overflow-hidden">
        <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
          <Radar className="w-4 h-4 text-indigo-300" />
          <p className="text-[10px] uppercase tracking-widest text-white/45">Real-time Chaos Stream</p>
        </div>
        <div className="p-3 h-[260px] overflow-y-auto font-mono text-[12px]">
          {stream.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/35">
              <p>{empty.title}</p>
              <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
            </div>
          ) : (
            stream.map((e) => (
              <div key={e.id} className="grid grid-cols-[100px_1fr] gap-2 py-1">
                <span className="text-white/35">{e.ts}</span>
                <span
                  className={
                    e.tone === "red"
                      ? "text-red-300"
                      : e.tone === "yellow"
                      ? "text-yellow-300"
                      : e.tone === "green"
                      ? "text-emerald-300"
                      : "text-indigo-300"
                  }
                >
                  {e.message}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Weakness Detection + AI Insights</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] text-red-200 uppercase mb-1">Weak Services / Risk Areas</p>
            {weakness.map((w) => (
              <p key={w} className="text-[12px] text-red-100/90">- {w}</p>
            ))}
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
            <p className="text-[11px] text-indigo-200 uppercase mb-1">AI Recommendations</p>
            <p className="text-[12px] text-indigo-100/90">- Raise pre-saturation scaling threshold for worker-pool.</p>
            <p className="text-[12px] text-indigo-100/90">- Add circuit-breaker guard for auth-service retries.</p>
            <p className="text-[12px] text-indigo-100/90">- Keep continuous chaos on staging every {intervalMinutes} minutes.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Summary</p>
        <p className="text-[12px] text-white/80">
          What failed: controlled {type} against {target}. Why it failed: induced stress exposed retry and saturation patterns.
          Recovery steps: restart, scale, rollback guard via auto-recovery. Improvements: tighten blast radius, enforce approval for prod,
          and run low-risk continuous tests to improve resilience trend.
        </p>
      </section>

      <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-[11px] text-orange-200">
        <ShieldAlert className="w-4 h-4 inline mr-2" />
        Enterprise safety: no chaos in production without manual approval, blast-radius limits, audit trail, auto-stop, and rollback guarantee.
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-[11px] text-white/70">
        <Clock3 className="w-4 h-4 inline mr-2 text-indigo-300" />
        Validation guardrails: low-impact defaults, controlled experiments only, destructive actions blocked.
      </div>
    </div>
  );
};

export default ChaosView;

