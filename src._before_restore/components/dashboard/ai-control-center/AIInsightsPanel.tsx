import React from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Gauge, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightModel = {
  title: string;
  rootCause: string;
  impact: string;
  confidence: number;
  riskLabel?: string;
};

type Props = {
  insight: InsightModel;
};

export const AIInsightsPanel: React.FC<Props> = ({ insight }) => {
  const risk = insight.confidence >= 0.8 ? "high signal" : insight.confidence >= 0.55 ? "elevated" : "exploratory";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c1220]/95 to-[#070a12]/95 backdrop-blur-xl p-4 h-full flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-sky-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Live insight</span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug">{insight.title}</p>
      <div className="mt-4 space-y-3 flex-1">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Root cause
          </p>
          <p className="text-[13px] text-white/75 leading-relaxed">{insight.rootCause}</p>
        </div>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-200/70 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Impact
          </p>
          <p className="text-[13px] text-amber-100/90">{insight.impact}</p>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
            Confidence
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400")}
                style={{ width: `${Math.min(100, insight.confidence * 100)}%` }}
              />
            </div>
            <span className="text-[12px] tabular-nums text-white/85 font-mono">{(insight.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <p className="text-[10px] text-white/35">
          Risk posture: <span className="text-white/60">{insight.riskLabel ?? risk}</span>
        </p>
      </div>
    </motion.div>
  );
};
