import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  Zap, Cloud, Server, ShieldAlert, FlaskConical, Play,
  Timer, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { failoverApi } from "@/lib/hybrid";
import type { FailoverEvent } from "@/lib/hybrid";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  aws:         { label: "AWS",          icon: Cloud,  color: "text-orange-300" },
  azure:       { label: "Azure",        icon: Cloud,  color: "text-blue-300" },
  gcp:         { label: "GCP",          icon: Cloud,  color: "text-green-300" },
  baremetal:   { label: "Bare Metal",   icon: Server, color: "text-slate-300" },
  vmware:      { label: "VMware",       icon: Server, color: "text-indigo-300" },
  "k8s-onprem":{ label: "K8s On-Prem", icon: Server, color: "text-purple-300" },
};

const TRIGGER_META: Record<string, { label: string; color: string }> = {
  ONPREM_NODE_CRASH:    { label: "On-Prem Node Crash",   color: "text-red-400" },
  VMWARE_HOST_FAILURE:  { label: "VMware Host Failure",  color: "text-red-400" },
  K8S_NODE_NOT_READY:   { label: "K8s Node Not Ready",   color: "text-amber-400" },
  CLOUD_REGION_OUTAGE:  { label: "Cloud Region Outage",  color: "text-red-400" },
  LATENCY_SPIKE:        { label: "Latency Spike",         color: "text-amber-400" },
  ERROR_RATE_BREACH:    { label: "Error Rate Breach",     color: "text-amber-400" },
  MANUAL_DRILL:         { label: "Manual Drill",          color: "text-blue-400" },
  SCHEDULED_TEST:       { label: "Scheduled Test",        color: "text-violet-400" },
};

const STATE_COLOR: Record<string, string> = {
  DETECTED:            "bg-red-500/15 text-red-300 border-red-500/20",
  ANALYZING:           "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DRAINING:            "bg-orange-500/15 text-orange-300 border-orange-500/20",
  REDIRECTING_TRAFFIC: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  DEPLOYING_TARGET:    "bg-violet-500/15 text-violet-300 border-violet-500/20",
  VERIFYING:           "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  COMPLETED:           "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ROLLED_BACK:         "bg-orange-500/15 text-orange-300 border-orange-500/20",
  FAILED:              "bg-red-500/15 text-red-300 border-red-500/20",
};

const PHASES: FailoverEvent["state"][] = [
  "DETECTED", "ANALYZING", "DRAINING", "REDIRECTING_TRAFFIC",
  "DEPLOYING_TARGET", "VERIFYING", "COMPLETED",
];

// ─── Phase progress strip ─────────────────────────────────────────────────────

function PhaseStrip({ state }: { state: string }) {
  const idx = PHASES.indexOf(state as any);
  return (
    <div className="flex items-center gap-0.5 mt-2">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-500",
            i < idx ? "bg-emerald-500"
              : i === idx ? state === "FAILED" ? "bg-red-500" : "bg-blue-500 animate-pulse"
              : "bg-white/10"
          )}
        />
      ))}
    </div>
  );
}

// ─── Failover Card ────────────────────────────────────────────────────────────

function FailoverCard({ ev }: { ev: FailoverEvent }) {
  const triggerMeta = TRIGGER_META[ev.trigger] ?? { label: ev.trigger, color: "text-white/50" };
  const fromMeta = PROVIDER_META[ev.sourceProvider];
  const toMeta = PROVIDER_META[ev.targetProvider];
  const FromIcon = fromMeta?.icon ?? Cloud;
  const ToIcon = toMeta?.icon ?? Cloud;
  const isLive = !["COMPLETED", "FAILED", "ROLLED_BACK"].includes(ev.state);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "rounded-2xl border bg-[#0B1220] p-5 flex flex-col gap-3",
        isLive ? "border-blue-500/30" : "border-white/8"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isLive && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />}
          <span className={cn("text-[11px] font-bold", triggerMeta.color)}>{triggerMeta.label}</span>
        </div>
        <Badge className={cn("text-[9px] border shrink-0", STATE_COLOR[ev.state] ?? "text-white/40")}>
          {ev.state.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Route: from → to */}
      <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white/3 border border-white/5">
        <div className="flex items-center gap-1.5">
          <FromIcon className={cn("w-4 h-4", fromMeta?.color ?? "text-white/50")} />
          <span className={cn("text-xs font-bold", fromMeta?.color ?? "text-white/50")}>
            {fromMeta?.label ?? ev.sourceProvider}
          </span>
          <span className="text-[9px] text-white/25 ml-0.5">{ev.sourceEnvironment}</span>
        </div>
        <ArrowRightLeft className="w-4 h-4 text-white/25 shrink-0" />
        <div className="flex items-center gap-1.5">
          <ToIcon className={cn("w-4 h-4", toMeta?.color ?? "text-white/50")} />
          <span className={cn("text-xs font-bold", toMeta?.color ?? "text-white/50")}>
            {toMeta?.label ?? ev.targetProvider}
          </span>
          <span className="text-[9px] text-white/25 ml-0.5">{ev.targetEnvironment}</span>
        </div>
      </div>

      {/* Phase progress */}
      <PhaseStrip state={ev.state} />

      {/* Affected workloads */}
      <div className="flex flex-wrap gap-1.5">
        {ev.affectedWorkloads.map((w) => (
          <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-white/50">{w}</span>
        ))}
      </div>

      {/* RTO / RPO / Duration */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "RTO Target", value: ev.rtoMs ? `${(ev.rtoMs / 1000).toFixed(0)}s` : "—" },
          { label: "RPO Target", value: ev.rpoMs ? `${(ev.rpoMs / 1000).toFixed(1)}s` : "—" },
          { label: "Duration",   value: ev.durationMs ? `${(ev.durationMs / 1000).toFixed(1)}s` : isLive ? "…" : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/3 rounded-lg py-2 border border-white/5">
            <p className="text-[9px] text-white/30">{label}</p>
            <p className="text-[11px] font-bold text-white/70">{value}</p>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <p className="text-[9px] text-white/25">
        Detected {new Date(ev.detectedAt).toLocaleString()}
        {ev.completedAt && ` · Completed ${new Date(ev.completedAt).toLocaleString()}`}
      </p>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const FailoverView: React.FC = () => {
  const [failovers, setFailovers] = useState<FailoverEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { failovers: evs } = await failoverApi.list(30);
      setFailovers(evs);
    } catch { toast.error("Failed to load failover events"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const simulate = async (scenario: "onprem-crash" | "cloud-outage" | "latency-spike") => {
    setSimulating(scenario);
    try {
      const { failover } = await failoverApi.simulate(scenario);
      setFailovers((prev) => [failover, ...prev]);
      toast.success(`Failover drill started: ${scenario}`);
      // Poll for updates for 8s
      let i = 0;
      const interval = setInterval(async () => {
        i++;
        if (i > 8) { clearInterval(interval); return; }
        try {
          const { failover: updated } = await failoverApi.get(failover.failoverId);
          setFailovers((prev) => prev.map((e) => e.failoverId === updated.failoverId ? updated : e));
          if (["COMPLETED", "FAILED", "ROLLED_BACK"].includes(updated.state)) clearInterval(interval);
        } catch { clearInterval(interval); }
      }, 1000);
    } catch { toast.error("Simulation failed"); }
    finally { setSimulating(null); }
  };

  const live = failovers.filter((e) => !["COMPLETED", "FAILED", "ROLLED_BACK"].includes(e.state));
  const completed = failovers.filter((e) => ["COMPLETED", "FAILED", "ROLLED_BACK"].includes(e.state));
  const avgRto = completed.filter((e) => e.durationMs).reduce((s, e, _, a) => s + (e.durationMs ?? 0) / a.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Live Failovers",    value: live.length,                           icon: Activity,     color: live.length > 0 ? "text-red-400" : "text-white/40" },
          { label: "Total Events",      value: failovers.length,                      icon: ArrowRightLeft,color: "text-blue-400" },
          { label: "Avg RTO",           value: avgRto ? `${(avgRto / 1000).toFixed(0)}s` : "—", icon: Timer, color: "text-amber-400" },
          { label: "Success Rate",      value: completed.length ? `${Math.round(completed.filter((e) => e.state === "COMPLETED").length / completed.length * 100)}%` : "—", icon: CheckCircle2, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/8 bg-[#0B1220] p-4 flex items-center gap-3">
            <Icon className={cn("w-5 h-5 shrink-0", color)} />
            <div>
              <p className="text-xs text-white/40">{label}</p>
              <p className="text-lg font-bold text-white/90">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chaos drill buttons */}
      <div className="rounded-xl border border-white/8 bg-[#0B1220] p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Failure Simulation</h3>
          <Badge variant="secondary" className="text-[9px]">Autonomous Recovery</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { id: "onprem-crash",  label: "On-Prem Crash",  desc: "Simulate bare-metal node failure → cloud evacuation", color: "border-red-500/20 hover:border-red-500/40" },
            { id: "cloud-outage",  label: "Cloud Outage",   desc: "Simulate AWS region outage → on-prem fallback",       color: "border-amber-500/20 hover:border-amber-500/40" },
            { id: "latency-spike", label: "Latency Spike",  desc: "Simulate latency breach → closest region migration",  color: "border-blue-500/20 hover:border-blue-500/40" },
          ] as const).map(({ id, label, desc, color }) => (
            <button
              key={id}
              onClick={() => simulate(id)}
              disabled={simulating != null}
              className={cn(
                "text-left rounded-xl border bg-white/2 p-4 transition-all hover:bg-white/4",
                color, simulating === id && "opacity-60 pointer-events-none"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Play className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[11px] font-bold text-white/80">{label}</span>
                {simulating === id && <RefreshCw className="w-3 h-3 text-white/40 animate-spin ml-auto" />}
              </div>
              <p className="text-[10px] text-white/30">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Live failovers */}
      {live.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />Live Failovers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {live.map((ev) => <FailoverCard key={ev.failoverId} ev={ev} />)}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Failover History</h3>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 text-[10px]">
            <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && failovers.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-white/3 animate-pulse" />
              ))
            : completed.slice(0, 6).map((ev) => <FailoverCard key={ev.failoverId} ev={ev} />)
          }
        </div>
      </div>
    </div>
  );
};

export default FailoverView;
