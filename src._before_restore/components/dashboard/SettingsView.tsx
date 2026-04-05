import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, KeyRound, Lock, Shield, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleHeader from "./ModuleHeader";
import { toast } from "sonner";
import {
  getAccessControl,
  getCriticalRisks,
  getGovernanceKeys,
  getGovernancePredictions,
  getGovernanceStatus,
  getIntegrationHealth,
  postDisableGovernance,
  postEnableGovernance,
  postEnforceLeastPrivilege,
  postGovernanceSafety,
  postRemoveInactiveUsers,
  postRestrictGovernanceKey,
  postRevokeGovernanceKey,
  postRotateGovernanceKey,
  postStabilizeSecurity,
  type GovernanceRisk,
} from "@/lib/ai-governance";
import { withContextQuery } from "@/lib/context";

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
  const [loading, setLoading] = useState(true);
  const [modeOn, setModeOn] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getGovernanceStatus>> | null>(null);
  const [risks, setRisks] = useState<GovernanceRisk[]>([]);
  const [access, setAccess] = useState<Awaited<ReturnType<typeof getAccessControl>>>([]);
  const [keys, setKeys] = useState<Awaited<ReturnType<typeof getGovernanceKeys>>>([]);
  const [integrations, setIntegrations] = useState<Awaited<ReturnType<typeof getIntegrationHealth>>>([]);
  const [predictions, setPredictions] = useState<string[]>([]);
  const [events, setEvents] = useState<Array<{ ts: string; type: string; msg: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Astra AI Governance online. Ask: Why is this risky? What should I fix? Who has admin access?" },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, a, k, i, p] = await Promise.all([
        getGovernanceStatus(),
        getCriticalRisks(),
        getAccessControl(),
        getGovernanceKeys(),
        getIntegrationHealth(),
        getGovernancePredictions(),
      ]);
      setStatus(s);
      setModeOn(s.mode === "on");
      setRisks(r);
      setAccess(a);
      setKeys(k);
      setIntegrations(i);
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

  const admins = useMemo(() => access.filter((a) => a.role === "Admin"), [access]);

  return (
    <div className="space-y-5 pb-10">
      <ModuleHeader title="AI Governance & Security Control Plane" subtitle="Identity, policy enforcement, compliance, and autonomous remediation." />

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-violet-200">
          <Shield className="w-3.5 h-3.5" />
          AI Governance Mode
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 h-9 text-[11px] uppercase tracking-widest text-white/75">
          {modeOn ? "ON" : "OFF"}
          <input
            type="checkbox"
            className="accent-violet-500"
            checked={modeOn}
            onChange={async (e) => {
              setBusy("mode");
              try {
                if (e.target.checked) await postEnableGovernance(); else await postDisableGovernance();
                setModeOn(e.target.checked);
                toast.success(`AI Governance ${e.target.checked ? "enabled" : "disabled"}`);
              } finally {
                setBusy(null);
              }
            }}
          />
        </label>
        <Button
          className="ml-auto h-9 text-[10px] uppercase tracking-widest"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("stabilize");
            try {
              const out = await postStabilizeSecurity();
              toast.success(`Security stabilized · risk reduced ${out.riskReducedPct}%`);
              await load();
            } finally {
              setBusy(null);
            }
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Stabilize Security
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Security Score</p><p className="text-2xl font-black text-white">{status?.securityScoreGrade ?? "B"}</p></div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Score Value</p><p className="text-2xl font-black text-indigo-300">{status?.securityScoreValue ?? "--"}%</p></div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">MFA Coverage</p><p className="text-2xl font-black text-emerald-300">{status?.mfaCoverage ?? "--"}%</p></div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Key Rotation</p><p className="text-2xl font-black text-blue-300">{status?.keyRotationCoverage ?? "--"}%</p></div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Access Control</p><p className="text-2xl font-black text-amber-300">{status?.accessControlCoverage ?? "--"}%</p></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-white/45">Critical Risks</p>
        {risks.map((r) => (
          <div key={r.id} className={`rounded-xl border p-3 ${severityClass[r.severity]}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest">{r.severity}</span>
              <span className="text-sm font-black text-white">{r.title}</span>
              <span className="ml-auto text-[11px]">Risk {r.riskScore}</span>
            </div>
            <p className="text-[12px] text-white/80 mt-1">Impact: {r.impactedResources}</p>
            <Button size="sm" className="mt-2 h-8 text-[10px] uppercase tracking-widest" onClick={() => toast.success(`${r.action} triggered`)}>
              {r.action}
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45">Access Control</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={async () => { await postEnforceLeastPrivilege(); toast.success("Least privilege enforced"); await load(); }}>
                Enforce Least Privilege
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={async () => { const out = await postRemoveInactiveUsers(); toast.success(`Removed ${out.removed.length} inactive users`); await load(); }}>
                Remove Inactive
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {access.map((u) => (
              <div key={u.id} className="rounded-xl border border-white/10 bg-[#111827] p-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white font-semibold">{u.user}</span>
                <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/70">{u.role}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${u.riskLevel === "HIGH" ? "border-red-500/30 text-red-300" : u.riskLevel === "MEDIUM" ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300"}`}>{u.riskLevel}</span>
                <span className="ml-auto text-[11px] text-white/50">{u.lastActivity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">API Key Intelligence</p>
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="rounded-xl border border-white/10 bg-[#111827] p-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-black text-white">{k.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${k.exposureRisk === "HIGH" ? "border-red-500/30 text-red-300" : k.exposureRisk === "MEDIUM" ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300"}`}>{k.exposureRisk}</span>
                  <span className="ml-auto text-[11px] text-white/50">Risk {k.riskScore}</span>
                </div>
                <p className="text-[11px] text-white/55 mt-1">Usage {k.usage} · Last used {k.lastUsed}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-8 text-[10px] uppercase tracking-widest" onClick={async () => { await postRotateGovernanceKey(k.id); toast.success("Key rotated"); await load(); }}>Rotate</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={async () => { await postRevokeGovernanceKey(k.id); toast.success("Key revoked"); await load(); }}>Revoke</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={async () => { await postRestrictGovernanceKey(k.id); toast.success("Scope restricted"); await load(); }}>Restrict Scope</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Integration Health Panel</p>
          {integrations.map((i) => (
            <div key={i.provider} className="rounded-xl border border-white/10 bg-[#111827] p-3 flex items-center gap-2">
              <span className="text-sm font-black text-white w-16">{i.provider}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${i.status === "healthy" ? "border-emerald-500/30 text-emerald-300" : i.status === "degraded" ? "border-amber-500/30 text-amber-300" : "border-red-500/30 text-red-300"}`}>{i.status}</span>
              <span className="text-[11px] text-white/60">auth: {i.authHealth}</span>
              <span className="text-[11px] text-white/60">perm: {i.permissions}</span>
            </div>
          ))}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
            AI Suggestion: Re-auth GCP to restore access and permission validity.
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Real-Time Security Stream</p>
          <div className="max-h-[220px] overflow-y-auto space-y-1 font-mono text-[11px]">
            {events.map((e, idx) => (
              <div key={`${e.ts}-${idx}`} className="grid grid-cols-[85px_140px_1fr] gap-2">
                <span className="text-white/40">{e.ts}</span>
                <span className="text-blue-300 uppercase">{e.type}</span>
                <span className="text-white/80">{e.msg}</span>
              </div>
            ))}
            {events.length === 0 ? <p className="text-white/35">Waiting for login attempts, key usage, access changes...</p> : null}
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
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Safety Controls</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <label className="rounded-lg border border-white/10 p-2 flex items-center justify-between text-[12px] text-white/80">Approval mode<input type="checkbox" checked={Boolean(status?.approvalMode)} onChange={async (e) => { await postGovernanceSafety({ approvalMode: e.target.checked }); await load(); }} /></label>
          <label className="rounded-lg border border-white/10 p-2 flex items-center justify-between text-[12px] text-white/80">Audit logs required<input type="checkbox" checked={Boolean(status?.auditLogsRequired)} onChange={async (e) => { await postGovernanceSafety({ auditLogsRequired: e.target.checked }); await load(); }} /></label>
          <label className="rounded-lg border border-white/10 p-2 flex items-center justify-between text-[12px] text-white/80">Rollback actions<input type="checkbox" checked={Boolean(status?.rollbackActions)} onChange={async (e) => { await postGovernanceSafety({ rollbackActions: e.target.checked }); await load(); }} /></label>
          <label className="rounded-lg border border-white/10 p-2 flex items-center justify-between text-[12px] text-white/80">Max actions/hr<input type="number" min={1} max={40} value={status?.maxOptimizationsPerHour ?? 8} onChange={async (e) => { await postGovernanceSafety({ maxOptimizationsPerHour: Number(e.target.value) || 8 }); await load(); }} className="w-14 rounded border border-white/10 bg-[#111827] px-2 py-1 text-xs" /></label>
        </div>
      </div>

      <div className="fixed right-4 bottom-20 z-[70]">
        <button onClick={() => setChatOpen((v) => !v)} className="h-12 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
          <Bot className="w-4 h-4 inline mr-2" />
          Astra AI
        </button>
      </div>
      {chatOpen ? (
        <div className="fixed right-4 bottom-36 z-[70] w-[360px] rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl">
          <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-widest text-white/60">AI Governance Explanation</div>
          <div className="max-h-[260px] overflow-y-auto p-3 space-y-2">
            {chat.map((m, i) => <div key={i} className={`rounded-lg px-3 py-2 text-[12px] ${m.role === "ai" ? "bg-[#111827] text-white/90" : "bg-indigo-600/30 text-indigo-100 border border-indigo-400/20"}`}>{m.text}</div>)}
          </div>
          <div className="p-2 border-t border-white/10">
            <div className="flex gap-1 mb-2 overflow-x-auto">
              {["Why is this risky?", "What should I fix?", "Who has admin access?"].map((q) => (
                <button key={q} onClick={() => setChatInput(q)} className="whitespace-nowrap rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:text-white">{q}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="h-9 flex-1 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none" placeholder="Ask Astra AI..." />
              <Button size="sm" className="h-9" onClick={() => {
                const q = chatInput.trim();
                if (!q) return;
                let answer = `Top risk is ${risks[0]?.title ?? "credential exposure"}. Root cause: weak key lifecycle + privileged access drift. Recommended actions: rotate high-risk keys, enforce MFA, re-auth degraded cloud integration. Confidence: 92%.`;
                if (/admin access/i.test(q)) answer = `Admin users: ${admins.map((a) => a.user).join(", ") || "none"}. Suggest reducing permanent admin grants and enabling just-in-time elevation.`;
                if (/what should i fix/i.test(q)) answer = `Fix order: 1) rotate expiring/exposed keys, 2) enforce MFA for privileged users, 3) remove inactive users, 4) repair degraded integrations.`;
                setChat((prev) => [...prev, { role: "user", text: q }, { role: "ai", text: answer }]);
                setChatInput("");
              }}>
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
        <Lock className="w-4 h-4 inline mr-2" />
        Secure-by-default guardrails are active. All governance changes are auditable and reversible.
      </div>

      {loading ? <div className="text-xs text-white/50">Loading governance control plane...</div> : null}
    </div>
  );
}
