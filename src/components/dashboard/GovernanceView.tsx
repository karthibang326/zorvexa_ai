import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getOrchestratorState, type OrchestratorDecision } from "@/lib/ai-orchestrator";

const GovernanceView: React.FC = () => {
  const [decisions, setDecisions] = useState<OrchestratorDecision[]>([]);

  useEffect(() => {
    void getOrchestratorState().then((s) => {
      setDecisions(s.decisions.filter((d) => d.module === "security" || d.module === "organization"));
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-xs text-white/50">Governance posture is enforced autonomously by AI policy guardrails.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
        <h3 className="text-xs font-semibold text-white/60 mb-3">Policy and Compliance Decisions</h3>
        <div className="space-y-2">
          {decisions.slice(0, 10).map((d, i) => (
            <div key={`${d.at}-${i}`} className="rounded-lg border border-white/10 p-3">
              <p className="text-[11px] text-white/45">{d.module}</p>
              <p className="text-sm text-white/85 mt-1">{d.reason}</p>
              <p className="text-xs text-white/50 mt-1">Impact: {d.impact}</p>
              <p className="text-xs text-white/50 mt-1 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-300" /> Confidence {Math.round(d.confidence * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GovernanceView;

