import { selectStrategy, runFailoverPhases } from "./failover.engine";
import type { FailoverEvent, FailoverTrigger, FailoverState } from "./failover.engine";
import type { InfraProvider, InfraEnvironment } from "../uial/uial.types";

// ─── In-process event store ───────────────────────────────────────────────────

const failoverStore = new Map<string, FailoverEvent>();
const listeners: Array<(ev: FailoverEvent) => void> = [];

function genId() {
  return `fov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Seed historical failovers ────────────────────────────────────────────────

function seed() {
  const NOW = Date.now();
  const history: FailoverEvent[] = [
    {
      failoverId: "fov-001", trigger: "ONPREM_NODE_CRASH",
      sourceProvider: "baremetal", sourceEnvironment: "onprem",
      targetProvider: "aws", targetEnvironment: "cloud",
      affectedWorkloads: ["payments-api", "order-service"],
      state: "COMPLETED", detectedAt: new Date(NOW - 5_400_000).toISOString(),
      completedAt: new Date(NOW - 5_310_000).toISOString(), durationMs: 90_000,
      stateHistory: [], verified: true, rtoMs: 90_000, rpoMs: 4_000,
    },
    {
      failoverId: "fov-002", trigger: "CLOUD_REGION_OUTAGE",
      sourceProvider: "aws", sourceEnvironment: "cloud",
      targetProvider: "baremetal", targetEnvironment: "onprem",
      affectedWorkloads: ["analytics-pipeline"],
      state: "COMPLETED", detectedAt: new Date(NOW - 3_600_000).toISOString(),
      completedAt: new Date(NOW - 3_480_000).toISOString(), durationMs: 120_000,
      stateHistory: [], verified: true, rtoMs: 120_000, rpoMs: 9_500,
    },
    {
      failoverId: "fov-003", trigger: "LATENCY_SPIKE",
      sourceProvider: "azure", sourceEnvironment: "cloud",
      targetProvider: "gcp", targetEnvironment: "cloud",
      affectedWorkloads: ["user-service", "auth-gateway"],
      state: "COMPLETED", detectedAt: new Date(NOW - 1_800_000).toISOString(),
      completedAt: new Date(NOW - 1_755_000).toISOString(), durationMs: 45_000,
      stateHistory: [], verified: true, rtoMs: 45_000, rpoMs: 1_800,
    },
  ];
  history.forEach((e) => failoverStore.set(e.failoverId, e));
}
seed();

// ─── Service API ──────────────────────────────────────────────────────────────

export const failoverService = {
  /** Trigger a new failover (autonomous or manual drill) */
  async trigger(params: {
    trigger: FailoverTrigger;
    sourceProvider: InfraProvider;
    sourceEnvironment: InfraEnvironment;
    affectedWorkloads: string[];
    targetProvider?: InfraProvider;
    targetEnvironment?: InfraEnvironment;
  }): Promise<FailoverEvent> {
    const strategy = selectStrategy(params.trigger, params.sourceEnvironment);
    const failoverId = genId();
    const NOW = new Date().toISOString();

    const event: FailoverEvent = {
      failoverId,
      trigger: params.trigger,
      sourceProvider: params.sourceProvider,
      sourceEnvironment: params.sourceEnvironment,
      targetProvider: params.targetProvider ?? strategy.targetProvider,
      targetEnvironment: params.targetEnvironment ?? strategy.targetEnvironment,
      affectedWorkloads: params.affectedWorkloads,
      state: "DETECTED" as FailoverState,
      detectedAt: NOW,
      stateHistory: [{ state: "DETECTED", at: NOW, notes: "Anomaly confirmed — failover initiated" }],
      verified: false,
      rtoMs: strategy.estimatedRtoMs,
      rpoMs: strategy.estimatedRpoMs,
    };
    failoverStore.set(failoverId, event);
    listeners.forEach((fn) => fn({ ...event }));

    // Run phases asynchronously — control returns immediately with DETECTED state
    runFailoverPhases(event, (updated) => {
      failoverStore.set(failoverId, updated);
      listeners.forEach((fn) => fn({ ...updated }));
    }).catch(() => {
      event.state = "FAILED";
      event.error = "Phase execution error";
      listeners.forEach((fn) => fn({ ...event }));
    });

    return event;
  },

  listFailovers(limit = 50): FailoverEvent[] {
    return Array.from(failoverStore.values())
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, limit);
  },

  getFailover(failoverId: string): FailoverEvent | undefined {
    return failoverStore.get(failoverId);
  },

  onFailoverEvent(fn: (ev: FailoverEvent) => void): () => void {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /** Simulate a specific failure scenario for chaos testing */
  async simulateScenario(scenario: "onprem-crash" | "cloud-outage" | "latency-spike"): Promise<FailoverEvent> {
    const scenarios: Record<typeof scenario, Parameters<typeof this.trigger>[0]> = {
      "onprem-crash": {
        trigger: "ONPREM_NODE_CRASH",
        sourceProvider: "baremetal", sourceEnvironment: "onprem",
        affectedWorkloads: ["payments-api", "order-service", "inventory-db"],
      },
      "cloud-outage": {
        trigger: "CLOUD_REGION_OUTAGE",
        sourceProvider: "aws", sourceEnvironment: "cloud",
        affectedWorkloads: ["analytics-pipeline", "reporting-service"],
      },
      "latency-spike": {
        trigger: "LATENCY_SPIKE",
        sourceProvider: "azure", sourceEnvironment: "cloud",
        affectedWorkloads: ["user-service", "auth-gateway"],
      },
    };
    return this.trigger(scenarios[scenario]);
  },
};
