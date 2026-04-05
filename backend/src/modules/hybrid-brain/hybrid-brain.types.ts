/**
 * ASTRAOPS Hybrid Brain — Types
 *
 * The AI control plane decides WHERE every workload runs and WHEN to move it.
 * Decisions are driven by: cost, latency, compliance, data-locality, and
 * real-time telemetry — with no human approval required in autonomous mode.
 */
import type { InfraProvider, InfraEnvironment, WorkloadProfile } from "../uial/uial.types";

// ─── Placement decision ───────────────────────────────────────────────────────

export type PlacementReason =
  | "data-locality"      // sensitive data must stay on-prem
  | "compliance"         // GDPR / HIPAA / PCI-DSS policy
  | "cost-optimise"      // cloud is cheaper right now
  | "burst-traffic"      // cloud elasticity needed
  | "latency"            // closest region wins
  | "onprem-failure"     // on-prem down → evacuate to cloud
  | "cloud-outage"       // cloud region down → fall back to on-prem
  | "resource-pressure"  // local resources saturated
  | "learning"           // historical data recommends this placement
  | "default";

export interface PlacementDecision {
  workloadId: string;
  workloadName: string;
  targetProvider: InfraProvider;
  targetEnvironment: InfraEnvironment;
  targetRegion?: string;
  targetCluster?: string;
  confidence: number;         // 0.0 – 1.0
  reasons: PlacementReason[];
  alternativeProvider?: InfraProvider;
  estimatedMonthlyCostUsd: number;
  estimatedLatencyMs: number;
  complianceSatisfied: boolean;
  decidedAt: string;
}

// ─── Placement inputs ─────────────────────────────────────────────────────────

export interface InfraSnapshot {
  provider: InfraProvider;
  environment: InfraEnvironment;
  cpu: number;          // % utilisation
  memory: number;
  cost: number;         // USD/hr aggregate
  latency: number;      // ms
  healthy: boolean;
  onlineAgents?: number;
}

export interface PlacementRequest {
  workload: WorkloadProfile;
  infraSnapshots: InfraSnapshot[];
  currentProvider?: InfraProvider;
  forceOnPrem?: boolean;
  forceCloud?: boolean;
}

// ─── Workload migration ───────────────────────────────────────────────────────

export type MigrationPhase =
  | "PLANNED"
  | "DRAINING"
  | "DEPLOYING"
  | "VERIFYING"
  | "COMPLETED"
  | "ROLLED_BACK"
  | "FAILED";

export interface WorkloadMigration {
  migrationId: string;
  workloadId: string;
  fromProvider: InfraProvider;
  fromEnvironment: InfraEnvironment;
  toProvider: InfraProvider;
  toEnvironment: InfraEnvironment;
  reason: PlacementReason;
  phase: MigrationPhase;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

// ─── Learning memory entry ────────────────────────────────────────────────────

export interface PlacementMemoryEntry {
  id: string;
  workloadProfile: Pick<WorkloadProfile, "dataLocality" | "compliance" | "latencySensitive" | "burstable">;
  provider: InfraProvider;
  outcome: "success" | "failure" | "suboptimal";
  avgCost: number;
  avgLatency: number;
  recordedAt: string;
}
