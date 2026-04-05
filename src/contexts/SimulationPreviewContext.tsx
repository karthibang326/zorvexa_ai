import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { SimulationResult } from "@/lib/ai-simulation-engine";

type Ctx = {
  lastSimulation: SimulationResult | null;
  setLastSimulation: (r: SimulationResult | null) => void;
  approvedAction: { action: string; resource: string; at: string } | null;
  setApprovedAction: (a: { action: string; resource: string; at: string } | null) => void;
};

const SimulationPreviewContext = createContext<Ctx | null>(null);

export function SimulationPreviewProvider({ children }: { children: React.ReactNode }) {
  const [lastSimulation, setLastSimulation] = useState<SimulationResult | null>(null);
  const [approvedAction, setApprovedAction] = useState<{ action: string; resource: string; at: string } | null>(null);

  const setLast = useCallback((r: SimulationResult | null) => {
    setLastSimulation(r);
  }, []);

  const value = useMemo(
    () => ({
      lastSimulation,
      setLastSimulation: setLast,
      approvedAction,
      setApprovedAction,
    }),
    [lastSimulation, setLast, approvedAction]
  );

  return <SimulationPreviewContext.Provider value={value}>{children}</SimulationPreviewContext.Provider>;
}

export function useSimulationPreview() {
  const v = useContext(SimulationPreviewContext);
  if (!v) {
    return {
      lastSimulation: null as SimulationResult | null,
      setLastSimulation: (_r: SimulationResult | null) => {},
      approvedAction: null as { action: string; resource: string; at: string } | null,
      setApprovedAction: (_a: { action: string; resource: string; at: string } | null) => {},
    };
  }
  return v;
}
