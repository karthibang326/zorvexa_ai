/**
 * ASTRAOPS Telemetry Service
 *
 * Collects from all UIAL adapters + on-prem agent manager, normalises,
 * detects threshold breaches, and exposes a unified aggregate.
 */
import { getAllAdapters } from "../uial/uial.registry";
import { agentManager } from "../onprem-agent/agent.manager";
import { normalise } from "./telemetry.normalizer";
import type { NormalisedMetric, TelemetryAggregate, TelemetryAlert, RawMetric } from "./telemetry.types";

// ─── Alert thresholds ─────────────────────────────────────────────────────────
const THRESHOLDS = { cpu: 85, memory: 90, latency: 300, errorRate: 2 };

const alertStore: TelemetryAlert[] = [];
let alertSeq = 0;

function checkThresholds(m: NormalisedMetric): void {
  const NOW = new Date().toISOString();
  const checks: Array<[string, number, number]> = [
    ["cpu",       m.cpu,       THRESHOLDS.cpu],
    ["memory",    m.memory,    THRESHOLDS.memory],
    ["latency",   m.latency,   THRESHOLDS.latency],
    ["errorRate", m.errorRate, THRESHOLDS.errorRate],
  ];
  for (const [metric, value, threshold] of checks) {
    if (value > threshold) {
      alertStore.push({
        alertId: `alert-${++alertSeq}`,
        severity: value > threshold * 1.15 ? "critical" : "warning",
        provider: m.provider,
        environment: m.environment,
        resourceId: m.resourceId,
        metric,
        value: Math.round(value * 10) / 10,
        threshold,
        message: `${metric} (${Math.round(value)}${metric === "latency" ? "ms" : "%"}) exceeds threshold ${threshold} on ${m.provider}/${m.resourceId}`,
        firedAt: NOW,
      });
      // keep last 500
      if (alertStore.length > 500) alertStore.splice(0, alertStore.length - 500);
    }
  }
}

// ─── Collect from UIAL adapters ───────────────────────────────────────────────

async function collectFromAdapters(): Promise<NormalisedMetric[]> {
  const adapters = getAllAdapters();
  const results = await Promise.allSettled(adapters.map((a) => a.metrics()));
  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => {
      const m = r.value;
      const raw: RawMetric = {
        source: m.environment === "onprem" ? "onprem-agent" : m.provider === "aws" ? "cloudwatch" : m.provider === "azure" ? "azure-monitor" : "stackdriver",
        provider: m.provider,
        environment: m.environment,
        resourceId: m.resourceId,
        timestamp: m.timestamp,
        values: {
          cpu_pct: m.cpu, mem_pct: m.memory, net_mbps: m.network,
          storage_gb: m.storage, cost_usd_hr: m.cost,
          latency_ms: m.latency, error_rate: m.errorRate,
        },
      };
      return normalise(raw);
    });
}

// ─── Collect from on-prem agents ──────────────────────────────────────────────

function collectFromAgents(): NormalisedMetric[] {
  return agentManager.listAgents().map((agent) => {
    const raw: RawMetric = {
      source: "onprem-agent",
      provider: agent.provider as any,
      environment: "onprem",
      resourceId: agent.agentId,
      timestamp: agent.lastSeenAt,
      values: {
        cpu_pct: agent.cpuPct,
        mem_pct: agent.memoryPct,
        net_mbps: 850,
        storage_gb: 0,
        cost_usd_hr: 0,
        latency_ms: 5,
        error_rate: agent.status === "degraded" ? 2.8 : 0.05,
      },
    };
    return normalise(raw);
  });
}

// ─── Service API ──────────────────────────────────────────────────────────────

export const telemetryService = {
  async collect(): Promise<TelemetryAggregate> {
    const [adapterMetrics, agentMetrics] = await Promise.all([
      collectFromAdapters(),
      Promise.resolve(collectFromAgents()),
    ]);

    const all = [...adapterMetrics, ...agentMetrics];
    all.forEach(checkThresholds);

    const cloud = all.filter((m) => m.environment === "cloud");
    const onprem = all.filter((m) => m.environment === "onprem");

    const avg = (arr: NormalisedMetric[], key: keyof NormalisedMetric) =>
      arr.length ? arr.reduce((s, m) => s + Number(m[key]), 0) / arr.length : 0;

    return {
      totalProviders: new Set(all.map((m) => m.provider)).size,
      cloudProviders: new Set(cloud.map((m) => m.provider)).size,
      onPremProviders: new Set(onprem.map((m) => m.provider)).size,
      totalCostPerHour: Math.round(cloud.reduce((s, m) => s + m.cost, 0) * 100) / 100,
      avgCpu:       Math.round(avg(all, "cpu") * 10) / 10,
      avgMemory:    Math.round(avg(all, "memory") * 10) / 10,
      avgLatency:   Math.round(avg(all, "latency") * 10) / 10,
      avgErrorRate: Math.round(avg(all, "errorRate") * 100) / 100,
      collectedAt: new Date().toISOString(),
      metrics: all,
    };
  },

  async alerts(limit = 100): Promise<TelemetryAlert[]> {
    // refresh to check current state
    await this.collect();
    return alertStore
      .filter((a) => !a.resolvedAt)
      .sort((a, b) => b.firedAt.localeCompare(a.firedAt))
      .slice(0, limit);
  },

  resolveAlert(alertId: string): boolean {
    const a = alertStore.find((x) => x.alertId === alertId);
    if (!a) return false;
    a.resolvedAt = new Date().toISOString();
    return true;
  },
};
