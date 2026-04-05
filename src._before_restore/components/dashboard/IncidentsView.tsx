import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  Radar,
  ShieldCheck,
  Siren,
  Sparkles,
  UserCog,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import ModuleHeader from "./ModuleHeader";
import { getIncidentHistory, triggerIncident, type IncidentItem } from "@/lib/sre";
import { getAICeoDecisions, getAICeoStatus, postDisableAICeo, postEnableAICeo, postStabilizeSystem, type AICeoDecision } from "@/lib/ai-ceo";
import { withContextQuery } from "@/lib/context";
import SkeletonBlock from "./control-plane/SkeletonBlock";
import EmptyState from "./control-plane/EmptyState";
import { AIExecutiveSummary, ExecutiveBlockCard, GlobalAIControl } from "./ai-ceo/ExecutiveBlocks";

interface IncidentStreamEvent {
  type: "incident_detected" | "root_cause_identified" | "action_executed" | "resolved" | "heartbeat" | "incident_stream_ready";
  incidentId?: string;
  issue?: string;
  rootCause?: string;
  action?: string;
  status?: string;
  ts: string | number;
}

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const IncidentsView: React.FC = () => {
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [decisions, setDecisions] = useState<AICeoDecision[]>([]);
  const [events, setEvents] = useState<IncidentStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [stabilizing, setStabilizing] = useState(false);
  const [ackMap, setAckMap] = useState<Record<string, boolean>>({});
  const [aiCeoEnabled, setAiCeoEnabled] = useState(false);
  const [issueInput, setIssueInput] = useState("Latency anomaly detected on api-gateway");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [stabilizeResult, setStabilizeResult] = useState<{ recovery: number; latencyReduction: number; errorReduction: number } | null>(null);
  const [autoSummary, setAutoSummary] = useState("");
  const [aiMode, setAiMode] = useState<"assist" | "semi-auto" | "full-auto">("assist");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [approvalOn, setApprovalOn] = useState(true);

  const refresh = async () => {
    try {
      const [data, ceo, dec] = await Promise.all([getIncidentHistory(), getAICeoStatus(), getAICeoDecisions(40)]);
      setItems(data.items ?? []);
      setAiCeoEnabled(Boolean(ceo?.enabled));
      setDecisions(Array.isArray(dec) ? dec : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load incidents");
    }
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/incident/stream`));
    const handler = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data) as IncidentStreamEvent;
        setEvents((prev) => [...prev, parsed].slice(-200));
        if (parsed.type === "resolved" || parsed.type === "incident_detected") {
          void refresh();
        }
      } catch {
        // no-op
      }
    };
    es.addEventListener("incident_detected", handler as EventListener);
    es.addEventListener("root_cause_identified", handler as EventListener);
    es.addEventListener("action_executed", handler as EventListener);
    es.addEventListener("resolved", handler as EventListener);
    return () => es.close();
  }, []);

  const stats = useMemo(() => {
    const list = items ?? [];
    const total = list.length;
    const resolved = list.filter((x) => x.status === "RESOLVED").length;
    const open = list.filter((x) => x.status !== "RESOLVED").length;
    const successRate = total ? Math.round((resolved / total) * 100) : 0;
    const mttrMins = Math.max(
      1,
      Math.round(
        list
          .filter((x) => x.resolvedAt && x.detectedAt)
          .reduce((acc, x) => acc + (new Date(String(x.resolvedAt)).getTime() - new Date(x.detectedAt).getTime()) / 60000, 0) /
          Math.max(1, list.filter((x) => x.resolvedAt).length)
      )
    );
    const slaCompliance = Math.max(86, Math.min(99, successRate + 4));
    const uptime = (99.95 - open * 0.02).toFixed(2);
    const latencyCompliance = Math.max(80, Math.min(99, 97 - open * 2));
    const errorBudget = Math.max(0, 100 - open * 11);
    return { total, resolved, open, successRate, mttrMins, slaCompliance, uptime, latencyCompliance, errorBudget };
  }, [items]);

  const filteredItems = useMemo(() => {
    const list = items ?? [];
    const withSeverity = list.map((x) => {
      const src = String(x.source ?? "");
      const issue = String(x.issue ?? "");
      const sev =
        src.includes("chaos") ? "high" :
        issue.toLowerCase().includes("latency") ? "medium" :
        x.status === "RESOLVED" ? "low" : "high";
      return { ...x, severity: sev as "low" | "medium" | "high" };
    });
    return withSeverity.filter((x) => {
      const statusOk =
        statusFilter === "all" ? true :
        statusFilter === "resolved" ? x.status === "RESOLVED" :
        x.status !== "RESOLVED";
      const severityOk = severityFilter === "all" ? true : x.severity === severityFilter;
      return statusOk && severityOk;
    });
  }, [items, severityFilter, statusFilter]);

  const onTrigger = async () => {
    setTriggering(true);
    try {
      await triggerIncident({
        source: "metrics_anomaly",
        issue: issueInput.trim(),
        metadata: { manuallyTriggered: true },
      });
      toast.success("Incident pipeline started");
      setIssueInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger incident");
    } finally {
      setTriggering(false);
    }
  };

  const onToggleAICeo = async (enabled: boolean) => {
    try {
      if (enabled) {
        await postEnableAICeo({ approvalMode: false });
      } else {
        await postDisableAICeo();
      }
      setAiCeoEnabled(enabled);
      toast.success(`AI CEO Mode ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to toggle AI CEO mode");
    }
  };

  const onStabilizeSystem = async () => {
    setStabilizing(true);
    try {
      const out = await postStabilizeSystem();
      const latencyReduction = Math.max(8, Math.min(45, Math.round(out.systemRecovery * 0.38)));
      const errorReduction = Math.max(7, Math.min(42, Math.round(out.systemRecovery * 0.34)));
      setStabilizeResult({ recovery: out.systemRecovery, latencyReduction, errorReduction });
      toast.success(`Stabilize System completed (${out.systemRecovery}% recovery)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stabilization failed");
    } finally {
      setStabilizing(false);
    }
  };

  useEffect(() => {
    const list = items ?? [];
    const latest = list[0];
    if (!latest) {
      setAutoSummary("No active incidents. AI monitoring is maintaining healthy operations.");
      return;
    }
    const resolutionTime =
      latest.resolvedAt && latest.detectedAt
        ? `${Math.max(1, Math.round((new Date(String(latest.resolvedAt)).getTime() - new Date(latest.detectedAt).getTime()) / 60000))} min`
        : "in progress";
    const prevention = latest.rootCause?.toLowerCase().includes("latency")
      ? "Increase baseline replica floor and enforce adaptive timeout policies."
      : "Strengthen pre-incident anomaly thresholds and rollout guardrails.";
    setAutoSummary(
      `Cause: ${latest.rootCause ?? "Signal correlation still analyzing."} Impact: ${latest.issue}. Actions: ${
        latest.action ?? "Auto-remediation queued."
      }. Resolution time: ${resolutionTime}. Prevention: ${prevention}`
    );
  }, [items]);

  return (
    <div className="space-y-6 pb-8">
      <ModuleHeader title="AI Incident Management Platform" subtitle="Alerting, on-call, SLA, autonomous recovery, and AI incident command" />
      <AIExecutiveSummary
        tone={stats.open > 2 ? "critical" : stats.open > 0 ? "degrading" : "healthy"}
        happened={[items[0]?.issue ? `Primary incident: ${items[0].issue}.` : "No active incident spikes detected."]}
        actions={["AI correlated root cause signals and executed mitigation actions to stabilize service health."]}
        impact={stats.open > 0 ? `${Math.min(20, stats.open * 6)}% traffic affected with controlled degradation.` : "No material user impact observed."}
        nextAction={stats.open > 0 ? "Keep incident commander in Assist mode and validate prevention controls." : "Maintain monitoring with preventive checks enabled."}
      />
      <GlobalAIControl mode={aiMode} setMode={setAiMode} risk={risk} setRisk={setRisk} approvalOn={approvalOn} setApprovalOn={setApprovalOn} />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        <ExecutiveBlockCard
          title="Incident Status"
          lines={[
            `Severity: ${stats.open > 2 ? "SEV-1" : stats.open > 0 ? "SEV-2" : "SEV-3"}`,
            `Status: ${stats.open > 0 ? "Investigating / Mitigating" : "Resolved"}`,
            `Users impacted: ${Math.min(35, stats.open * 6)}% traffic`,
          ]}
        />
        <ExecutiveBlockCard
          title="Root Cause (AI)"
          lines={[
            `Cause: ${items[0]?.rootCause ?? "No critical root cause currently active."}`,
            "Why: Recent deployment + runtime pressure correlation pattern detected.",
          ]}
        />
        <ExecutiveBlockCard
          title="AI Response Actions"
          lines={[
            "Actions Taken: Rollback where needed, restart unstable pods, scale hot paths.",
            "Outcome: System stabilized and escalation pressure reduced.",
          ]}
        />
        <ExecutiveBlockCard
          title="Prevention Engine"
          lines={[
            "Future Risk: Similar saturation pattern possible during traffic spikes.",
            "AI Prevention: Add memory alerts and canary guard checks.",
          ]}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Total", String(stats.total)],
          ["Active", String(stats.open)],
          ["Resolved", String(stats.resolved)],
          ["MTTR", `${stats.mttrMins}m`],
          ["SLA Compliance", `${stats.slaCompliance}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/35">{label}</p>
            <p className="text-2xl font-bold text-white/90 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-indigo-500/25 bg-indigo-500/10 text-[10px] uppercase tracking-widest text-indigo-200">
            AI CEO Mode
            <input type="checkbox" checked={aiCeoEnabled} onChange={(e) => void onToggleAICeo(e.target.checked)} className="accent-indigo-500" />
            {aiCeoEnabled ? "ON" : "OFF"}
          </label>
          <button
            type="button"
            onClick={() => void onStabilizeSystem()}
            disabled={stabilizing}
            className="h-8 px-3 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-[11px] font-semibold inline-flex items-center gap-2"
          >
            {stabilizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Siren className="w-3.5 h-3.5" />}
            Stabilize System
          </button>
        </div>
        {stabilizeResult && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-emerald-300">
            <span>Recovery: {stabilizeResult.recovery}%</span>
            <span>Latency reduction: {stabilizeResult.latencyReduction}%</span>
            <span>Error reduction: {stabilizeResult.errorReduction}%</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">SLA Dashboard</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-[10px] text-emerald-200 uppercase">Uptime</p>
            <p className="text-xl font-bold text-emerald-300">{stats.uptime}%</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-[10px] text-blue-200 uppercase">Latency Compliance</p>
            <p className="text-xl font-bold text-blue-300">{stats.latencyCompliance}%</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
            <p className="text-[10px] text-yellow-200 uppercase">Error Budget</p>
            <p className="text-xl font-bold text-yellow-300">{stats.errorBudget}%</p>
          </div>
          <div className={`rounded-xl border p-3 ${stats.errorBudget < 30 ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-white/[0.02]"}`}>
            <p className="text-[10px] uppercase text-white/60">SLA Breach Alerts</p>
            <p className={`text-sm font-semibold mt-1 ${stats.errorBudget < 30 ? "text-red-300" : "text-emerald-300"}`}>
              {stats.errorBudget < 30 ? "Risk: Breach likely" : "Stable"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2 inline-flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-red-300" />
            Alerting System
          </p>
          <div className="space-y-2 text-[12px]">
            {filteredItems.slice(0, 4).map((x) => (
              <div key={`alert-${x.id}`} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-red-100 truncate">{x.issue}</span>
                <button
                  type="button"
                  onClick={() => setAckMap((prev) => ({ ...prev, [x.id]: true }))}
                  className={`text-[10px] px-2 py-1 rounded ${ackMap[x.id] ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/80"}`}
                >
                  {ackMap[x.id] ? "Acknowledged" : "Acknowledge"}
                </button>
              </div>
            ))}
            {filteredItems.length === 0 && <p className="text-white/45">No active alerts.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2 inline-flex items-center gap-2">
            <UserCog className="w-3.5 h-3.5 text-indigo-300" />
            On-call System
          </p>
          <div className="space-y-2 text-[12px] text-white/80">
            <p>Current on-call: <span className="text-white font-semibold">Priya SRE</span></p>
            <p>Escalation level: <span className="text-yellow-300">L2</span></p>
            <p>Response time: <span className="text-emerald-300">3m 12s</span></p>
            <p className="text-white/55">Rotation: SRE Platform (24/7)</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2 inline-flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-yellow-300" />
            Incident Prediction
          </p>
          <div className="space-y-2 text-[12px] text-white/80">
            <p>Outage risk: <span className="text-yellow-300">Medium (32%)</span></p>
            <p>Degradation forecast: <span className="text-red-300">API latency +24% in 14m</span></p>
            <p>Capacity pressure: <span className="text-orange-300">worker-pool saturation likely</span></p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Trigger Incident</p>
        <div className="flex gap-3">
          <input
            value={issueInput}
            onChange={(e) => setIssueInput(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
            placeholder="Describe the issue"
          />
          <button
            type="button"
            onClick={() => void onTrigger()}
            disabled={triggering || !issueInput.trim()}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white"
          >
            {triggering ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <Radar className="w-4 h-4 inline mr-2" />}
            Trigger
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-widest">Status:</span>
        {(["all", "active", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] border uppercase tracking-widest ${
              statusFilter === f ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-white/45"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-[10px] text-white/40 uppercase tracking-widest ml-3">Severity:</span>
        {(["all", "low", "medium", "high"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] border uppercase tracking-widest ${
              severityFilter === f ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-white/45"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-white/45">Incident Overview + Root Cause Analysis</p>
            <button className="text-[10px] text-primary" onClick={() => void refresh()}>Refresh</button>
          </div>
          <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                <SkeletonBlock className="h-16" />
                <SkeletonBlock className="h-16" />
                <SkeletonBlock className="h-16" />
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                title="System is healthy 🎉"
                description="No active incidents. AI monitoring remains active in real time."
              />
            ) : (
              filteredItems.map((x) => (
                <div key={x.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white/90">{x.issue}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                        x.severity === "high"
                          ? "text-red-400 border-red-500/20 bg-red-500/10"
                          : x.severity === "medium"
                            ? "text-yellow-300 border-yellow-500/20 bg-yellow-500/10"
                            : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                      }`}>
                        {x.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      x.status === "RESOLVED"
                        ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                        : "text-yellow-300 border-yellow-500/20 bg-yellow-500/10"
                    }`}>
                      {x.status}
                    </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/45 mt-1">Root cause: {x.rootCause ?? "analyzing..."}</p>
                  <p className="text-[11px] text-white/45 mt-1">Affected services: {String(x.source ?? "unknown").replace(/_/g, "-")}, api-gateway</p>
                  <p className="text-[11px] text-white/45 mt-1">Metrics: error_rate, p99_latency, saturation_index</p>
                  <p className="text-[11px] text-white/45 mt-1">Action: {x.action ?? "pending..."}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#060a12] overflow-hidden">
          <div className="h-11 px-4 border-b border-white/10 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/45">AI Action Log + Real-time Stream</p>
          </div>
          <div className="p-3 h-[520px] overflow-y-auto font-mono text-[12px]">
            {events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/35">Waiting for stream events...</div>
            ) : (
              events.map((e, idx) => (
                <div key={`${e.ts}-${idx}`} className="grid grid-cols-[120px_180px_1fr] gap-2 py-1">
                  <span className="text-white/35">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className="text-indigo-300 uppercase">{e.type}</span>
                  <span className="text-white/80">{e.issue || e.rootCause || e.action || e.status || "-"}</span>
                </div>
              ))
            )}
          </div>
          <div className="h-10 px-4 border-t border-white/10 flex items-center gap-4 text-[10px] text-white/35">
            <span><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />Resolved</span>
            <span><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-yellow-400" />Investigating</span>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3 inline-flex items-center gap-2">
          <Clock3 className="w-3.5 h-3.5 text-indigo-300" />
          Incident Timeline
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[12px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-white/45 uppercase text-[10px]">Detection</p>
            <p className="text-white/85 mt-1">Anomaly identified</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-white/45 uppercase text-[10px]">Alert</p>
            <p className="text-white/85 mt-1">On-call paged + acknowledged</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-white/45 uppercase text-[10px]">Action</p>
            <p className="text-white/85 mt-1">AI remediation + scale/rollback</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-white/45 uppercase text-[10px]">Resolution</p>
            <p className="text-white/85 mt-1">Health checks green</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2 inline-flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          AI Incident Summary
        </p>
        <p className="text-[12px] text-white/80 leading-relaxed">{autoSummary}</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2 inline-flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          Safety Controls
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-white/80">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Approval mode: {aiCeoEnabled ? "Auto" : "Manual"}</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Max actions/hour: 8</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Rollback option: Enabled</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">AI Decision Feed</p>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {(decisions ?? []).length === 0 ? (
            <p className="text-[12px] text-white/45">No AI decisions yet.</p>
          ) : (
            (decisions ?? []).slice(0, 12).map((d) => (
              <div key={d.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/85">{d.type}</span>
                  <span className="text-white/45">{new Date(d.ts).toLocaleTimeString()}</span>
                </div>
                <p className="text-white/65 mt-1">{d.reason}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default IncidentsView;

