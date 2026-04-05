/**
 * ASTRAOPS Hybrid Failover Engine
 *
 * Implements the autonomous OBSERVE → DETECT → DECIDE → ACT → VERIFY loop
 * for cross-environment failover:
 *
 *   On-Prem failure  → evacuate to cloud (AWS / Azure / GCP)
 *   Cloud outage     → fall back to on-prem (baremetal / vmware / k8s-onprem)
 *   Latency spike    → migrate to the closest healthy region
 *
 * All failover operations execute WITHOUT human approval.
 */
import type { InfraProvider, InfraEnvironment } from "../uial/uial.types";

export type FailoverTrigger =
  | "ONPREM_NODE_CRASH"
  | "VMWARE_HOST_FAILURE"
  | "K8S_NODE_NOT_READY"
  | "CLOUD_REGION_OUTAGE"
  | "LATENCY_SPIKE"
  | "ERROR_RATE_BREACH"
  | "MANUAL_DRILL"
  | "SCHEDULED_TEST";

export type FailoverState =
  | "DETECTED"
  | "ANALYZING"
  | "DRAINING"
  | "REDIRECTING_TRAFFIC"
  | "DEPLOYING_TARGET"
  | "VERIFYING"
  | "COMPLETED"
  | "ROLLED_BACK"
  | "FAILED";

export interface FailoverEvent {
  failoverId: string;
  trigger: FailoverTrigger;
  sourceProvider: InfraProvider;
  sourceEnvironment: InfraEnvironment;
  targetProvider: InfraProvider;
  targetEnvironment: InfraEnvironment;
  affectedWorkloads: string[];
  state: FailoverState;
  detectedAt: string;
  completedAt?: string;
  durationMs?: number;
  stateHistory: Array<{ state: FailoverState; at: string; notes?: string }>;
  rtoMs?: number;    // actual RTO achieved
  rpoMs?: number;    // estimated RPO (data lag)
  verified: boolean;
  error?: string;
}

// ─── Strategy matrix ──────────────────────────────────────────────────────────
// Defines preferred target provider for each trigger+source combination

interface Strategy {
  targetProvider: InfraProvider;
  targetEnvironment: InfraEnvironment;
  estimatedRtoMs: number;
  estimatedRpoMs: number;
}

export function selectStrategy(trigger: FailoverTrigger, source: InfraEnvironment): Strategy {
  // On-prem failure → burst to cloud
  if (source === "onprem") {
    return { targetProvider: "aws", targetEnvironment: "cloud", estimatedRtoMs: 90_000, estimatedRpoMs: 5_000 };
  }
  // Cloud outage → fall back to on-prem
  if (trigger === "CLOUD_REGION_OUTAGE") {
    return { targetProvider: "baremetal", targetEnvironment: "onprem", estimatedRtoMs: 120_000, estimatedRpoMs: 10_000 };
  }
  // Latency spike → pick lowest-latency cloud region (modelled as gcp here)
  if (trigger === "LATENCY_SPIKE") {
    return { targetProvider: "gcp", targetEnvironment: "cloud", estimatedRtoMs: 45_000, estimatedRpoMs: 2_000 };
  }
  // Default: cross-cloud migration
  return { targetProvider: "azure", targetEnvironment: "cloud", estimatedRtoMs: 60_000, estimatedRpoMs: 3_000 };
}

// ─── Phase simulator ──────────────────────────────────────────────────────────

export async function runFailoverPhases(
  event: FailoverEvent,
  onStateChange: (ev: FailoverEvent) => void,
): Promise<FailoverEvent> {
  const phases: Array<{ state: FailoverState; delayMs: number; notes: string }> = [
    { state: "ANALYZING",          delayMs: 600,   notes: "Corroborating telemetry signals" },
    { state: "DRAINING",           delayMs: 1_200, notes: "Draining source connections gracefully" },
    { state: "REDIRECTING_TRAFFIC",delayMs: 800,   notes: "Updating DNS / load balancer rules" },
    { state: "DEPLOYING_TARGET",   delayMs: 2_000, notes: "Applying manifests on target provider" },
    { state: "VERIFYING",          delayMs: 600,   notes: "Running health probes on target" },
    { state: "COMPLETED",          delayMs: 0,     notes: "Failover complete — all workloads healthy" },
  ];

  const start = Date.now();
  for (const { state, delayMs, notes } of phases) {
    await new Promise<void>((r) => setTimeout(r, delayMs));
    event.state = state;
    event.stateHistory.push({ state, at: new Date().toISOString(), notes });
    onStateChange({ ...event });
  }

  event.completedAt = new Date().toISOString();
  event.durationMs = Date.now() - start;
  event.verified = true;
  return event;
}
