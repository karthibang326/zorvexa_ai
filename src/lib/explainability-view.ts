import type { MetricsState } from "@/lib/ai-ops-learning";

/** Normalize values to 0–100 for progress bars (latency ms and traffic index use soft caps). */
export function signalBarPercent(kind: "cpu" | "memory" | "latency" | "traffic", state: MetricsState | undefined): number {
  if (!state) return 0;
  switch (kind) {
    case "cpu":
      return Math.max(0, Math.min(100, Number(state.cpu ?? 0)));
    case "memory":
      return Math.max(0, Math.min(100, Number(state.memory ?? 0)));
    case "latency": {
      const ms = Number(state.latency ?? 0);
      return Math.max(0, Math.min(100, (ms / 350) * 100));
    }
    case "traffic": {
      const r = Number(state.traffic ?? 0);
      return Math.max(0, Math.min(100, (r / 3500) * 100));
    }
    default:
      return 0;
  }
}

export function formatSignalReading(kind: "cpu" | "memory" | "latency" | "traffic", state: MetricsState | undefined): string {
  if (!state) return "—";
  switch (kind) {
    case "cpu":
      return `${Number(state.cpu ?? 0).toFixed(0)}%`;
    case "memory":
      return `${Number(state.memory ?? 0).toFixed(0)}%`;
    case "latency":
      return `${Number(state.latency ?? 0).toFixed(0)} ms`;
    case "traffic": {
      const r = Number(state.traffic ?? 0);
      return r >= 1000 ? `${(r / 1000).toFixed(1)}k rps` : `${r.toFixed(0)} rps`;
    }
    default:
      return "—";
  }
}
