import type { DetectionResult, MetricSnapshot, AnomalySignal } from "./types";

const CPU_WARN = 72;
const CPU_CRIT = 88;
const MEM_WARN = 78;
const MEM_CRIT = 92;
const LAT_WARN_MS = 220;
const LAT_CRIT_MS = 450;
const ERR_WARN_BPS = 25;
const ERR_CRIT_BPS = 60;

function sevCpu(v: number): AnomalySignal["severity"] {
  if (v >= CPU_CRIT) return "critical";
  if (v >= CPU_WARN) return "warning";
  return "info";
}

function sevMem(v: number): AnomalySignal["severity"] {
  if (v >= MEM_CRIT) return "critical";
  if (v >= MEM_WARN) return "warning";
  return "info";
}

function sevLat(v: number): AnomalySignal["severity"] {
  if (v >= LAT_CRIT_MS) return "critical";
  if (v >= LAT_WARN_MS) return "warning";
  return "info";
}

function sevErr(v: number): AnomalySignal["severity"] {
  if (v >= ERR_CRIT_BPS) return "critical";
  if (v >= ERR_WARN_BPS) return "warning";
  return "info";
}

/**
 * Detection Engine — rule-based analysis of CPU, latency, memory, error rate.
 * Upgrade path: isolation forest / EWMA on residuals from your metrics backend.
 */
export function detectAnomalies(m: MetricSnapshot): DetectionResult {
  const signals: AnomalySignal[] = [];

  if (m.cpuPct >= CPU_WARN) {
    signals.push({
      kind: "cpu",
      severity: sevCpu(m.cpuPct),
      value: m.cpuPct,
      threshold: CPU_WARN,
      message: `CPU utilization ${m.cpuPct}% exceeds ${CPU_WARN}% advisory threshold`,
    });
  }

  if (m.memoryPct >= MEM_WARN) {
    signals.push({
      kind: "memory",
      severity: sevMem(m.memoryPct),
      value: m.memoryPct,
      threshold: MEM_WARN,
      message: `Memory pressure ${m.memoryPct}% (working-set / cgroup limit proxy)`,
    });
  }

  if (m.latencyP95Ms >= LAT_WARN_MS) {
    signals.push({
      kind: "latency",
      severity: sevLat(m.latencyP95Ms),
      value: m.latencyP95Ms,
      threshold: LAT_WARN_MS,
      message: `p95 latency ${m.latencyP95Ms}ms above ${LAT_WARN_MS}ms SLO guardrail`,
    });
  }

  if (m.errorRateBps >= ERR_WARN_BPS) {
    signals.push({
      kind: "errors",
      severity: sevErr(m.errorRateBps),
      value: m.errorRateBps,
      threshold: ERR_WARN_BPS,
      message: `Client error budget burn: ${m.errorRateBps} bps (5xx+4xx normalized)`,
    });
  }

  const hasAnomaly = signals.length > 0;
  const worst = signals.reduce((a, b) => {
    const rank = (s: AnomalySignal["severity"]) => (s === "critical" ? 3 : s === "warning" ? 2 : 1);
    return rank(b.severity) > rank(a.severity) ? b : a;
  }, signals[0]);

  const summary = hasAnomaly
    ? `${signals.length} signal(s): ${worst?.kind ?? "unknown"} (${worst?.severity ?? "warning"}) — ${m.resource}`
    : `All signals within policy bands for ${m.resource}`;

  return { hasAnomaly, signals, summary };
}
