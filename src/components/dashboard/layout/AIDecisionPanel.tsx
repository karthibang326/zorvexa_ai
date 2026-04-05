import React from "react";
import { Badge } from "@/components/ui/badge";
import { Cpu, GitBranch, ShieldCheck, Target, Zap } from "lucide-react";
import type { AiDecisionSource } from "@/lib/ai-dashboard-status";

export type AIDecisionPanelProps = {
  /** Which subsystem produced this row — ops loop vs Kubernetes AI. */
  source?: AiDecisionSource | null;
  issue?: string | null;
  action?: string | null;
  confidence?: number | null;
  result?: string | null;
  resource?: string | null;
};

const SOURCE_COPY: Record<AiDecisionSource, string> = {
  ops: "Ops loop",
  k8s: "Kubernetes AI",
};

function humanize(value?: string | null): string {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

const AIDecisionPanel: React.FC<AIDecisionPanelProps> = ({
  source,
  issue,
  action,
  confidence,
  result,
  resource,
}) => {
  const hasAny = issue || action || confidence != null || result;
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_12px_40px_rgba(2,8,23,0.35)] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Zap className="w-4 h-4 text-violet-300 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Latest AI decision</p>
          {source ? (
            <Badge variant="outline" className="text-[9px] border-white/12 text-white/45 font-normal uppercase tracking-wider">
              {SOURCE_COPY[source]}
            </Badge>
          ) : null}
        </div>
        {resource ? (
          <Badge variant="outline" className="text-[10px] border-white/15 text-white/50 font-normal truncate max-w-[140px]">
            {resource}
          </Badge>
        ) : null}
      </div>
      {!hasAny ? (
        <div className="px-4 py-7 text-center space-y-3">
          <p className="text-sm text-white/80">AI actively monitoring your infrastructure</p>
          <p className="text-xs text-white/45">Telemetry will populate on the next evaluation cycle.</p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400/50 animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <dl className="grid gap-0 divide-y divide-white/[0.06]">
          <div className="px-4 py-3.5 grid grid-cols-[96px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Cpu className="w-3.5 h-3.5 opacity-70" />
              Issue
            </dt>
            <dd className="text-[13px] text-white/88 leading-snug break-words">{humanize(issue)}</dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[96px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Target className="w-3.5 h-3.5 opacity-70" />
              Action
            </dt>
            <dd className="text-[13px] text-violet-200/95 font-medium break-words">{humanize(action)}</dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[96px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
              Confidence
            </dt>
            <dd className="text-[13px] text-cyan-200/90">
              {typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "—"}
            </dd>
          </div>
          <div className="px-4 py-3.5 grid grid-cols-[96px_1fr] gap-3 items-start">
            <dt className="flex items-center gap-1.5 text-[11px] text-white/40">
              <GitBranch className="w-3.5 h-3.5 opacity-70" />
              Result
            </dt>
            <dd className="text-[13px] text-emerald-200/85 break-words">{humanize(result)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
};

export default AIDecisionPanel;
