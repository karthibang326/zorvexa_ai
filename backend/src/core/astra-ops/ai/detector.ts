import type { WorkloadRow } from "../../../modules/astra-ops/astra-ops.types";

export type AnomalyThresholds = {
  cpuPct: number;
  memoryPct: number;
  cost: number;
};

const DEFAULTS: AnomalyThresholds = {
  cpuPct: 85,
  memoryPct: 90,
  cost: 1000,
};

/** Rule-based anomaly detection (replace with ML / streaming later). */
export function detectAnomalies(
  workloads: WorkloadRow[],
  thresholds: AnomalyThresholds = DEFAULTS
): WorkloadRow[] {
  return workloads.filter((w) => {
    const cpu = w.cpu_usage ?? 0;
    const mem = w.memory_usage ?? 0;
    const cost = w.cost ?? 0;
    return cpu > thresholds.cpuPct || mem > thresholds.memoryPct || cost > thresholds.cost;
  });
}
