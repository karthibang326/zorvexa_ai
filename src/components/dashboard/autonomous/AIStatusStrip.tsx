import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, Eye, ListTodo, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIStatusStripProps = {
  aiActive: boolean;
  streamOnline: boolean;
  servicesObserved: number;
  activeAnomalies: number;
  actionsPending: number;
  lastActionSecondsAgo: number | null;
};

export const AIStatusStrip: React.FC<AIStatusStripProps> = ({
  aiActive,
  streamOnline,
  servicesObserved,
  activeAnomalies,
  actionsPending,
  lastActionSecondsAgo,
}) => {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-[#0c1424] via-[#0a1628] to-[#0c1424] px-4 py-3.5 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(16,185,129,0.12),transparent_50%)]"
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <motion.span
            key={pulse}
            className="relative flex h-3 w-3"
            aria-hidden
          >
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                aiActive ? "animate-ping bg-emerald-400" : "bg-zinc-500"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3 w-3 rounded-full border border-white/20",
                aiActive ? "bg-emerald-400" : "bg-zinc-600"
              )}
            />
          </motion.span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Status</p>
            <p className="text-sm font-semibold text-emerald-100/95">
              {aiActive ? "🟢 AI Active" : "⚪ AI Standby"}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4 text-sky-300/90 shrink-0" />
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Observing</p>
            <p className="tabular-nums font-semibold text-white/90">{servicesObserved} services</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-amber-300/90 shrink-0" />
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Analyzing</p>
            <p className="tabular-nums font-semibold text-amber-100/95">
              {activeAnomalies} {activeAnomalies === 1 ? "anomaly" : "anomalies"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <ListTodo className="w-4 h-4 text-violet-300/90 shrink-0" />
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Actions pending</p>
            <p className="tabular-nums font-semibold text-violet-100/95">{actionsPending}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-cyan-300/90 shrink-0" />
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Last action</p>
            <p className="tabular-nums font-semibold text-cyan-100/95">
              {lastActionSecondsAgo != null ? `${lastActionSecondsAgo}s ago` : "—"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1">
          <Radio className={cn("w-3.5 h-3.5", streamOnline ? "text-emerald-400" : "text-amber-300")} />
          <span className="text-[11px] font-medium text-white/70">{streamOnline ? "Stream live" : "Reconnecting"}</span>
        </div>
      </div>
    </div>
  );
};
