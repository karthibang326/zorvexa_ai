/**
 * Telemetry Normaliser
 *
 * Takes heterogeneous raw metrics from cloud APIs, on-prem agents, and
 * Prometheus and flattens them into the canonical NormalisedMetric shape.
 */
import type { RawMetric, NormalisedMetric } from "./telemetry.types";

const NUM = (v: unknown, fallback = 0): number =>
  typeof v === "number" ? v : parseFloat(String(v ?? fallback)) || fallback;

export function normalise(raw: RawMetric): NormalisedMetric {
  const v = raw.values;

  // Provider-specific key mappings → canonical fields
  const mappings: Record<string, { cpu?: string; mem?: string; net?: string; lat?: string; err?: string; cost?: string }> = {
    cloudwatch:       { cpu: "CPUUtilization", mem: "MemoryUtilization", net: "NetworkIn", lat: "Latency", err: "5xxErrorRate", cost: "EstimatedCharges" },
    "azure-monitor":  { cpu: "Percentage CPU", mem: "Available Memory Bytes", net: "Network In Total", lat: "Http2xx", err: "Http5xx" },
    stackdriver:      { cpu: "compute.googleapis.com/instance/cpu/utilization", mem: "agent.googleapis.com/memory/percent_used", net: "networking/sent_bytes_count" },
    "onprem-agent":   { cpu: "cpu_pct", mem: "mem_pct", net: "net_mbps", lat: "latency_ms", err: "error_rate", cost: "cost_usd_hr" },
    prometheus:       { cpu: "node_cpu_usage_percent", mem: "node_memory_usage_percent", net: "node_network_transmit_bytes_total", lat: "http_request_duration_p95", err: "http_requests_errors_total" },
    "k8s-metrics-server": { cpu: "cpu_millicores", mem: "memory_mib" },
  };

  const m = mappings[raw.source] ?? {};

  // Memory normalisation: Azure reports bytes not percent
  let memPct = NUM(v[m.mem ?? ""], 0);
  if (raw.source === "azure-monitor" && memPct > 100) {
    memPct = Math.max(0, 100 - (memPct / (1024 * 1024 * 1024)) * 100);
  }
  // k8s-metrics-server reports CPU in millicores
  let cpuPct = NUM(v[m.cpu ?? ""], 0);
  if (raw.source === "k8s-metrics-server") {
    cpuPct = Math.min(100, cpuPct / 10); // rough: 1000m ≈ 100%
  }
  // Stackdriver CPU is 0-1 fraction
  if (raw.source === "stackdriver" && cpuPct <= 1) {
    cpuPct = cpuPct * 100;
  }

  const resourceType = raw.source === "k8s-metrics-server" ? "kubernetes"
    : raw.source === "onprem-agent" ? "compute"
    : "compute";

  return {
    provider: raw.provider,
    environment: raw.environment,
    resourceId: raw.resourceId,
    resourceType,
    cpu: Math.min(100, Math.round(cpuPct * 10) / 10),
    memory: Math.min(100, Math.round(memPct * 10) / 10),
    network: Math.round(NUM(v[m.net ?? ""], 0) / 1_000_000 * 8) || NUM(v["net_mbps"], 0), // bytes/s → Mbps
    storage: Math.round(NUM(v["storage_gb"] ?? v["disk_used_gb"], 0)),
    cost: Math.round(NUM(v[m.cost ?? "cost_usd_hr"], 0) * 1000) / 1000,
    latency: Math.round(NUM(v[m.lat ?? "latency_ms"], 0) * 10) / 10,
    errorRate: Math.round(NUM(v[m.err ?? "error_rate"], 0) * 100) / 100,
    requestsPerSec: v["rps"] != null ? NUM(v["rps"]) : undefined,
    podCount: v["pod_count"] != null ? NUM(v["pod_count"]) : undefined,
    nodeCount: v["node_count"] != null ? NUM(v["node_count"]) : undefined,
    timestamp: raw.timestamp,
    tags: { source: raw.source, ...(v["tags"] as any ?? {}) },
  };
}

export function normaliseMany(raws: RawMetric[]): NormalisedMetric[] {
  return raws.map(normalise);
}
