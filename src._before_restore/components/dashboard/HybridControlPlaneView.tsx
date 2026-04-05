import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud, Server, Activity, Zap, ShieldCheck, DollarSign,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft,
  Cpu, MemoryStick, Network, HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { uialApi, hybridBrainApi, telemetryApi } from "@/lib/hybrid";
import type { InfraSnapshot, TelemetryAggregate, TelemetryAlert } from "@/lib/hybrid";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { label: string; color: string; badge: string }> = {
  aws:         { label: "AWS",          color: "from-orange-500/20 to-orange-600/10", badge: "bg-orange-500/15 text-orange-300 border-orange-500/20" },
  azure:       { label: "Azure",        color: "from-blue-500/20 to-blue-600/10",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  gcp:         { label: "GCP",          color: "from-green-500/20 to-green-600/10",  badge: "bg-green-500/15 text-green-300 border-green-500/20" },
  baremetal:   { label: "Bare Metal",   color: "from-slate-500/20 to-slate-600/10",  badge: "bg-slate-500/15 text-slate-300 border-slate-500/20" },
  vmware:      { label: "VMware",       color: "from-indigo-500/20 to-indigo-600/10",badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20" },
  "k8s-onprem":{ label: "K8s On-Prem", color: "from-purple-500/20 to-purple-600/10",badge: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
};

function HealthDot({ healthy }: { healthy: boolean }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full", healthy ? "bg-emerald-400" : "bg-red-400")} />
  );
}

function GaugeBar({ value, max = 100, color = "bg-blue-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = value > 85 ? "bg-red-500" : value > 70 ? "bg-amber-500" : color;
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", barColor)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({ snap, telemetry }: { snap: InfraSnapshot; telemetry?: ReturnType<typeof telemetryApi.collect> extends Promise<infer T> ? T : never }) {
  const meta = PROVIDER_META[snap.provider] ?? { label: snap.provider, color: "from-white/10 to-white/5", badge: "bg-white/10 text-white/60 border-white/10" };
  const isCloud = snap.environment === "cloud";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border border-white/8 bg-gradient-to-br p-5 flex flex-col gap-3",
        meta.color,
        !snap.healthy && "border-red-500/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isCloud ? <Cloud className="w-4 h-4 text-white/60" /> : <Server className="w-4 h-4 text-white/60" />}
          <span className="text-sm font-semibold text-white/90">{meta.label}</span>
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", meta.badge)}>
            {isCloud ? "CLOUD" : "ON-PREM"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <HealthDot healthy={snap.healthy} />
          <span className={cn("text-[10px] font-medium", snap.healthy ? "text-emerald-400" : "text-red-400")}>
            {snap.healthy ? "Healthy" : "Degraded"}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Cpu,        label: "CPU",     value: snap.cpu,     unit: "%",    color: "bg-blue-500" },
          { icon: MemoryStick,label: "Memory",  value: snap.memory,  unit: "%",    color: "bg-violet-500" },
          { icon: Network,    label: "Latency", value: snap.latency, unit: "ms",   color: "bg-cyan-500" },
          { icon: DollarSign, label: "Cost",    value: snap.cost,    unit: "/hr",  color: "bg-emerald-500" },
        ].map(({ icon: Icon, label, value, unit, color }) => (
          <div key={label} className="bg-black/20 rounded-xl p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-white/40" />
                <span className="text-[10px] text-white/40">{label}</span>
              </div>
              <span className="text-[11px] font-bold text-white/80">
                {label === "Cost" ? `$${value}` : value}{unit !== "/hr" ? unit : ""}
                {label === "Cost" && <span className="text-white/30 text-[9px]">/hr</span>}
              </span>
            </div>
            {(label === "CPU" || label === "Memory") && (
              <GaugeBar value={value} color={color} />
            )}
          </div>
        ))}
      </div>

      {/* On-prem agent count or cloud cost */}
      {!isCloud && snap.onlineAgents != null && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <Activity className="w-3 h-3" />
          <span>{snap.onlineAgents} agents online</span>
        </div>
      )}
      {isCloud && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <DollarSign className="w-3 h-3" />
          <span>~${Math.round(snap.cost * 730).toLocaleString()} / month</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: TelemetryAlert }) {
  const icons = { info: Activity, warning: AlertTriangle, critical: XCircle };
  const colors = { info: "text-blue-400", warning: "text-amber-400", critical: "text-red-400" };
  const Icon = icons[alert.severity];
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", colors[alert.severity])} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/80 truncate">{alert.message}</p>
        <p className="text-[9px] text-white/30 mt-0.5">
          {PROVIDER_META[alert.provider]?.label ?? alert.provider} · {new Date(alert.firedAt).toLocaleTimeString()}
        </p>
      </div>
      <Badge variant="secondary" className={cn("text-[9px] shrink-0", colors[alert.severity])}>
        {alert.severity.toUpperCase()}
      </Badge>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const HybridControlPlaneView: React.FC = () => {
  const [snapshots, setSnapshots] = useState<InfraSnapshot[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryAggregate | null>(null);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "cloud" | "onprem">("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [snap, tel, alts] = await Promise.all([
        hybridBrainApi.snapshot(),
        telemetryApi.collect(),
        telemetryApi.alerts(10),
      ]);
      setSnapshots(snap.snapshots);
      setTelemetry(tel);
      setAlerts(alts.alerts);
      setLastRefresh(new Date());
    } catch {
      toast.error("Failed to load hybrid infra data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // auto-refresh every 30 s
  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = snapshots.filter((s) => filter === "all" || s.environment === filter);
  const cloudSnaps = snapshots.filter((s) => s.environment === "cloud");
  const onpremSnaps = snapshots.filter((s) => s.environment === "onprem");
  const totalCost = cloudSnaps.reduce((s, n) => s + n.cost, 0);
  const healthyCount = snapshots.filter((s) => s.healthy).length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cloud Providers",  value: cloudSnaps.length,   icon: Cloud,         color: "text-blue-400" },
          { label: "On-Prem Providers",value: onpremSnaps.length,  icon: Server,        color: "text-purple-400" },
          { label: "Healthy",          value: `${healthyCount}/${snapshots.length}`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Cloud Cost/hr",    value: `$${totalCost.toFixed(0)}`, icon: DollarSign, color: "text-amber-400" },
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

      {/* Telemetry aggregate */}
      {telemetry && (
        <div className="rounded-xl border border-white/8 bg-[#0B1220] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Unified Telemetry</h3>
            <span className="text-[10px] text-white/25">
              {lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString()}` : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg CPU",      value: `${telemetry.avgCpu}%`,        bar: telemetry.avgCpu },
              { label: "Avg Memory",   value: `${telemetry.avgMemory}%`,     bar: telemetry.avgMemory },
              { label: "Avg Latency",  value: `${telemetry.avgLatency}ms`,   bar: null },
              { label: "Error Rate",   value: `${telemetry.avgErrorRate}%`,  bar: null },
            ].map(({ label, value, bar }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40">{label}</span>
                  <span className="text-xs font-bold text-white/80">{value}</span>
                </div>
                {bar != null && <GaugeBar value={bar} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs + provider grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-[#0B1220] rounded-xl p-1 border border-white/8">
            {(["all", "cloud", "onprem"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  filter === f
                    ? "bg-primary/20 text-primary"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {f === "all" ? "All" : f === "cloud" ? "Cloud" : "On-Prem"}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="h-8 text-xs border-white/10"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <AnimatePresence mode="popLayout">
          {loading && snapshots.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/3 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((snap) => (
                <ProviderCard key={snap.provider} snap={snap} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#0B1220] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Active Alerts</h3>
            <Badge variant="secondary" className="text-[9px]">{alerts.length}</Badge>
          </div>
          <div>
            {alerts.slice(0, 8).map((a) => <AlertRow key={a.alertId} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default HybridControlPlaneView;
