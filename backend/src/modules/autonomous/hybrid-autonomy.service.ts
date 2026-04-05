import { telemetryService } from "../telemetry/telemetry.service";
import { hybridBrainService } from "../hybrid-brain/hybrid-brain.service";
import { uialService } from "../uial/uial.service";
import { failoverService } from "../hybrid-failover/failover.service";
import type { WorkloadProfile } from "../uial/uial.types";
import { recordOutcome } from "../hybrid-brain/placement-engine";

type LoopStep = "OBSERVE" | "ANALYZE" | "DECIDE" | "ACT" | "VERIFY" | "LEARN";
type HybridRunEvent =
  | { type: "hybrid_run_started"; runId: string; at: string; workloadId: string; workloadName: string }
  | { type: "hybrid_run_step"; runId: string; at: string; step: LoopStep; message: string }
  | { type: "hybrid_run_completed"; runId: string; at: string; verified: boolean }
  | { type: "hybrid_run_failed"; runId: string; at: string; error: string };

const listeners = new Set<(ev: HybridRunEvent) => void>();
const emit = (ev: HybridRunEvent) => {
  for (const l of listeners) l(ev);
};

export const hybridAutonomyService = {
  subscribe(handler: (ev: HybridRunEvent) => void) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  },
  async run(input: {
    runId?: string;
    workload: WorkloadProfile;
    currentProvider?: "aws" | "azure" | "gcp" | "baremetal" | "vmware" | "k8s-onprem";
    currentEnvironment?: "cloud" | "onprem" | "hybrid";
    clusterId?: string;
    namespace?: string;
    deploymentName?: string;
    replicas?: number;
  }) {
    const runId = input.runId || `hyr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      const startedAt = new Date().toISOString();
      const timeline: Array<{ step: LoopStep; at: string; message: string }> = [];
      emit({ type: "hybrid_run_started", runId, at: startedAt, workloadId: input.workload.id, workloadName: input.workload.name });
      const tick = (step: LoopStep, message: string) => {
        const at = new Date().toISOString();
        timeline.push({ step, at, message });
        emit({ type: "hybrid_run_step", runId, at, step, message });
      };

      tick("OBSERVE", "Collecting normalized telemetry from cloud and on-prem agents.");
      const aggregate = await telemetryService.collect();
      const alerts = await telemetryService.alerts(20);

    tick("ANALYZE", "Assessing placement constraints: latency, compliance, cost, and capacity.");
    const decision = await hybridBrainService.decide(input.workload);

    tick("DECIDE", `Selected ${decision.targetProvider}/${decision.targetEnvironment} with confidence ${Math.round(decision.confidence * 100)}%.`);

    let action: Record<string, unknown>;
    const currentProvider = input.currentProvider;
    const currentEnvironment = input.currentEnvironment;
    const needMigration = Boolean(
      currentProvider &&
      currentEnvironment &&
      (currentProvider !== decision.targetProvider || currentEnvironment !== decision.targetEnvironment)
    );

    if (needMigration) {
      tick("ACT", "Executing autonomous workload migration to the selected target.");
      const migration = await hybridBrainService.migrate(
        input.workload.id,
        input.workload.name,
        currentProvider as any,
        {
          fromProvider: currentProvider as any,
          fromEnvironment: currentEnvironment as any,
          toProvider: decision.targetProvider as any,
          toEnvironment: decision.targetEnvironment as any,
          reason: decision.reasons[0] ?? "default",
        }
      );
      action = { type: "migration", migration };
    } else {
      tick("ACT", "Executing deployment action on target Kubernetes runtime.");
      const namespace = input.namespace ?? "default";
      const deploymentName = input.deploymentName ?? input.workload.name.toLowerCase().replace(/\s+/g, "-");
      const clusterId = input.clusterId ?? `${decision.targetProvider}-cluster-1`;
      const deploy = await uialService.kubeCreate({
        provider: decision.targetProvider as any,
        clusterId,
        namespace,
        deploymentName,
        replicas: input.replicas ?? 2,
        strategy: "rolling",
      });
      action = { type: "kubernetes_deploy", deploy };
    }

    let failover: unknown = null;
    const critical = alerts.find((a) => a.severity === "critical");
    if (critical) {
      tick("ACT", "Critical signal detected. Triggering autonomous failover policy.");
      failover = await failoverService.trigger({
        trigger: critical.environment === "onprem" ? "ONPREM_NODE_CRASH" : "CLOUD_REGION_OUTAGE",
        sourceProvider: critical.provider as any,
        sourceEnvironment: critical.environment as any,
        affectedWorkloads: [input.workload.name],
      });
    }

    tick("VERIFY", "Verifying health state after action.");
    const post = await telemetryService.collect();
    const verified = post.avgErrorRate <= aggregate.avgErrorRate + 0.5;

    tick("LEARN", "Recording action outcome into autonomous memory.");
    recordOutcome({
      id: `learn-${Date.now()}`,
      workloadProfile: {
        dataLocality: input.workload.dataLocality,
        compliance: input.workload.compliance,
        latencySensitive: input.workload.latencySensitive,
        burstable: input.workload.burstable,
      },
      provider: decision.targetProvider,
      outcome: verified ? "success" : "suboptimal",
      avgCost: post.totalCostPerHour,
      avgLatency: post.avgLatency,
      recordedAt: new Date().toISOString(),
    });

      const completedAt = new Date().toISOString();
      emit({ type: "hybrid_run_completed", runId, at: completedAt, verified });
      return {
        runId,
        startedAt,
        completedAt,
        autonomous: true,
        decision,
        action,
        failover,
        verification: {
          verified,
          before: { avgLatency: aggregate.avgLatency, avgErrorRate: aggregate.avgErrorRate, costPerHour: aggregate.totalCostPerHour },
          after: { avgLatency: post.avgLatency, avgErrorRate: post.avgErrorRate, costPerHour: post.totalCostPerHour },
        },
        timeline,
      };
    } catch (error) {
      emit({
        type: "hybrid_run_failed",
        runId,
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown hybrid autonomy error",
      });
      throw error;
    }
  },
};

