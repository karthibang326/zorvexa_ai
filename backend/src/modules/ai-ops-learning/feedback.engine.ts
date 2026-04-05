import { MetricsState } from "./types";

export type FeedbackResult = {
  result: "success" | "failure" | "partial";
  latencyDelta: number;
  cpuDelta: number;
  errorDelta: number;
  costDelta: number;
  summary: string;
};

export function compareBeforeAfter(before: MetricsState, after: MetricsState): FeedbackResult {
  const bLat = Number(before.latency ?? 0);
  const aLat = Number(after.latency ?? 0);
  const bCpu = Number(before.cpu ?? 0);
  const aCpu = Number(after.cpu ?? 0);
  const bErr = Number(before.errorRate ?? 0);
  const aErr = Number(after.errorRate ?? 0);
  const bCost = Number(before.cost ?? 0);
  const aCost = Number(after.cost ?? 0);

  const latencyDelta = bLat > 0 ? (bLat - aLat) / bLat : 0;
  const cpuDelta = bCpu > 0 ? (bCpu - aCpu) / bCpu : 0;
  const errorDelta = bErr > 0 ? (bErr - aErr) / bErr : 0;
  const costDelta = bCost > 0 ? (aCost - bCost) / bCost : 0;

  const improved = latencyDelta > 0.05 || cpuDelta > 0.05 || errorDelta > 0.1;
  const degraded = latencyDelta < -0.05 || cpuDelta < -0.05 || aErr > bErr * 1.2;

  const result: FeedbackResult["result"] = degraded ? "failure" : improved ? "success" : "partial";
  const summary =
    result === "success"
      ? `Improved: latency ${(latencyDelta * 100).toFixed(1)}%, CPU ${(cpuDelta * 100).toFixed(1)}% vs baseline.`
      : result === "failure"
        ? "Regression detected on key signals — consider rollback or alternate strategy."
        : "Mixed or neutral outcome — monitor longer horizon.";

  return {
    result,
    latencyDelta,
    cpuDelta,
    errorDelta,
    costDelta,
    summary,
  };
}
