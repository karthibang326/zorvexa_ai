import type { MetricsAgentResult } from "./types";
import type { TelemetrySnapshot } from "./types";

function parsePercent(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseGb(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseLatencyMs(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

export async function metricsAgent(
  _query: string,
  telemetry: TelemetrySnapshot
): Promise<MetricsAgentResult> {
  const cpuPercent = parsePercent(telemetry.cpu);
  const memoryGb = parseGb(telemetry.memory);
  const latencyMs = parseLatencyMs(telemetry.latency);

  return {
    source: "prometheus-simulated",
    cpuPercent,
    memoryGb,
    latencyMs,
    cpuSpike: cpuPercent > 80,
    alerts: telemetry.alerts,
  };
}
