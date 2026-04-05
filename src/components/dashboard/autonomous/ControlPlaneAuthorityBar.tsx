import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AutonomyMode } from "@/lib/launch";
import { cn } from "@/lib/utils";

const MODES: { id: AutonomyMode; label: string }[] = [
  { id: "simulation", label: "Simulation" },
  { id: "assisted", label: "Assisted" },
  { id: "autonomous", label: "Autonomous" },
];

function readMode(): AutonomyMode {
  try {
    const raw = localStorage.getItem("astraops_ai_control");
    if (raw) {
      const j = JSON.parse(raw) as { autonomyMode?: AutonomyMode };
      if (j.autonomyMode) return j.autonomyMode;
    }
  } catch {
    /* ignore */
  }
  return "assisted";
}

function persistMode(mode: AutonomyMode) {
  try {
    const raw = localStorage.getItem("astraops_ai_control");
    const j = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem("astraops_ai_control", JSON.stringify({ ...j, autonomyMode: mode }));
  } catch {
    /* ignore */
  }
}

export type ControlPlaneAuthorityBarProps = {
  aiPaused: boolean;
  onPauseToggle: () => void;
  onRunSimulation: () => void;
};

export const ControlPlaneAuthorityBar: React.FC<ControlPlaneAuthorityBarProps> = ({
  aiPaused,
  onPauseToggle,
  onRunSimulation,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AutonomyMode>(readMode);

  useEffect(() => {
    setMode(readMode());
  }, []);

  const setAutonomy = (m: AutonomyMode) => {
    setMode(m);
    persistMode(m);
    toast.success(`AI mode: ${m}`);
    window.dispatchEvent(new CustomEvent("zorvexa:autonomy-mode", { detail: m }));
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">AI mode</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setAutonomy(m.id)}
              className={cn(
                "h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all",
                mode === m.id
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent text-white shadow-lg shadow-indigo-500/20"
                  : "border-white/10 bg-black/20 text-white/55 hover:text-white/85 hover:bg-white/[0.06]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 border-white/15", aiPaused && "border-amber-400/40 text-amber-100")}
          onClick={onPauseToggle}
        >
          {aiPaused ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
          {aiPaused ? "Resume AI" : "Pause AI"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 border-white/15" onClick={onRunSimulation}>
          Run simulation
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-white/15"
          onClick={() => navigate("/launch-setup")}
        >
          <Settings2 className="w-3.5 h-3.5 mr-1.5" />
          Edit guardrails
        </Button>
      </div>
    </div>
  );
};
