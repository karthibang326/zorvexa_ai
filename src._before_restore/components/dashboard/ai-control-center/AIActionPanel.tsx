import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, Boxes, RotateCcw, Scale, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { postOpsExecute, postOpsAnalyze } from "@/lib/ai-ops-learning";
import { getDeploymentHistory, postRollbackDeploy } from "@/lib/workflows";
import type { SafetyMode } from "./types";

type ActionDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  impact: string;
  risk: "low" | "medium" | "high";
  confidence: number;
  run: (mode: SafetyMode) => Promise<void>;
};

const riskStyle: Record<string, string> = {
  low: "text-emerald-400 border-emerald-500/25 bg-emerald-500/5",
  medium: "text-amber-300 border-amber-500/25 bg-amber-500/5",
  high: "text-red-300 border-red-500/25 bg-red-500/5",
};

type Props = {
  safetyMode: SafetyMode;
  resource?: string;
};

export const AIActionPanel: React.FC<Props> = ({ safetyMode, resource = "api-gateway" }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const baseState = { cpu: 87, latency: 320, errorRate: 1.4, cost: 18 };

  const actions: ActionDef[] = [
    {
      id: "scale",
      label: "Scale service",
      icon: <Scale className="w-4 h-4" />,
      impact: "+capacity, +cost ~8–12%",
      risk: "medium",
      confidence: 0.86,
      run: async (mode) => {
        if (mode === "suggest_only") {
          const a = await postOpsAnalyze({ state: baseState, manualApproval: true });
          toast.message("Suggestion only", { description: String(a.decision ?? a) });
          return;
        }
        const manual = mode === "approval_required";
        const out = await postOpsExecute({
          state: baseState,
          action: "scale_replicas",
          resource,
          namespace: "prod",
          provider: "aws",
          manualApproval: manual,
        });
        toast.success(String(out.status ?? "ok"));
      },
    },
    {
      id: "restart",
      label: "Restart pods",
      icon: <Boxes className="w-4 h-4" />,
      impact: "Brief disruption on targeted pods",
      risk: "medium",
      confidence: 0.74,
      run: async (mode) => {
        if (mode === "suggest_only") {
          toast.info("Suggest only — restart would be staged via job");
          return;
        }
        const out = await postOpsExecute({
          state: baseState,
          action: "observe",
          resource,
          namespace: "prod",
          manualApproval: mode === "approval_required",
        });
        toast.success(String(out.status ?? "queued observe"));
      },
    },
    {
      id: "rollback",
      label: "Rollback deployment",
      icon: <RotateCcw className="w-4 h-4" />,
      impact: "Revert to last healthy revision",
      risk: "high",
      confidence: 0.81,
      run: async (mode) => {
        if (mode === "suggest_only") {
          toast.info("Suggest only — rollback plan prepared");
          return;
        }
        const items = await getDeploymentHistory();
        const target = items[0];
        if (!target) {
          toast.error("No deployment in history to rollback");
          return;
        }
        await postRollbackDeploy(target.id);
        toast.success("Rollback triggered");
      },
    },
    {
      id: "cost",
      label: "Optimize cost",
      icon: <ArrowDownToLine className="w-4 h-4" />,
      impact: "Rightsizing / defer scale",
      risk: "low",
      confidence: 0.77,
      run: async (mode) => {
        const a = await postOpsAnalyze({ state: { ...baseState, cost: 28 }, manualApproval: mode !== "auto_execute" });
        toast.message("Cost path", { description: String((a as { learningInsight?: string }).learningInsight ?? a.decision ?? "") });
      },
    },
  ];

  const onAction = async (a: ActionDef) => {
    setBusy(a.id);
    try {
      await a.run(safetyMode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400/90" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Actions</span>
      </div>
      <p className="text-[11px] text-white/40 mb-4">Each action shows impact · risk · confidence. Honors safety mode.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((a) => (
          <motion.button
            key={a.id}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={busy !== null}
            onClick={() => void onAction(a)}
            className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-violet-300">{a.icon}</span>
              <span className="text-sm font-medium text-white">{a.label}</span>
            </div>
            <p className="text-[11px] text-white/50 mb-2">{a.impact}</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className={cn("px-2 py-0.5 rounded-md border", riskStyle[a.risk])}>Risk: {a.risk}</span>
              <span className="px-2 py-0.5 rounded-md border border-white/10 text-white/55">Conf {(a.confidence * 100).toFixed(0)}%</span>
              {busy === a.id && <span className="text-white/40">Running…</span>}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
