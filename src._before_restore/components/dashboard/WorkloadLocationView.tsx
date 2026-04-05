import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud, Server, Brain, ArrowRight, Sparkles, RefreshCw,
  ShieldCheck, DollarSign, Zap, Package, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hybridBrainApi } from "@/lib/hybrid";
import type { WorkloadMigration, PlacementDecision, WorkloadProfile } from "@/lib/hybrid";
import { toast } from "sonner";

// ─── Static workload catalogue (matches backend seed profiles) ────────────────

const WORKLOADS: WorkloadProfile[] = [
  { id: "wl-payments",       name: "Payments API",         dataLocality: "onprem-only",      compliance: ["PCI-DSS"],         latencySensitive: true,  burstable: false, cpuRequest: 4,  memoryRequest: 8,  priorityClass: "critical" },
  { id: "wl-analytics",      name: "Analytics Pipeline",   dataLocality: "cloud-ok",         compliance: [],                  latencySensitive: false, burstable: true,  cpuRequest: 8,  memoryRequest: 16, priorityClass: "normal" },
  { id: "wl-ehr",            name: "EHR Service",          dataLocality: "onprem-only",      compliance: ["HIPAA", "SOC2"],   latencySensitive: true,  burstable: false, cpuRequest: 2,  memoryRequest: 4,  priorityClass: "critical" },
  { id: "wl-api-gateway",    name: "API Gateway",          dataLocality: "cloud-ok",         compliance: [],                  latencySensitive: true,  burstable: true,  cpuRequest: 2,  memoryRequest: 4,  priorityClass: "high" },
  { id: "wl-ml-training",    name: "ML Training Jobs",     dataLocality: "cloud-ok",         compliance: [],                  latencySensitive: false, burstable: true,  cpuRequest: 32, memoryRequest: 64, priorityClass: "low" },
  { id: "wl-compliance-db",  name: "Compliance DB",        dataLocality: "onprem-only",      compliance: ["GDPR", "PCI-DSS"], latencySensitive: false, burstable: false, cpuRequest: 8,  memoryRequest: 32, priorityClass: "critical" },
];

const PROVIDER_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  aws:         { label: "AWS",          icon: Cloud,  color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/20" },
  azure:       { label: "Azure",        icon: Cloud,  color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20" },
  gcp:         { label: "GCP",          icon: Cloud,  color: "text-green-300",  bg: "bg-green-500/10 border-green-500/20" },
  baremetal:   { label: "Bare Metal",   icon: Server, color: "text-slate-300",  bg: "bg-slate-500/10 border-slate-500/20" },
  vmware:      { label: "VMware",       icon: Server, color: "text-indigo-300", bg: "bg-indigo-500/10 border-indigo-500/20" },
  "k8s-onprem":{ label: "K8s On-Prem", icon: Server, color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-500/20 bg-red-500/10",
  high:     "text-amber-400 border-amber-500/20 bg-amber-500/10",
  normal:   "text-blue-400 border-blue-500/20 bg-blue-500/10",
  low:      "text-white/40 border-white/10 bg-white/5",
};

// ─── Workload Card ────────────────────────────────────────────────────────────

function WorkloadCard({
  wl,
  decision,
  onDecide,
  deciding,
}: {
  wl: WorkloadProfile;
  decision: PlacementDecision | null;
  onDecide: (wl: WorkloadProfile) => void;
  deciding: boolean;
}) {
  const prov = decision ? PROVIDER_META[decision.targetProvider] : null;
  const ProvIcon = prov?.icon ?? Package;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-[#0B1220] p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Package className="w-4 h-4 text-white/40 shrink-0" />
          <span className="text-sm font-semibold text-white/90 truncate">{wl.name}</span>
        </div>
        <Badge className={cn("text-[9px] font-black shrink-0", PRIORITY_COLOR[wl.priorityClass])}>
          {wl.priorityClass.toUpperCase()}
        </Badge>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {wl.compliance.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/20">
            <ShieldCheck className="w-2.5 h-2.5" />{c}
          </span>
        ))}
        {wl.latencySensitive && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
            <Zap className="w-2.5 h-2.5" />Latency SLO
          </span>
        )}
        {wl.burstable && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-violet-500/10 text-violet-300 border-violet-500/20">
            <Sparkles className="w-2.5 h-2.5" />Burstable
          </span>
        )}
        {wl.dataLocality === "onprem-only" && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/10 text-red-300 border-red-500/20">
            <Server className="w-2.5 h-2.5" />On-Prem Only
          </span>
        )}
      </div>

      {/* CPU / Memory request */}
      <div className="flex gap-3 text-[10px] text-white/40">
        <span>{wl.cpuRequest} vCPU</span>
        <span>·</span>
        <span>{wl.memoryRequest} GB RAM</span>
      </div>

      {/* AI decision result */}
      {decision ? (
        <div className={cn("rounded-xl border p-3 flex flex-col gap-2", prov?.bg)}>
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">AI Placement</span>
            <span className={cn("ml-auto text-[10px] font-black", prov?.color)}>{Math.round(decision.confidence * 100)}% confidence</span>
          </div>
          <div className="flex items-center gap-2">
            <ProvIcon className={cn("w-4 h-4", prov?.color)} />
            <span className={cn("text-sm font-bold", prov?.color)}>{prov?.label}</span>
            <ArrowRight className="w-3 h-3 text-white/20 ml-auto" />
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold", prov?.bg, prov?.color)}>
              {decision.targetEnvironment.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {decision.reasons.slice(0, 3).map((r) => (
              <span key={r} className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{r}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/40 mt-1">
            {decision.estimatedMonthlyCostUsd > 0 && (
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${decision.estimatedMonthlyCostUsd}/mo</span>
            )}
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{decision.estimatedLatencyMs}ms</span>
            {decision.complianceSatisfied
              ? <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Compliant</span>
              : <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Non-compliant</span>
            }
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => onDecide(wl)}
          disabled={deciding}
          className="w-full h-8 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
        >
          {deciding ? (
            <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Deciding…</>
          ) : (
            <><Brain className="w-3 h-3 mr-1.5" />AI Decide Placement</>
          )}
        </Button>
      )}
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const WorkloadLocationView: React.FC = () => {
  const [decisions, setDecisions] = useState<Record<string, PlacementDecision>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [migrations, setMigrations] = useState<WorkloadMigration[]>([]);
  const [loadingMigs, setLoadingMigs] = useState(true);

  const loadMigrations = useCallback(async () => {
    setLoadingMigs(true);
    try {
      const { migrations: m } = await hybridBrainApi.migrations(20);
      setMigrations(m);
    } catch { /* silent */ }
    finally { setLoadingMigs(false); }
  }, []);

  useEffect(() => { void loadMigrations(); }, [loadMigrations]);

  const decideAll = async () => {
    for (const wl of WORKLOADS) {
      await handleDecide(wl);
    }
  };

  const handleDecide = async (wl: WorkloadProfile) => {
    setDeciding(wl.id);
    try {
      const { decision } = await hybridBrainApi.decide(wl);
      setDecisions((prev) => ({ ...prev, [wl.id]: decision }));
      toast.success(`${wl.name} → ${PROVIDER_META[decision.targetProvider]?.label ?? decision.targetProvider}`);
    } catch {
      toast.error(`Failed to decide placement for ${wl.name}`);
    } finally {
      setDeciding(null);
    }
  };

  const PHASE_COLOR: Record<string, string> = {
    COMPLETED:   "text-emerald-400",
    PLANNED:     "text-white/40",
    DRAINING:    "text-amber-400",
    DEPLOYING:   "text-blue-400",
    VERIFYING:   "text-cyan-400",
    ROLLED_BACK: "text-orange-400",
    FAILED:      "text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white/80">Workload Placement Intelligence</h2>
          <p className="text-[11px] text-white/35 mt-0.5">AI decides the optimal provider for each workload in real time</p>
        </div>
        <Button size="sm" onClick={decideAll} disabled={deciding != null} className="h-8 text-xs">
          <Brain className="w-3 h-3 mr-1.5" />Decide All
        </Button>
      </div>

      {/* Workload grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {WORKLOADS.map((wl) => (
          <WorkloadCard
            key={wl.id}
            wl={wl}
            decision={decisions[wl.id] ?? null}
            onDecide={handleDecide}
            deciding={deciding === wl.id}
          />
        ))}
      </div>

      {/* Migration history */}
      <div className="rounded-xl border border-white/8 bg-[#0B1220] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-white/40" />
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Migration History</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={loadMigrations} disabled={loadingMigs} className="h-7 text-[10px]">
            <RefreshCw className={cn("w-3 h-3 mr-1", loadingMigs && "animate-spin")} />Refresh
          </Button>
        </div>
        <div className="space-y-2">
          {migrations.slice(0, 8).map((m) => (
            <div key={m.migrationId} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 min-w-0">
                <span className={cn("font-bold", PROVIDER_META[m.fromProvider]?.color ?? "text-white/50")}>
                  {PROVIDER_META[m.fromProvider]?.label ?? m.fromProvider}
                </span>
                <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
                <span className={cn("font-bold", PROVIDER_META[m.toProvider]?.color ?? "text-white/50")}>
                  {PROVIDER_META[m.toProvider]?.label ?? m.toProvider}
                </span>
              </div>
              <span className="text-[9px] text-white/25 flex-1 truncate">{m.reason}</span>
              <span className={cn("text-[10px] font-bold shrink-0", PHASE_COLOR[m.phase] ?? "text-white/40")}>
                {m.phase}
              </span>
              {m.durationMs && (
                <span className="text-[9px] text-white/25 shrink-0">{(m.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          ))}
          {migrations.length === 0 && !loadingMigs && (
            <p className="text-xs text-white/25 text-center py-4">No migrations yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkloadLocationView;
