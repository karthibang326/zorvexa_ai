import React, { useEffect, useState } from "react";
import { Brain, TrendingUp } from "lucide-react";
import { getOpsMemory } from "@/lib/ai-ops-learning";
import { getIncidentHistory } from "@/lib/sre";

export const MemoryPanel: React.FC = () => {
  const [mem, setMem] = useState<{ count: number; avgReward: number } | null>(null);
  const [incidents, setIncidents] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const [m, h] = await Promise.all([getOpsMemory(40), getIncidentHistory(50)]);
        setMem(m.stats);
        setIncidents(h.items.length);
      } catch {
        setMem(null);
      }
    })();
  }, []);

  const successApprox = mem && mem.count > 0 ? Math.min(99, 70 + mem.avgReward * 100) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-fuchsia-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Memory</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] py-3">
          <p className="text-[9px] uppercase text-white/40">Past incidents</p>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{incidents}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] py-3">
          <p className="text-[9px] uppercase text-white/40">Learned actions</p>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{mem?.count ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] py-3">
          <p className="text-[9px] uppercase text-white/40 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Success proxy
          </p>
          <p className="text-xl font-bold text-emerald-400/90 mt-1 tabular-nums">
            {successApprox != null ? `${successApprox.toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-white/35 mt-3 leading-relaxed">
        Reward signal from closed-loop experiences; correlates with preferred actions over time.
      </p>
    </div>
  );
};
