import React, { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScenarioType = "high_traffic" | "failure" | "cost_spike";

interface SimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkflowId?: string;
}

const SimulationModal: React.FC<SimulationModalProps> = ({ open, onOpenChange, defaultWorkflowId = "" }) => {
  const [workflowId, setWorkflowId] = useState(defaultWorkflowId);
  const [scenario, setScenario] = useState<ScenarioType>("high_traffic");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;
    if (scenario === "high_traffic") {
      return {
        risk: 68,
        outcome: "Likely saturation in 12 minutes",
        action: "Scale +2 nodes and enable queue buffering",
      };
    }
    if (scenario === "failure") {
      return {
        risk: 73,
        outcome: "Failure propagation risk across dependent tasks",
        action: "Enable auto-retry with rollback gate",
      };
    }
    return {
      risk: 57,
      outcome: "Cost spike probable due to bursty regional traffic",
      action: "Shift traffic and lower idle replica floor",
    };
  }, [submitted, scenario]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0B1220] rounded-2xl">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-indigo-300 font-black">AI Simulation Engine</p>
            <h3 className="text-white text-lg font-semibold">Simulate Execution</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-[11px] uppercase tracking-widest">Workflow</Label>
            <Input
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="workflowId"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-[11px] uppercase tracking-widest">Scenario</Label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioType)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none"
            >
              <option value="high_traffic">High traffic</option>
              <option value="failure">Failure</option>
              <option value="cost_spike">Cost spike</option>
            </select>
          </div>

          <Button
            type="button"
            className="w-full h-10 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5]"
            onClick={() => setSubmitted(true)}
            disabled={!workflowId.trim()}
          >
            Run Simulation
          </Button>

          {result && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1.5">
              <p className="text-[11px] text-white/90">Predicted outcome: {result.outcome}</p>
              <p className="text-[11px] text-yellow-300">Risk score: {result.risk}%</p>
              <p className="text-[11px] text-emerald-300">Suggested action: {result.action}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimulationModal;
