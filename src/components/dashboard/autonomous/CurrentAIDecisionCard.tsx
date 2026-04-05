import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Cpu, Gauge, Shield, Sparkles, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiDecisionSource } from "@/lib/ai-dashboard-status";
import type { AutonomyMode } from "@/lib/launch";
import { cn } from "@/lib/utils";

export type CurrentAIDecisionCardProps = {
  source?: AiDecisionSource | null;
  issue?: string | null;
  action?: string | null;
  reason?: string | null;
  confidence?: number | null;
  result?: string | null;
  resource?: string | null;
  riskLevel?: "LOW" | "MED" | "HIGH";
  latencyImpactPct?: number | null;
  costImpactPct?: number | null;
  autonomyMode?: AutonomyMode | null;
  pendingApprovalId?: string | null;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void;
  approving?: boolean;
  nextEvalSeconds?: number | null;
  monitoringLine?: string;
};

function humanize(value?: string | null): string {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function confPct(c?: number | null) {
  if (c == null || Number.isNaN(c)) return null;
  return Math.round(c > 1 ? c : c * 100);
}

const RISK_BADGE: Record<"LOW" | "MED" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
  MED: "bg-amber-500/15 text-amber-100 border-amber-400/30",
  HIGH: "bg-rose-500/15 text-rose-100 border-rose-400/30",
};

export const CurrentAIDecisionCard: React.FC<CurrentAIDecisionCardProps> = ({
  source,
  issue,
  action,
  reason,
  confidence,
  result,
  resource,
  riskLevel = "MED",
  latencyImpactPct,
  costImpactPct,
  autonomyMode,
  pendingApprovalId,
  onApprove,
  onReject,
  approving,
  nextEvalSeconds,
  monitoringLine = "AI actively monitoring your infrastructure",
}) => {
  const hasDecision = Boolean(issue || action || confidence != null || result);
  const c = confPct(confidence);
  const assisted = autonomyMode === "assisted" && pendingApprovalId;

  const impactRows = useMemo(() => {
    const lat = latencyImpactPct ?? (issue?.toLowerCase().includes("latency") ? -12 : -8);
    const cost = costImpactPct ?? (issue?.toLowerCase().includes("cost") ? -5 : -3);
    return [
      {
        label: "Latency change",
        value: `${lat > 0 ? "+" : ""}${lat}%`,
        good: lat <= 0,
      },
      {
        label: "Cost impact",
        value: `${cost > 0 ? "+" : ""}${cost}%`,
        good: cost <= 0,
      },
    ];
  }, [issue, latencyImpactPct, costImpactPct]);

  return (
    <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#0f1424] to-[#0a0f1c] backdrop-blur-xl shadow-[0_16px_48px_rgba(79,70,229,0.12)] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-violet-300 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Current AI decision</p>
          {source ? (
            <Badge variant="outline" className="text-[9px] border-white/12 text-white/45 uppercase">
              {source === "ops" ? "Ops loop" : "Kubernetes AI"}
            </Badge>
          ) : null}
        </div>
        {resource ? (
          <Badge variant="outline" className="text-[10px] border-white/15 text-white/50 truncate max-w-[200px]">
            {resource}
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 border-b border-white/[0.05] bg-black/20">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm text-white/80 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300/90 shrink-0" />
            {monitoringLine}
          </p>
          {nextEvalSeconds != null ? (
            <motion.span
              className="text-[12px] tabular-nums text-cyan-200/85 font-medium"
              key={nextEvalSeconds}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
            >
              Next evaluation in {nextEvalSeconds}s
            </motion.span>
          ) : null}
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1 flex-1 max-w-[40px] rounded-full bg-cyan-400/40"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {!hasDecision ? (
        <p className="px-4 py-6 text-sm text-white/50 text-center leading-relaxed">
          Models are online — synthetic workload signals will appear when the ops loop or cluster stream emits telemetry.
        </p>
      ) : (
        <dl className="grid gap-0 divide-y divide-white/[0.06]">
          <div className="px-4 py-3.5 grid grid-cols-[100px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Target className="w-3.5 h-3.5 opacity-70" />
              Action
            </dt>
            <dd className="text-[14px] text-violet-100 font-medium leading-snug">{humanize(action)}</dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[100px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Cpu className="w-3.5 h-3.5 opacity-70" />
              Reason
            </dt>
            <dd className="text-[13px] text-white/85 leading-snug">{humanize(reason || issue)}</dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[100px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Shield className="w-3.5 h-3.5 opacity-70" />
              Confidence
            </dt>
            <dd className="text-[13px] text-cyan-200/90 tabular-nums">{c != null ? `${c}%` : "—"}</dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[100px_1fr] gap-3 items-start">
            <dt className="text-[11px] text-white/40 pt-0.5">Risk level</dt>
            <dd>
              <Badge className={cn("text-[11px] border", RISK_BADGE[riskLevel])}>{riskLevel}</Badge>
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Impact</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {impactRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] text-white/45 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 opacity-60" />
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums flex items-center gap-1",
                      row.good ? "text-emerald-300" : "text-amber-200"
                    )}
                  >
                    {row.good ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[100px_1fr] gap-3 items-start">
            <dt className="text-[11px] text-white/40">Outcome</dt>
            <dd className="text-[13px] text-emerald-200/85">{humanize(result)}</dd>
          </div>
        </dl>
      )}

      {assisted && pendingApprovalId ? (
        <div className="px-4 py-3 border-t border-white/[0.06] flex flex-wrap gap-2 bg-amber-950/20">
          <p className="text-[11px] text-amber-100/90 w-full">Assisted mode — confirm execution for high-impact change.</p>
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={approving}
            onClick={() => void onApprove?.()}
          >
            {approving ? "Approving…" : "Approve"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-white/20" disabled={approving} onClick={() => onReject?.()}>
            Reject
          </Button>
        </div>
      ) : null}
    </section>
  );
};
