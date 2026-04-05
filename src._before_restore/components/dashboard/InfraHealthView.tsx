import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Server, Cloud, Cpu, MemoryStick, Network, HardDrive,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity,
  Terminal, Layers, Zap, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { uialApi, agentsApi, telemetryApi } from "@/lib/hybrid";
import type { OnPremAgent, TelemetryAlert } from "@/lib/hybrid";
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

const STATUS_META: Record<OnPremAgent["status"], { icon: React.ElementType; color: string; label: string }> = {
  online:      { icon: CheckCircle2,  color: "text-emerald-400", label: "Online" },
  degraded:    { icon: AlertTriangle, color: "text-amber-400",   label: "Degraded" },
  offline:     { icon: XCircle,       color: "text-red-400",     label: "Offline" },
  unreachable: { icon: XCircle,       color: "text-red-500",     label: "Unreachable" },
};

function MiniBar({ value, warn = 75, crit = 90 }: { value: number; warn?: number; crit?: number }) {
  const color = value >= crit ? "bg-red-500" : value >= warn ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Cloud Provider Health Card ───────────────────────────────────────────────

function CloudHealthCard({ prov }: { prov: { provider: string; environment: string; displayName: string; healthy: boolean; message?: string; metrics?: Record<string, number> } }) {
  const meta = PROVIDER_META[prov.provider];
  const Icon = meta?.icon ?? Cloud;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-[#0B1220] p-4 flex flex-col gap-3",
        prov.healthy ? "border-white/8" : "border-red-500/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", meta?.color ?? "text-white/50")} />
          <span className="text-sm font-semibold text-white/80">{prov.displayName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {prov.healthy
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            : <XCircle className="w-3.5 h-3.5 text-red-400" />
          }
          <span className={cn("text-[10px] font-bold", prov.healthy ? "text-emerald-400" : "text-red-400")}>
            {prov.healthy ? "Healthy" : "Degraded"}
          </span>
        </div>
      </div>
      {prov.message && (
        <p className="text-[10px] text-white/35 leading-relaxed">{prov.message}</p>
      )}
      {prov.metrics && Object.keys(prov.metrics).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(prov.metrics).map(([k, v]) => (
            <div key={k} className="text-[10px] text-white/40">
              <span className="text-white/25">{k}: </span>
              <span className="font-bold text-white/60">{v}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── On-Prem Agent Card ───────────────────────────────────────────────────────

function AgentCard({ agent, onFail }: { agent: OnPremAgent; onFail: (id: string) => void }) {
  const { icon: StatusIcon, color, label } = STATUS_META[agent.status] ?? STATUS_META.offline;
  const provMeta = PROVIDER_META[agent.provider] ?? PROVIDER_META.baremetal;
  const ProvIcon = provMeta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "rounded-xl border bg-[#0B1220] p-4 flex flex-col gap-3",
        agent.status === "offline" ? "border-red-500/30" : agent.status === "degraded" ? "border-amber-500/30" : "border-white/8"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ProvIcon className={cn("w-3.5 h-3.5 shrink-0", provMeta.color)} />
          <span className="text-[11px] font-semibold text-white/80 truncate">{agent.hostname}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon className={cn("w-3 h-3", color)} />
          <span className={cn("text-[9px] font-bold", color)}>{label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/35">
        <span className="font-mono">{agent.ip}</span>
        <span>·</span>
        <span>{agent.datacenter}</span>
        <span>·</span>
        <span className="text-white/20">v{agent.version}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 text-white/35"><Cpu className="w-3 h-3" />CPU</div>
          <span className="text-white/60 font-bold">{agent.cpuPct}%</span>
        </div>
        <MiniBar value={agent.cpuPct} />
        <div className="flex items-center justify-between text-[10px] mt-1.5">
          <div className="flex items-center gap-1 text-white/35"><MemoryStick className="w-3 h-3" />Memory</div>
          <span className="text-white/60 font-bold">{agent.memoryPct}%</span>
        </div>
        <MiniBar value={agent.memoryPct} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-white/25">{agent.commandsExecuted} cmds run</span>
        {agent.status !== "offline" && (
          <button
            onClick={() => onFail(agent.agentId)}
            className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors"
            title="Simulate failure"
          >
            Simulate Failure
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const InfraHealthView: React.FC = () => {
  const [cloudHealth, setCloudHealth] = useState<any[]>([]);
  const [agents, setAgents] = useState<OnPremAgent[]>([]);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, agentsRes, alertsRes] = await Promise.all([
        uialApi.health(),
        agentsApi.list(),
        telemetryApi.alerts(10),
      ]);
      setCloudHealth(healthRes.providers);
      setAgents(agentsRes.agents);
      setAlerts(alertsRes.alerts);
    } catch {
      toast.error("Failed to load infra health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSimulateAgentFailure = async (agentId: string) => {
    try {
      await agentsApi.simulateFailure(agentId);
      toast.info(`Failure simulated for agent ${agentId}`);
      setTimeout(load, 600);
    } catch {
      toast.error("Simulation failed");
    }
  };

  const cloudProviders = cloudHealth.filter((p) => p.environment === "cloud");
  const onpremProviders = cloudHealth.filter((p) => p.environment === "onprem");
  const healthyAll = cloudHealth.filter((p) => p.healthy).length;
  const onlineAgents = agents.filter((a) => a.status === "online").length;
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Healthy Providers", value: `${healthyAll}/${cloudHealth.length}`, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Online Agents",     value: `${onlineAgents}/${agents.length}`,   icon: Terminal,    color: "text-blue-400" },
          { label: "Active Alerts",     value: alerts.length,                          icon: AlertTriangle,color: alerts.length > 0 ? "text-amber-400" : "text-white/40" },
          { label: "Critical Alerts",   value: criticalAlerts,                         icon: XCircle,     color: criticalAlerts > 0 ? "text-red-400" : "text-white/40" },
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

      {/* Refresh */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-8 text-xs border-white/10">
          <RefreshCw className={cn("w-3 h-3 mr-1.5", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      {/* Cloud provider health */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Cloud Providers</h3>
        </div>
        {loading && cloudProviders.length === 0
          ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-28 rounded-xl bg-white/3 animate-pulse"/>)}</div>
          : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cloudProviders.map((p) => <CloudHealthCard key={p.provider} prov={p} />)}
            </div>
        }
      </section>

      {/* On-prem provider health */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">On-Premise Infrastructure</h3>
        </div>
        {loading && onpremProviders.length === 0
          ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-28 rounded-xl bg-white/3 animate-pulse"/>)}</div>
          : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {onpremProviders.map((p) => <CloudHealthCard key={p.provider} prov={p} />)}
            </div>
        }
      </section>

      {/* On-prem agent grid */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">On-Premise Agents</h3>
          <Badge variant="secondary" className="text-[9px]">{agents.length} registered</Badge>
        </div>
        {loading && agents.length === 0
          ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-40 rounded-xl bg-white/3 animate-pulse"/>)}</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((a) => <AgentCard key={a.agentId} agent={a} onFail={handleSimulateAgentFailure} />)}
            </div>
        }
      </section>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Threshold Alerts</h3>
            <Badge variant="secondary" className="text-[9px]">{alerts.length}</Badge>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#0B1220] divide-y divide-white/5">
            {alerts.slice(0, 10).map((a) => (
              <div key={a.alertId} className="flex items-center gap-3 p-3">
                {a.severity === "critical"
                  ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                }
                <span className="text-[11px] text-white/70 flex-1 min-w-0 truncate">{a.message}</span>
                <span className="text-[9px] text-white/30 shrink-0">{PROVIDER_META[a.provider]?.label ?? a.provider}</span>
                <Badge variant="secondary" className={cn("text-[9px] shrink-0",
                  a.severity === "critical" ? "text-red-400" : "text-amber-400"
                )}>
                  {a.severity.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default InfraHealthView;
