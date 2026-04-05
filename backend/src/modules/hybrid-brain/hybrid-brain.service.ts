/**
 * ASTRAOPS Hybrid Brain Service
 *
 * The orchestration layer that:
 *   1. Snapshots all providers via UIAL
 *   2. Calls the placement engine
 *   3. Records learning memory
 *   4. Tracks in-flight migrations
 */
import { getAllAdapters } from "../uial/uial.registry";
import { decidePlacement, recordOutcome } from "./placement-engine";
import type {
  PlacementRequest, PlacementDecision, WorkloadMigration,
  PlacementMemoryEntry, InfraSnapshot, PlacementReason,
} from "./hybrid-brain.types";
import type { WorkloadProfile } from "../uial/uial.types";

// ─── In-process migration registry ───────────────────────────────────────────

const migrations = new Map<string, WorkloadMigration>();

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Seed some historical decisions for the UI ────────────────────────────────

function seedMigrations() {
  const NOW = Date.now();
  const seed: WorkloadMigration[] = [
    {
      migrationId: "mig-001", workloadId: "wl-payments",
      fromProvider: "baremetal", fromEnvironment: "onprem",
      toProvider: "aws", toEnvironment: "cloud",
      reason: "burst-traffic", phase: "COMPLETED",
      startedAt: new Date(NOW - 3_600_000).toISOString(),
      completedAt: new Date(NOW - 3_540_000).toISOString(), durationMs: 60_000,
    },
    {
      migrationId: "mig-002", workloadId: "wl-analytics",
      fromProvider: "aws", fromEnvironment: "cloud",
      toProvider: "baremetal", toEnvironment: "onprem",
      reason: "cost-optimise", phase: "COMPLETED",
      startedAt: new Date(NOW - 7_200_000).toISOString(),
      completedAt: new Date(NOW - 7_110_000).toISOString(), durationMs: 90_000,
    },
    {
      migrationId: "mig-003", workloadId: "wl-ehr-service",
      fromProvider: "gcp", fromEnvironment: "cloud",
      toProvider: "vmware", toEnvironment: "onprem",
      reason: "compliance", phase: "COMPLETED",
      startedAt: new Date(NOW - 14_400_000).toISOString(),
      completedAt: new Date(NOW - 14_310_000).toISOString(), durationMs: 90_000,
    },
  ];
  seed.forEach((m) => migrations.set(m.migrationId, m));
}
seedMigrations();

// ─── Service ──────────────────────────────────────────────────────────────────

export const hybridBrainService = {
  /** Snapshot all providers and decide placement for a workload */
  async decide(workload: WorkloadProfile, opts?: { forceOnPrem?: boolean; forceCloud?: boolean }): Promise<PlacementDecision> {
    const adapters = getAllAdapters();
    const snapshots = await Promise.all(
      adapters.map(async (a): Promise<InfraSnapshot> => {
        try {
          const [m, h] = await Promise.all([a.metrics(), a.healthCheck()]);
          return {
            provider: a.provider,
            environment: a.environment,
            cpu: m.cpu,
            memory: m.memory,
            cost: m.cost,
            latency: m.latency,
            healthy: h.healthy,
          };
        } catch {
          return {
            provider: a.provider,
            environment: a.environment,
            cpu: 0, memory: 0, cost: 0, latency: 999,
            healthy: false,
          };
        }
      }),
    );

    const req: PlacementRequest = {
      workload,
      infraSnapshots: snapshots,
      forceOnPrem: opts?.forceOnPrem,
      forceCloud: opts?.forceCloud,
    };

    return decidePlacement(req);
  },

  /** Execute a workload migration (cloud ↔ on-prem) */
  async migrate(
    workloadId: string,
    workloadName: string,
    fromProvider: Parameters<typeof decidePlacement>[0]["workload"]["id"] extends string ? any : never,
    opts: {
      fromProvider: WorkloadMigration["fromProvider"];
      fromEnvironment: WorkloadMigration["fromEnvironment"];
      toProvider: WorkloadMigration["toProvider"];
      toEnvironment: WorkloadMigration["toEnvironment"];
      reason: PlacementReason;
    },
  ): Promise<WorkloadMigration> {
    const migrationId = `mig-${genId()}`;
    const migration: WorkloadMigration = {
      migrationId,
      workloadId,
      fromProvider: opts.fromProvider,
      fromEnvironment: opts.fromEnvironment,
      toProvider: opts.toProvider,
      toEnvironment: opts.toEnvironment,
      reason: opts.reason,
      phase: "PLANNED",
      startedAt: new Date().toISOString(),
    };
    migrations.set(migrationId, migration);

    // Simulate async migration phases
    const phases: WorkloadMigration["phase"][] = ["DRAINING", "DEPLOYING", "VERIFYING", "COMPLETED"];
    let delay = 800;
    for (const phase of phases) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      migration.phase = phase;
      delay = Math.round(delay * 0.8);
    }
    migration.completedAt = new Date().toISOString();
    migration.durationMs = Date.now() - new Date(migration.startedAt).getTime();

    // Record in learning memory
    const memEntry: PlacementMemoryEntry = {
      id: genId(),
      workloadProfile: {
        dataLocality: "cloud-ok",
        compliance: [],
        latencySensitive: false,
        burstable: true,
      },
      provider: opts.toProvider,
      outcome: "success",
      avgCost: 0,
      avgLatency: 0,
      recordedAt: migration.completedAt,
    };
    recordOutcome(memEntry);

    return migration;
  },

  /** List migrations (last N) */
  listMigrations(limit = 50): WorkloadMigration[] {
    return Array.from(migrations.values())
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  },

  getMigration(migrationId: string): WorkloadMigration | undefined {
    return migrations.get(migrationId);
  },

  /** Live infra snapshot across all providers */
  async snapshot(): Promise<InfraSnapshot[]> {
    const adapters = getAllAdapters();
    return Promise.all(
      adapters.map(async (a): Promise<InfraSnapshot> => {
        try {
          const [m, h] = await Promise.all([a.metrics(), a.healthCheck()]);
          return {
            provider: a.provider, environment: a.environment,
            cpu: m.cpu, memory: m.memory, cost: m.cost, latency: m.latency,
            healthy: h.healthy, onlineAgents: (h.metrics as any)?.healthyNodes ?? undefined,
          };
        } catch {
          return { provider: a.provider, environment: a.environment, cpu: 0, memory: 0, cost: 0, latency: 999, healthy: false };
        }
      }),
    );
  },
};
