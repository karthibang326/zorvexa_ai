import React from "react";
import { cn } from "@/lib/utils";
import type { RunItem } from "@/store/orchestration";

export interface PredictedExecutionItem {
  id: string;
  workflowId: string;
  startsIn: string;
  reason: string;
  triggerType: "scheduled" | "anomaly" | "ai";
  riskScore: number;
}

interface ExecutionTimelineProps {
  runs: RunItem[];
  predicted: PredictedExecutionItem[];
  onSelectRun: (runId: string) => void;
  onSelectPrediction: (item: PredictedExecutionItem) => void;
  getRunProgress: (run: RunItem) => number;
}

const statusTone = (status: string) => {
  if (status === "SUCCESS") return "green";
  if (status === "FAILED") return "red";
  if (status === "RUNNING" || status === "QUEUED") return "blue";
  return "slate";
};

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  runs,
  predicted,
  onSelectRun,
  onSelectPrediction,
  getRunProgress,
}) => {
  const past = runs.filter((r) => r.status === "SUCCESS" || r.status === "FAILED");
  const live = runs.filter((r) => r.status === "RUNNING" || r.status === "QUEUED");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
        <p className="text-[10px] uppercase tracking-widest font-black text-white/45 mb-3">Past Runs</p>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {past.map((run) => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className="w-full text-left rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white font-semibold truncate">{run.id}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest border",
                    statusTone(run.status) === "green" && "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                    statusTone(run.status) === "red" && "text-red-300 border-red-500/30 bg-red-500/10"
                  )}
                >
                  {run.status}
                </span>
              </div>
              <p className="text-[10px] text-white/45 mt-1">{run.updatedAt ? new Date(run.updatedAt).toLocaleString() : "recently"}</p>
            </button>
          ))}
          {past.length === 0 && <p className="text-[11px] text-white/40">No completed runs yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
        <p className="text-[10px] uppercase tracking-widest font-black text-blue-300 mb-3">Running</p>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {live.map((run) => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className="w-full text-left rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 hover:brightness-110 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white font-semibold truncate">{run.id}</span>
                <span className="text-[10px] text-blue-200">{getRunProgress(run)}%</span>
              </div>
              <div className="h-1.5 mt-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${getRunProgress(run)}%` }} />
              </div>
              <p className="text-[10px] text-white/45 mt-2">workflow: {run.workflowId}</p>
            </button>
          ))}
          {live.length === 0 && <p className="text-[11px] text-white/40">No active executions.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
        <p className="text-[10px] uppercase tracking-widest font-black text-purple-300 mb-3">Predicted Runs</p>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {predicted.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectPrediction(item)}
              className="w-full text-left rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 hover:brightness-110 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white font-semibold truncate">{item.workflowId}</span>
                <span className="text-[10px] text-purple-200">{item.startsIn}</span>
              </div>
              <p className="text-[10px] text-white/70 mt-1">{item.reason}</p>
              <p className="text-[10px] text-white/45 mt-1">
                Trigger: {item.triggerType.toUpperCase()} • Risk: {item.riskScore}%
              </p>
            </button>
          ))}
          {predicted.length === 0 && <p className="text-[11px] text-white/40">No predicted executions right now.</p>}
        </div>
      </section>
    </div>
  );
};

export default ExecutionTimeline;
