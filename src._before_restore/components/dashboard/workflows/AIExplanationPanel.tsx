import React from "react";
import { motion } from "framer-motion";

export interface ExplainableWorkflow {
  id: string;
  name: string;
  ai_action?: string;
  ai_analysis?: string;
  root_cause?: string;
  recommendation?: string;
  confidence_score?: number;
  cpu?: number;
  memory?: number;
  latency?: number;
  failure_probability?: number;
}

interface AIExplanationPanelProps {
  workflow: ExplainableWorkflow | null;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: "root" | "signals" | "decision") => void;
}

const AIExplanationPanel: React.FC<AIExplanationPanelProps> = ({
  workflow,
  expandedSections,
  onToggleSection,
}) => {
  return (
    <aside className="hidden xl:flex flex-col p-4 bg-[#0A101D]">
      {workflow ? (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-white/10 bg-[#0F172A] p-4 space-y-3"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">AI Explanation</p>
          <h3 className="text-sm font-semibold text-white">{workflow.name}</h3>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black">Confidence</p>
            <p className="text-sm text-white font-semibold">{workflow.confidence_score ?? 0}%</p>
          </div>

          <div className="text-[11px] text-[#9CA3AF] space-y-2">
            <button
              type="button"
              onClick={() => onToggleSection("root")}
              className="w-full text-left rounded-lg border border-white/10 px-2.5 py-2 text-white/90"
            >
              Root Cause
            </button>
            {expandedSections.root && (
              <p className="px-1">
                <span className="text-white/70">Signal:</span> {workflow.root_cause}
              </p>
            )}

            <button
              type="button"
              onClick={() => onToggleSection("signals")}
              className="w-full text-left rounded-lg border border-white/10 px-2.5 py-2 text-white/90"
            >
              Data Signals
            </button>
            {expandedSections.signals && (
              <p className="px-1">
                CPU {workflow.cpu ?? 0}% • Memory {workflow.memory ?? 0}% • Latency {workflow.latency ?? 0}ms •
                Failure {Math.round((workflow.failure_probability ?? 0) * 100)}%
              </p>
            )}

            <button
              type="button"
              onClick={() => onToggleSection("decision")}
              className="w-full text-left rounded-lg border border-white/10 px-2.5 py-2 text-white/90"
            >
              Decision Taken
            </button>
            {expandedSections.decision && (
              <p className="px-1">
                <span className="text-white/70">Action:</span> {workflow.ai_action}. {workflow.ai_analysis} {workflow.recommendation}
              </p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-[11px] text-white/50">
          Select a workflow to view AI analysis, root cause, and recommendations.
        </div>
      )}
    </aside>
  );
};

export default AIExplanationPanel;
