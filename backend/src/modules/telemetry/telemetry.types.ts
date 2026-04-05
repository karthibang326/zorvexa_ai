/**
 * ASTRAOPS Unified Telemetry Engine — Types
 *
 * Collects metrics from every source (cloud monitoring, on-prem agents,
 * k8s clusters) and normalises them into ONE canonical format so the
 * AI control plane speaks a single telemetry language.
 */
import type { InfraProvider, InfraEnvironment } from "../uial/uial.types";

export type MetricSource = "cloudwatch" | "azure-monitor" | "stackdriver" | "onprem-agent" | "prometheus" | "k8s-metrics-server";

export interface RawMetric {
  source: MetricSource;
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId: string;
  timestamp: string;
  values: Record<string, number | string>;
}

/** Canonical normalised metric — what every consumer reads */
export interface NormalisedMetric {
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId: string;
  resourceType: "compute" | "storage" | "network" | "kubernetes" | "service";
  cpu: number;
  memory: number;
  network: number;    // Mbps
  storage: number;    // GB
  cost: number;       // USD/hr
  latency: number;    // ms p95
  errorRate: number;  // %
  requestsPerSec?: number;
  podCount?: number;
  nodeCount?: number;
  timestamp: string;
  tags: Record<string, string>;
}

export interface TelemetryAggregate {
  totalProviders: number;
  cloudProviders: number;
  onPremProviders: number;
  totalCostPerHour: number;
  avgCpu: number;
  avgMemory: number;
  avgLatency: number;
  avgErrorRate: number;
  collectedAt: string;
  metrics: NormalisedMetric[];
}

export interface TelemetryAlert {
  alertId: string;
  severity: "info" | "warning" | "critical";
  provider: InfraProvider;
  environment: InfraEnvironment;
  resourceId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  firedAt: string;
  resolvedAt?: string;
}
