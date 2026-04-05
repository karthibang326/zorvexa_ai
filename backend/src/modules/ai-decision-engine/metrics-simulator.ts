import type { MetricSnapshot } from "./types";
import { providerForResourceName } from "../multi-cloud/ai-target-provider";

const RESOURCES = ["payments-api", "checkout-edge", "inventory-svc", "auth-gateway"];

/**
 * Stateful pseudo-infra metrics — deterministic enough for demos, varied enough to trigger anomalies.
 * Replace with real scrapers (Prometheus / CloudWatch / kube-metrics) later.
 */
export class MetricsSimulator {
  private idx = 0;
  private state: Record<
    string,
    { cpu: number; mem: number; lat: number; err: number }
  > = {};

  constructor() {
    for (const r of RESOURCES) {
      this.state[r] = {
        cpu: 35 + Math.random() * 25,
        mem: 40 + Math.random() * 20,
        lat: 80 + Math.random() * 60,
        err: 2 + Math.random() * 8,
      };
    }
  }

  next(): MetricSnapshot {
    const resource = RESOURCES[this.idx % RESOURCES.length];
    this.idx += 1;
    const s = this.state[resource]!;

    // Random walk + occasional spike (drives anomalies)
    const spike = Math.random() < 0.22 ? 1 : 0;
    s.cpu = clamp(s.cpu + (Math.random() - 0.45) * 18 + spike * 28, 12, 98);
    s.mem = clamp(s.mem + (Math.random() - 0.4) * 12 + spike * 12, 15, 96);
    s.lat = clamp(s.lat + (Math.random() - 0.35) * 40 + spike * 120, 40, 1200);
    s.err = clamp(s.err + (Math.random() - 0.5) * 6 + spike * 15, 0, 120);

    this.state[resource] = s;

    return {
      ts: Date.now(),
      resource,
      provider: providerForResourceName(resource),
      cpuPct: round1(s.cpu),
      memoryPct: round1(s.mem),
      latencyP95Ms: round1(s.lat),
      errorRateBps: round1(s.err),
    };
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
