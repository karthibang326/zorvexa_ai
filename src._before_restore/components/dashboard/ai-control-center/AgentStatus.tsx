import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Cpu, DollarSign, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { postOpsAnalyze } from "@/lib/ai-ops-learning";
import type { AgentLane } from "./types";

const ICONS: Record<string, React.ReactNode> = {
  SRE: <Cpu className="w-3.5 h-3.5 text-sky-400" />,
  COST: <DollarSign className="w-3.5 h-3.5 text-amber-400" />,
  SECURITY: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
};

export const AgentStatus: React.FC = () => {
  const [lanes, setLanes] = useState<AgentLane[]>([
    { id: "sre", name: "SRE Agent", role: "Saturation & SLO", status: "working", detail: "Analyzing CPU / latency…", confidence: 0.88 },
    { id: "cost", name: "Cost Agent", role: "Budget guardrails", status: "idle", detail: "Checking cost delta for scale paths", confidence: 0.76 },
    { id: "sec", name: "Security Agent", role: "Policy & abuse", status: "idle", detail: "Validating blast radius", confidence: 0.72 },
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const out = await postOpsAnalyze({ state: { cpu: 87, latency: 310, errorRate: 1.2, cost: 18 } });
        if (cancelled) return;
        const agents = (out as { agents?: Record<string, { reasoning?: string; confidence?: number; structured?: { risk?: string } }> }).agents;
        if (!agents) return;
        setLanes((prev) =>
          prev.map((lane) => {
            const key = (lane.id === "sre" ? "sre" : lane.id === "cost" ? "cost" : "security") as "sre" | "cost" | "security";
            const a = agents[key];
            if (!a) return lane;
            return {
              ...lane,
              status: "working",
              detail: a.reasoning ?? lane.detail,
              confidence: typeof a.confidence === "number" ? a.confidence : lane.confidence,
            };
          })
        );
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-violet-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Agents</span>
      </div>
      <div className="space-y-2">
        {lanes.map((lane, i) => (
          <motion.div
            key={lane.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 flex gap-3"
          >
            <div className="mt-0.5">{ICONS[lane.name.split(" ")[0] ?? "SRE"] ?? <Cpu className="w-3.5 h-3.5" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-white truncate">{lane.name}</p>
                <span
                  className={cn(
                    "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                    lane.status === "working" && "border-sky-500/30 text-sky-300 bg-sky-500/10",
                    lane.status === "idle" && "border-white/10 text-white/40",
                    lane.status === "blocked" && "border-red-500/30 text-red-300"
                  )}
                >
                  {lane.status}
                </span>
              </div>
              <p className="text-[10px] text-white/40 mt-0.5">{lane.role}</p>
              <p className="text-[12px] text-white/65 mt-1 line-clamp-2">{lane.detail}</p>
              {lane.confidence != null && (
                <p className="text-[10px] text-emerald-400/90 mt-1 tabular-nums">Confidence {(lane.confidence * 100).toFixed(0)}%</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
