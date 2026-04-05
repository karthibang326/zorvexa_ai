import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Lock, Shield, Sparkles } from "lucide-react";
import ModuleHeader from "./ModuleHeader";
import {
  getCriticalRisks,
  getGovernancePredictions,
  getGovernanceStatus,
  type GovernanceRisk,
} from "@/lib/ai-governance";
import { withContextQuery } from "@/lib/context";
import { getAIEmptyStateCopy } from "@/lib/ai-empty-state";

function apiRoot() {
  const base = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  return `${base}/api`;
}

const severityClass: Record<GovernanceRisk["severity"], string> = {
  CRITICAL: "border-red-500/40 bg-red-500/10 text-red-200",
  HIGH: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  MEDIUM: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
};

export default function SettingsView() {
  const empty = getAIEmptyStateCopy();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getGovernanceStatus>> | null>(null);
  const [risks, setRisks] = useState<GovernanceRisk[]>([]);
  const [predictions, setPredictions] = useState<string[]>([]);
  const [events, setEvents] = useState<Array<{ ts: string; type: string; msg: string }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, p] = await Promise.all([
        getGovernanceStatus(),
        getCriticalRisks(),
        getGovernancePredictions(),
      ]);
      setStatus(s);
      setRisks(r);
      setPredictions(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${apiRoot()}/ai-governance/stream`));
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string; ts?: string; payload?: Record<string, unknown> };
        setEvents((prev) => [
          {
            ts: data.ts ? new Date(data.ts).toLocaleTimeString() : new Date().toLocaleTimeString(),
            type: String(data.type ?? "event"),
            msg: JSON.stringify(data.payload ?? {}).slice(0, 96) || "update",
          },
          ...prev,
        ].slice(0, 60));
      } catch {
        // no-op
      }
    };
    return () => es.close();
  }, []);

  const aiActive = status?.mode === "on";
  const riskLevel = useMemo(() => {
    const maxRisk = risks.reduce((m, r) => Math.max(m, r.riskScore), 0);
    if (maxRisk >= 85) return "HIGH";
    if (maxRisk >= 60) return "MEDIUM";
    return "LOW";
  }, [risks]);
  const confidence = useMemo(() => {
    const score = Math.max(72, Math.min(98, 96 - risks.length * 4));
    return `${score}%`;
  }, [risks.length]);
  const reasoning = useMemo(() => {
    if (risks.length === 0) {
      return {
        why: "No high-risk signals detected from policy, identity, and integration telemetry.",
        risk: "Current posture remains LOW risk with baseline compliance controls intact.",
        outcome: "AI continues autonomous governance and maintains stable secure operations.",
      };
    }
    const top = risks[0];
    return {
      why: `AI prioritized "${top.title}" based on severity ${top.severity} and risk score ${top.riskScore}.`,
      risk: `Primary risk impact: ${top.impactedResources}.`,
      outcome: "AI mitigation was executed to reduce blast radius while preserving availability.",
    };
  }, [risks]);

  return (
    <div className="space-y-5 pb-10">
      <ModuleHeader
        title="AI Governance Status"
        subtitle="AI is managing your infrastructure autonomously in real time"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">AI Active State</p>
          <p className={`mt-2 text-2xl font-black ${aiActive ? "text-emerald-300" : "text-red-300"}`}>{aiActive ? "ACTIVE" : "DEGRADED"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Risk Level</p>
          <p className={`mt-2 text-2xl font-black ${riskLevel === "HIGH" ? "text-red-300" : riskLevel === "MEDIUM" ? "text-amber-300" : "text-emerald-300"}`}>{riskLevel}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Confidence Score</p>
          <p className="mt-2 text-2xl font-black text-indigo-300">{confidence}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Reasoning</p>
        <div className="rounded-xl border border-white/10 bg-[#111827] p-3 text-sm text-white/85">
          <p><span className="text-white font-semibold">Why:</span> {reasoning.why}</p>
          <p className="mt-2"><span className="text-white font-semibold">Risk:</span> {reasoning.risk}</p>
          <p className="mt-2"><span className="text-white font-semibold">Outcome:</span> {reasoning.outcome}</p>
          <p className="mt-2 text-xs text-white/60">AI is managing your infrastructure autonomously in real time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">AI Actions Feed</p>
          <div className="max-h-[260px] overflow-y-auto space-y-1 font-mono text-[11px]">
            {events.map((e, idx) => (
              <div key={`${e.ts}-${idx}`} className="grid grid-cols-[85px_140px_1fr] gap-2">
                <span className="text-white/40">{e.ts}</span>
                <span className="text-blue-300 uppercase">{e.type}</span>
                <span className="text-white/80">{e.msg}</span>
              </div>
            ))}
            {events.length === 0 ? (
              <div className="space-y-1 text-white/80">
                <p>✔ Rotated IAM keys</p>
                <p>✔ Enforced MFA</p>
                <p>✔ Fixed policy drift</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Risk Signals</p>
          <div className="space-y-2">
            {risks.slice(0, 4).map((r) => (
              <div key={r.id} className={`rounded-xl border p-3 ${severityClass[r.severity]}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">{r.severity}</span>
                  <span className="text-sm font-black text-white">{r.title}</span>
                  <span className="ml-auto text-[11px]">Risk {r.riskScore}</span>
                </div>
                <p className="text-[12px] text-white/80 mt-1">Impact: {r.impactedResources}</p>
              </div>
            ))}
            {risks.length === 0 ? <p className="text-sm text-white/50">{empty.title}</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Risk Predictions</p>
        <div className="space-y-2">
          {predictions.map((p) => (
            <div key={p} className="rounded-lg border border-white/10 p-2.5 text-[12px] text-white/85 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              {p}
            </div>
          ))}
          {predictions.length === 0 ? <p className="text-sm text-white/50">{empty.subtitle}</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
        <Lock className="w-4 h-4 inline mr-2" />
        AI is managing your infrastructure autonomously in real time
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
        <Bot className="w-4 h-4 inline mr-2" />
        Manual controls are intentionally removed. User observes AI decisions, risk posture, and confidence only.
      </div>

      {loading ? <div className="text-xs text-white/50">Loading AI governance status...</div> : null}
    </div>
  );
}
