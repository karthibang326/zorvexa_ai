import { NormalizedCostRecord } from "./cost-collector";

export function detectCostAnomaly(records: NormalizedCostRecord[]) {
  if (records.length < 2) {
    return { anomaly: false, reason: "Insufficient history", severity: "LOW" as const };
  }

  const latest = records[records.length - 1];
  const avg = records.slice(0, -1).reduce((s, r) => s + r.cost, 0) / Math.max(1, records.length - 1);
  const spikeRatio = avg > 0 ? (latest.cost - avg) / avg : 0;
  if (spikeRatio > 0.3) {
    return {
      anomaly: true,
      reason: `Cost spike in ${latest.service}`,
      severity: spikeRatio > 0.6 ? ("HIGH" as const) : ("MEDIUM" as const),
    };
  }
  return { anomaly: false, reason: "No anomaly", severity: "LOW" as const };
}

