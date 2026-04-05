import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

export type ChaosType = "cpu_spike" | "memory_leak" | "pod_kill" | "network_latency";

export interface ChaosRunInput {
  type: ChaosType;
  target: string;
  duration: number;
  deploymentId?: string;
  approvalMode?: "auto" | "manual";
}

function getImpact(type: ChaosType) {
  if (type === "cpu_spike") return { cpu: "+70%", latency: "+15%", errors: "+0.1%" };
  if (type === "memory_leak") return { memory: "+80%", oomRisk: "medium", errors: "+0.2%" };
  if (type === "pod_kill") return { availabilityDip: "transient", restart: true, errors: "+0.3%" };
  return { latency: "+180ms", packetLoss: "0.5%", errors: "+0.1%" };
}

export async function runChaosExperiment(input: ChaosRunInput, createdBy?: string) {
  const duration = Math.max(10, Math.min(1800, Math.floor(input.duration)));
  const maxRunsPerHour = Math.max(1, Math.floor(env.SELF_HEAL_MAX_ACTIONS_PER_HOUR / 2));
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const runsInHour = await prisma.chaosExperiment.count({
    where: { startedAt: { gte: since } },
  });
  if (runsInHour >= maxRunsPerHour) {
    throw new Error("Chaos run rate limit reached for this hour");
  }

  const approvalMode = input.approvalMode ?? env.SELF_HEAL_APPROVAL_MODE;
  const status = approvalMode === "manual" ? "PENDING_APPROVAL" : "RUNNING";

  const experiment = await prisma.chaosExperiment.create({
    data: {
      deploymentId: input.deploymentId,
      type: input.type,
      target: input.target,
      durationSec: duration,
      status,
      approvalMode,
      createdBy: createdBy ?? "system",
      impactSummary: status === "RUNNING" ? ({ simulated: true, ...getImpact(input.type) } as any) : ({ awaitingApproval: true } as any),
    },
  });

  if (status === "RUNNING") {
    setTimeout(async () => {
      await prisma.chaosExperiment.update({
        where: { id: experiment.id },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
    }, duration * 1000);
  }

  return {
    id: experiment.id,
    type: experiment.type,
    target: experiment.target,
    status: experiment.status,
    durationSec: experiment.durationSec,
    startedAt: experiment.startedAt.toISOString(),
  };
}

export async function listChaosExperiments(limit = 50) {
  const items = await prisma.chaosExperiment.findMany({
    orderBy: { startedAt: "desc" },
    take: Math.max(1, Math.min(200, limit)),
  });
  return items.map((x) => ({
    id: x.id,
    type: x.type,
    target: x.target,
    status: x.status,
    durationSec: x.durationSec,
    startedAt: x.startedAt.toISOString(),
    finishedAt: x.finishedAt?.toISOString() ?? null,
    impactSummary: x.impactSummary,
  }));
}

