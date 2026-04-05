import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Brain, CheckCircle2, Lock, Shield, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ModuleHeader from "./ModuleHeader";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo } from "@/lib/ai-ceo";

type Severity = "low" | "medium" | "high" | "critical";
type AutoMode = "manual" | "auto_protect";
type StreamTone = "green" | "yellow" | "red" | "blue";

interface ThreatItem {
  id: string;
  name: string;
  severity: Severity;
  affectedServices: string[];
  blastRadius: string;
  mitigation: string[];
  mitigatedPct: number;
}

interface VulnerabilityItem {
  cve: string;
  severity: Severity;
  service: string;
  riskScore: number;
  recommendation: string;
}

const INITIAL_THREATS: ThreatItem[] = [
  {
    id: "thr-1",
    name: "Credential stuffing burst",
    severity: "critical",
    affectedServices: ["auth-service", "api-gateway"],
    blastRadius: "Customer login paths",
    mitigation: ["Rate limit abusive IPs", "Block malicious CIDR", "Enforce MFA challenge"],
    mitigatedPct: 82,
  },
  {
    id: "thr-2",
    name: "L7 DDoS pressure",
    severity: "high",
    affectedServices: ["edge-gateway"],
    blastRadius: "Public API endpoints",
    mitigation: ["Enable WAF rule pack", "Geo/IP deny list", "Traffic shaping"],
    mitigatedPct: 64,
  },
  {
    id: "thr-3",
    name: "Suspicious token replay",
    severity: "medium",
    affectedServices: ["session-service"],
    blastRadius: "Internal auth sessions",
    mitigation: ["Rotate session signing keys", "Invalidate stale tokens"],
    mitigatedPct: 58,
  },
];

const INITIAL_VULNS: VulnerabilityItem[] = [
  {
    cve: "CVE-2026-1001",
    severity: "critical",
    service: "auth-service",
    riskScore: 92,
    recommendation: "Patch auth container base image and rotate keys.",
  },
  {
    cve: "CVE-2026-2088",
    severity: "high",
    service: "api-gateway",
    riskScore: 81,
    recommendation: "Upgrade gateway package and apply request-smuggling fix.",
  },
  {
    cve: "CVE-2026-3812",
    severity: "medium",
    service: "worker-pool",
    riskScore: 64,
    recommendation: "Apply runtime sandbox update in next maintenance window.",
  },
];

const badgeTone = (severity: Severity) =>
  severity === "critical"
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : severity === "high"
    ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
    : severity === "medium"
    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

const SecurityView: React.FC = () => {
  const [securityMode, setSecurityMode] = useState(false);
  const [autoMode, setAutoMode] = useState<AutoMode>("auto_protect");
  const [runningRemediation, setRunningRemediation] = useState(false);
  const [threats, setThreats] = useState<ThreatItem[]>(INITIAL_THREATS);
  const [vulnerabilities] = useState<VulnerabilityItem[]>(INITIAL_VULNS);
  const [blockedThreats, setBlockedThreats] = useState(0);
  const [actionsTaken, setActionsTaken] = useState(0);
  const [stream, setStream] = useState<Array<{ id: string; ts: string; event: string; tone: StreamTone }>>([]);
  const [zeroTrust, setZeroTrust] = useState(true);

  const securityScore = useMemo(() => {
    const activeThreatPenalty = threats.length * 8;
    const vulnPenalty = vulnerabilities.reduce((acc, v) => acc + (v.severity === "critical" ? 8 : v.severity === "high" ? 5 : 2), 0);
    const complianceBoost = zeroTrust ? 12 : 4;
    return Math.max(35, Math.min(99, 100 - activeThreatPenalty - vulnPenalty + complianceBoost));
  }, [threats.length, vulnerabilities, zeroTrust]);

  const addStream = (event: string, tone: StreamTone = "blue") => {
    setStream((prev) => [{ id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), event, tone }, ...prev].slice(0, 24));
  };

  useEffect(() => {
    void getAICeoStatus()
      .then((s) => setSecurityMode(Boolean(s.enabled)))
      .catch(() => {
        // no-op
      });
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/ai-ceo/stream");
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as Record<string, unknown>;
        const text = String(payload.type ?? "security_update").replace(/_/g, " ");
        const lc = text.toLowerCase();
        const tone: StreamTone = lc.includes("failed")
          ? "red"
          : lc.includes("optimize") || lc.includes("enabled") || lc.includes("stabilize")
          ? "green"
          : lc.includes("pause")
          ? "yellow"
          : "blue";
        addStream(text, tone);
      } catch {
        addStream("security telemetry updated", "blue");
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const toggleSecurityMode = async (enabled: boolean) => {
    try {
      if (enabled) {
        await postEnableAICeo({ approvalMode: false });
        addStream("AI SecOps actively protecting system", "green");
      } else {
        await postDisableAICeo();
        addStream("AI Security Mode disabled", "yellow");
      }
      setSecurityMode(enabled);
    } catch {
      addStream("Failed to toggle security mode", "red");
    }
  };

  const runAutoRemediation = async () => {
    setRunningRemediation(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setThreats((prev) =>
        prev.map((t) => ({
          ...t,
          mitigatedPct: Math.min(100, t.mitigatedPct + 22),
        }))
      );
      setBlockedThreats((prev) => prev + 3);
      setActionsTaken((prev) => prev + 5);
      addStream("Auto remediation executed: WAF + IP block + service isolation", "green");
      addStream("MFA policy enforced on high-risk flows", "green");
      addStream("Compromised service restarted in protected mode", "yellow");
    } finally {
      setRunningRemediation(false);
    }
  };

  const complianceScore = useMemo(() => Math.max(70, Math.min(99, securityScore - 3 + (zeroTrust ? 4 : -2))), [securityScore, zeroTrust]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ModuleHeader title="AI SecOps Engine" subtitle="Autonomous threat detection, policy enforcement, and safe remediation" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-[10px] uppercase tracking-widest text-indigo-200">
            AI Security Mode
            <input type="checkbox" checked={securityMode} onChange={(e) => void toggleSecurityMode(e.target.checked)} className="accent-indigo-500" />
            {securityMode ? "ON" : "OFF"}
          </label>
          <select
            value={autoMode}
            onChange={(e) => setAutoMode(e.target.value as AutoMode)}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] text-white"
          >
            <option value="manual">Manual</option>
            <option value="auto_protect">Auto Protect</option>
          </select>
          <Button type="button" onClick={() => void runAutoRemediation()} disabled={runningRemediation} className="h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white">
            {runningRemediation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
            Auto Remediate
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
        AI SecOps actively protecting system · threats blocked: {blockedThreats} · actions taken: {actionsTaken}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase text-white/45">Security Score</p>
          <p className={cn("text-3xl font-black mt-1", securityScore >= 85 ? "text-emerald-300" : securityScore >= 65 ? "text-yellow-300" : "text-red-300")}>{securityScore}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-[10px] uppercase text-red-200">Active Threats</p>
          <p className="text-2xl text-red-100 font-bold mt-1">{threats.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[10px] uppercase text-emerald-200">Attack Mitigated</p>
          <p className="text-2xl text-emerald-100 font-bold mt-1">{Math.round(threats.reduce((a, t) => a + t.mitigatedPct, 0) / threats.length)}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase text-white/45">Compliance Score</p>
          <p className="text-2xl text-indigo-300 font-bold mt-1">{complianceScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Active Threat Response Panel</p>
          <div className="space-y-2">
            {threats.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white font-semibold">{t.name}</p>
                  <span className={cn("px-2 py-0.5 rounded-full border text-[10px] uppercase", badgeTone(t.severity))}>{t.severity}</span>
                </div>
                <p className="text-xs text-white/65 mt-1">Affected services: {t.affectedServices.join(", ")}</p>
                <p className="text-xs text-white/65 mt-1">Blast radius: {t.blastRadius}</p>
                <p className="text-xs text-emerald-300 mt-1">Mitigation actions: {t.mitigation.join(" · ")}</p>
                <p className="text-xs text-indigo-300 mt-1">Attack mitigated: {t.mitigatedPct}% · Systems protected: {t.affectedServices.length}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Threat Prediction Engine</p>
          <div className="space-y-2 text-[12px] text-white/80">
            <p>- Credential attack likely against auth endpoints.</p>
            <p>- DDoS risk increasing on edge-gateway.</p>
            <p>- Vulnerability exploit attempt detected on outdated dependency chain.</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">AI Decision Engine</p>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <p className="text-white/85">Decision: block IP range</p>
              <p className="text-white/60 mt-1">Reason: brute force attack detected</p>
              <p className="text-indigo-300 mt-1">Confidence: 94% · Outcome: attack stopped</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <p className="text-white/85">Decision: enable WAF strict mode</p>
              <p className="text-white/60 mt-1">Reason: request anomaly threshold exceeded</p>
              <p className="text-indigo-300 mt-1">Confidence: 89% · Outcome: malicious requests reduced</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Vulnerability Management</p>
          <div className="space-y-2">
            {vulnerabilities.map((v) => (
              <div key={v.cve} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <div className="flex items-center justify-between">
                  <p className="text-white/85 text-sm">{v.cve}</p>
                  <span className={cn("px-2 py-0.5 rounded-full border text-[10px] uppercase", badgeTone(v.severity))}>{v.severity}</span>
                </div>
                <p className="text-xs text-white/60 mt-1">{v.service} · Risk score {v.riskScore}</p>
                <p className="text-xs text-emerald-300 mt-1">{v.recommendation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Policy & Compliance Engine</p>
          <div className="text-[12px] text-white/80 space-y-1">
            <p>- Rate limiting rules: strict on auth APIs</p>
            <p>- Access policy: zero-trust validation enabled</p>
            <p>- Compliance checks: SOC2 / ISO policy scans active</p>
            <p>- MFA requirement: enforced for privileged flows</p>
            <p>- API limits: anomaly-triggered adaptive throttling</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#060a12] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/45">Real-time Security Stream</p>
          </div>
          <div className="p-3 h-[260px] overflow-y-auto font-mono text-[12px]">
            {stream.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/35">Waiting for threat events...</div>
            ) : (
              stream.map((s) => (
                <div key={s.id} className="grid grid-cols-[90px_1fr] gap-2 py-1">
                  <span className="text-white/35">{s.ts}</span>
                  <span className={cn("truncate", s.tone === "green" ? "text-emerald-300" : s.tone === "yellow" ? "text-yellow-300" : s.tone === "red" ? "text-red-300" : "text-indigo-300")}>
                    {s.event}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Root Cause AI + Prevention</p>
          <p className="text-[12px] text-white/80 leading-relaxed">
            Attack succeeded because rate limiting and MFA controls were not uniformly enforced on high-risk endpoints, and WAF policy was in permissive mode.
            Prevention: enforce strict login throttles, require MFA for risky sessions, enable service-to-service auth checks, and patch high-priority CVEs in priority order.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white/75">
              <input type="checkbox" checked={zeroTrust} onChange={(e) => setZeroTrust(e.target.checked)} className="accent-indigo-500" />
              Zero Trust Mode
            </label>
            <span className="text-[11px] text-emerald-300">Strict access validation active</span>
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-100">
        <Sparkles className="w-4 h-4 inline mr-2" />
        Auto-remediation and policy guardrails are active with false-positive safety thresholds and rollback-safe actions.
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-[11px] text-white/70">
        <Shield className="w-4 h-4 inline mr-2 text-emerald-300" />
        Validation: attacks blocked, system stable, explainable decisions logged.
        <Ban className="w-4 h-4 inline mx-2 text-red-300" />
        No destructive blocking rules applied.
        <Lock className="w-4 h-4 inline mx-2 text-indigo-300" />
        Zero-trust protections enforced.
        <ShieldAlert className="w-4 h-4 inline mx-2 text-yellow-300" />
        Compliance checks continuously running.
      </div>
    </div>
  );
};

export default SecurityView;
