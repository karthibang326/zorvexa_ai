import React from "react";
import type { RunItem } from "@/store/orchestration";

interface AIReasoningPanelProps {
  run: RunItem | null;
  reason?: string;
  triggerSource?: string;
}

const AIReasoningPanel: React.FC<AIReasoningPanelProps> = ({ run, reason, triggerSource }) => {
  if (!run) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Select a timeline item to inspect AI reasoning.
      </div>
    );
  }

  const cpuSignal = run.status === "FAILED" ? 87 : run.status === "RUNNING" ? 72 : 46;
  const trafficSignal = run.status === "FAILED" ? 41 : 24;
  const risk = run.status === "FAILED" ? 78 : run.status === "RUNNING" ? 62 : 35;
  const decision = run.status === "FAILED" ? "Retry + self-heal" : run.status === "RUNNING" ? "Continue execution" : "No intervention";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-black">AI Reasoning</p>
      <h4 className="text-white font-semibold">{run.id}</h4>
      <p className="text-[11px] text-white/70">Source: {triggerSource ?? "AI"} • Why: {reason ?? "Execution intelligence policy"}</p>

      <div className="rounded-xl border border-white/10 bg-[#0F172A] p-3">
        <p className="text-[10px] text-white/50 uppercase tracking-widest">Signals</p>
        <p className="text-[11px] text-white/80 mt-1">CPU anomaly: {cpuSignal}%</p>
        <p className="text-[11px] text-white/80">Traffic delta: +{trafficSignal}%</p>
        <p className="text-[11px] text-yellow-300">Predicted risk: {risk}%</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F172A] p-3">
        <p className="text-[10px] text-white/50 uppercase tracking-widest">Decision</p>
        <p className="text-[11px] text-white/90 mt-1">{decision}</p>
      </div>
    </div>
  );
};

export default AIReasoningPanel;
