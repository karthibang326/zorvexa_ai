import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Clock, DollarSign, ShieldCheck } from "lucide-react";

type Kpi = { icon: React.ReactNode; label: string; value: string; sub?: string };

function useAnimatedNumber(target: number) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    const start = performance.now();
    const dur = 700;
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return display;
}

export type AutonomousKpiStripProps = {
  costSavedUsd: number;
  incidentsResolved: number;
  aiActionsExecuted: number;
  mttrImprovePct: number;
};

export const AutonomousKpiStrip: React.FC<AutonomousKpiStripProps> = ({
  costSavedUsd,
  incidentsResolved,
  aiActionsExecuted,
  mttrImprovePct,
}) => {
  const c = useAnimatedNumber(Math.round(costSavedUsd));
  const i = useAnimatedNumber(incidentsResolved);
  const a = useAnimatedNumber(aiActionsExecuted);
  const m = useAnimatedNumber(Math.round(mttrImprovePct));

  const items: Kpi[] = [
    {
      icon: <DollarSign className="w-4 h-4 text-emerald-300/90" />,
      label: "Cost saved today",
      value: `$${c.toLocaleString()}`,
      sub: "FinOps + autoscaler",
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-sky-300/90" />,
      label: "Incidents auto-resolved",
      value: `${i}`,
      sub: "Last 24h window",
    },
    {
      icon: <Bot className="w-4 h-4 text-violet-300/90" />,
      label: "AI actions executed",
      value: `${a}`,
      sub: "Control plane",
    },
    {
      icon: <Clock className="w-4 h-4 text-amber-300/90" />,
      label: "MTTR improvement",
      value: `${m}%`,
      sub: "vs baseline",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((k) => (
        <motion.div
          key={k.label}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 shadow-inner"
        >
          <div className="flex items-center gap-2 mb-1.5">
            {k.icon}
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{k.label}</p>
          </div>
          <p className="text-xl font-semibold tabular-nums text-white/95 tracking-tight">{k.value}</p>
          {k.sub ? <p className="text-[10px] text-white/35 mt-0.5">{k.sub}</p> : null}
        </motion.div>
      ))}
    </div>
  );
};
