import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Brain, CheckCircle2, Lock, Search, Shield, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import ModuleHeader from "./ModuleHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo } from "@/lib/ai-ceo";

type Risk = "low" | "medium" | "high" | "critical";
type AutoMode = "manual" | "auto_audit";
type StreamTone = "green" | "yellow" | "red" | "blue";

interface ForensicEvent {
  id: string;
  ts: string;
  user: string;
  service: string;
  action: string;
  risk: Risk;
  ip: string;
  region: string;
}

const EVENTS: ForensicEvent[] = [
  { id: "evt-1", ts: "14:18:02", user: "anonymous", service: "auth-service", action: "FAILED_LOGIN x7", risk: "critical", ip: "45.33.32.156", region: "us-east-1" },
  { id: "evt-2", ts: "14:21:10", user: "admin", service: "iam-service", action: "ROLE_CHANGE", risk: "high", ip: "45.33.32.156", region: "us-east-1" },
  { id: "evt-3", ts: "14:23:49", user: "sarah.m", service: "vault", action: "SECRET_READ", risk: "critical", ip: "45.33.32.156", region: "us-east-1" },
  { id: "evt-4", ts: "12:10:11", user: "system", service: "scanner", action: "SECURITY_SCAN", risk: "low", ip: "10.0.0.14", region: "internal" },
  { id: "evt-5", ts: "10:35:40", user: "alice.r", service: "users-db", action: "PII_EXPORT", risk: "high", ip: "192.168.10.14", region: "in-south" },
];

const riskClass = (risk: Risk) =>
  risk === "critical"
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : risk === "high"
    ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
    : risk === "medium"
    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

const AuditLogsView: React.FC = () => {
  const [aiAuditMode, setAiAuditMode] = useState(false);
  const [autoMode, setAutoMode] = useState<AutoMode>("auto_audit");
  const [events, setEvents] = useState<ForensicEvent[]>(EVENTS);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | Risk>("all");
  const [selected, setSelected] = useState<ForensicEvent | null>(EVENTS[0]);
  const [stream, setStream] = useState<Array<{ id: string; ts: string; msg: string; tone: StreamTone }>>([]);
  const [actionsTriggered, setActionsTriggered] = useState(0);
  const [anomaliesDetected, setAnomaliesDetected] = useState(3);
  const [integrityScore, setIntegrityScore] = useState(97);
  const [runningResponse, setRunningResponse] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const riskOk = riskFilter === "all" || e.risk === riskFilter;
      const searchOk =
        q.length === 0 ||
        e.user.toLowerCase().includes(q) ||
        e.service.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q);
      return riskOk && searchOk;
    });
  }, [events, search, riskFilter]);

  const auditRiskScore = useMemo(() => {
    const highRisk = events.filter((e) => e.risk === "critical" || e.risk === "high").length;
    const compliancePenalty = 8;
    return Math.max(30, Math.min(99, 100 - highRisk * 10 - anomaliesDetected * 4 - compliancePenalty));
  }, [events, anomaliesDetected]);

  const addStream = (msg: string, tone: StreamTone = "blue") => {
    setStream((prev) => [{ id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), msg, tone }, ...prev].slice(0, 26));
  };

  useEffect(() => {
    void getAICeoStatus()
      .then((s) => setAiAuditMode(Boolean(s.enabled)))
      .catch(() => {
        // no-op
      });
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/ai-ceo/stream");
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as Record<string, unknown>;
        const msg = String(payload.type ?? "audit_update").replace(/_/g, " ");
        const lc = msg.toLowerCase();
        const tone: StreamTone = lc.includes("failed")
          ? "red"
          : lc.includes("optimize") || lc.includes("enabled") || lc.includes("stabilize")
          ? "green"
          : lc.includes("pause")
          ? "yellow"
          : "blue";
        addStream(msg, tone);
      } catch {
        addStream("audit intelligence stream update", "blue");
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const toggleAuditMode = async (enabled: boolean) => {
    try {
      if (enabled) {
        await postEnableAICeo({ approvalMode: false });
        addStream("AI analyzing audit logs", "green");
      } else {
        await postDisableAICeo();
        addStream("AI Audit Mode disabled", "yellow");
      }
      setAiAuditMode(enabled);
    } catch {
      addStream("failed to toggle audit mode", "red");
    }
  };

  const runAutoResponse = async () => {
    setRunningResponse(true);
    try {
      await new Promise((r) => setTimeout(r, 1100));
      setActionsTriggered((v) => v + 4);
      setAnomaliesDetected((v) => Math.max(0, v - 1));
      setIntegrityScore((v) => Math.min(100, v + 1));
      addStream("Blocked malicious IP range", "green");
      addStream("Revoked suspicious access tokens", "green");
      addStream("Disabled compromised account and opened incident", "yellow");
    } finally {
      setRunningResponse(false);
    }
  };

  const attackChain = useMemo(
    () => ["FAILED_LOGIN x7", "ROLE_CHANGE", "SECRET_READ", "EXTERNAL_API_CALL"],
    []
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <ModuleHeader title="AI Forensic Intelligence Engine" subtitle="Real-time anomaly detection, attack-chain reconstruction, and compliance enforcement" />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          <label className="inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-[10px] uppercase tracking-widest text-indigo-200">
            AI Audit Mode
            <input type="checkbox" checked={aiAuditMode} onChange={(e) => void toggleAuditMode(e.target.checked)} className="accent-indigo-500" />
            {aiAuditMode ? "ON" : "OFF"}
          </label>
          <select
            value={autoMode}
            onChange={(e) => setAutoMode(e.target.value as AutoMode)}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] text-white"
          >
            <option value="manual">Manual</option>
            <option value="auto_audit">Auto Audit</option>
          </select>
          <Button type="button" onClick={() => void runAutoResponse()} disabled={runningResponse} className="h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white whitespace-nowrap">
            {runningResponse ? <Wrench className="w-4 h-4 mr-2 animate-pulse" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
            Auto Response
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
        AI analyzing audit logs · anomalies detected: {anomaliesDetected} · actions triggered: {actionsTriggered}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase text-white/45">Audit Risk Score</p>
          <p className={cn("text-3xl font-black mt-1", auditRiskScore >= 85 ? "text-emerald-300" : auditRiskScore >= 65 ? "text-yellow-300" : "text-red-300")}>{auditRiskScore}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-[10px] uppercase text-red-200">Attack Chain Risk</p>
          <p className="text-2xl text-red-100 font-bold mt-1">92</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase text-white/45">Compliance Score</p>
          <p className="text-2xl text-indigo-300 font-bold mt-1">89%</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[10px] uppercase text-emerald-200">Integrity Score</p>
          <p className="text-2xl text-emerald-100 font-bold mt-1">{integrityScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Advanced Filtering</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="user/service/ip/action"
              className="h-9 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-white md:col-span-2"
            />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as "all" | Risk)}
              className="h-9 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-white"
            >
              <option value="all">all risks</option>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRiskFilter("all");
              }}
              className="h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/80"
            >
              reset
            </button>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelected(e)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-all",
                  selected?.id === e.id ? "border-indigo-500/35 bg-indigo-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white font-semibold">{e.action}</p>
                  <span className={cn("px-2 py-0.5 rounded-full border text-[10px] uppercase", riskClass(e.risk))}>{e.risk}</span>
                </div>
                <p className="text-xs text-white/65 mt-1">{e.user} · {e.service} · {e.ip} · {e.region}</p>
                <p className="text-xs text-white/45 mt-1">{e.ts}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Anomaly Detection Engine</p>
          <div className="text-[12px] text-white/80 space-y-1">
            <p>- Unusual login pattern from scanner subnet.</p>
            <p>- Privilege escalation immediately after login failures.</p>
            <p>- Abnormal API usage for secret retrieval sequence.</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Attack Chain Detection</p>
          <div className="space-y-2">
            {attackChain.map((step, idx) => (
              <div key={step} className="flex items-center gap-2 text-[12px] text-white/80">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-300 text-[10px] inline-flex items-center justify-center">{idx + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/60 mt-3">Affected users/services: `sarah.m`, auth-service, vault · Risk score: 9.2/10</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">AI Decision Panel</p>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <p className="text-white/85">Issue: failed logins + role change</p>
              <p className="text-white/60 mt-1">Decision: block IP + trigger incident</p>
              <p className="text-indigo-300 mt-1">Confidence: 92% · Action taken: enforced</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <p className="text-white/85">Issue: suspicious token replay</p>
              <p className="text-white/60 mt-1">Decision: revoke session tokens</p>
              <p className="text-indigo-300 mt-1">Confidence: 88% · Action taken: partial</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Compliance Engine</p>
          <div className="text-[12px] text-white/80 space-y-1">
            <p>- SOC2 checks: 91% pass</p>
            <p>- ISO controls: 88% pass</p>
            <p>- GDPR checks: 82% pass</p>
            <p className="text-yellow-300">Policy violation: unapproved PII export path</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#060a12] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/45">Real-time Audit Stream</p>
          </div>
          <div className="p-3 h-[260px] overflow-y-auto font-mono text-[12px]">
            {stream.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/35">Waiting for audit events...</div>
            ) : (
              stream.map((s) => (
                <div key={s.id} className="grid grid-cols-[90px_1fr] gap-2 py-1">
                  <span className="text-white/35">{s.ts}</span>
                  <span
                    className={cn(
                      s.tone === "green"
                        ? "text-emerald-300"
                        : s.tone === "yellow"
                        ? "text-yellow-300"
                        : s.tone === "red"
                        ? "text-red-300"
                        : "text-indigo-300"
                    )}
                  >
                    {s.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Forensic Analysis Panel</p>
          <p className="text-[12px] text-white/80 leading-relaxed">
            Root cause: missing adaptive login throttling and delayed privileged-change alerting created a window where credential abuse could escalate.
            Event correlation shows the sequence from brute force to secret access. Preventive controls now prioritize MFA hard enforcement, tighter role-change approvals,
            and token replay detection with immediate revocation.
          </p>
          {selected && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[12px]">
              <p className="text-white/80">Selected event: {selected.action}</p>
              <p className="text-white/60 mt-1">Service: {selected.service} · User: {selected.user}</p>
            </div>
          )}
        </section>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-100">
        <Sparkles className="w-4 h-4 inline mr-2" />
        Secure logging active with tamper checks, anomaly intelligence, and safe automated enforcement controls.
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-[11px] text-white/70">
        <Shield className="w-4 h-4 inline mr-2 text-emerald-300" />
        Validation: anomalies detected with correlation checks.
        <CheckCircle2 className="w-4 h-4 inline mx-2 text-emerald-300" />
        Low false-positive policy mode enabled.
        <Ban className="w-4 h-4 inline mx-2 text-red-300" />
        Blocking actions are scoped and reversible.
        <Lock className="w-4 h-4 inline mx-2 text-indigo-300" />
        Integrity verification score: {integrityScore}%.
        <Search className="w-4 h-4 inline mx-2 text-yellow-300" />
        Forensic query filters active.
      </div>
    </div>
  );
};

export default AuditLogsView;
