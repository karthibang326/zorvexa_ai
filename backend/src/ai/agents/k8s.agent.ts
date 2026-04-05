import type { K8sAgentResult } from "./types";
import type { TelemetrySnapshot } from "./types";

export async function k8sAgent(
  _query: string,
  telemetry: TelemetrySnapshot
): Promise<K8sAgentResult> {
  const unhealthySummary: string[] = [];

  if (telemetry.alerts.length > 0) {
    unhealthySummary.push(...telemetry.alerts.map((a) => `Alert: ${a}`));
  }

  const errorLogs = telemetry.logs.filter((l) => /\bERROR\b/i.test(l));
  if (errorLogs.length > 0) {
    const head = errorLogs[0]?.slice(0, 120) ?? "";
    unhealthySummary.push(
      `Log errors observed (${errorLogs.length}): ${head}${head.length >= 120 ? "…" : ""}`
    );
  }

  return {
    source: "cluster-simulated",
    cluster: telemetry.cluster,
    activePods: telemetry.activePods,
    signals:
      telemetry.alerts.length === 0 && errorLogs.length === 0
        ? ["All simulated workload signals nominal"]
        : ["Degraded signals present in telemetry snapshot"],
    unhealthySummary:
      unhealthySummary.length > 0
        ? unhealthySummary
        : ["No unhealthy pod-phase data in snapshot (simulated)"],
  };
}
