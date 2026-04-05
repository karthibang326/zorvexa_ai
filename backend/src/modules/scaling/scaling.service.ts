import { env } from "../../config/env";
import { cloudService } from "../cloud/cloud.service";
import { prisma } from "../../lib/prisma";

export async function autoScale(input: {
  provider: "aws" | "gcp" | "azure";
  deploymentName: string;
  namespace?: string;
  predictedLoad?: number;
  confidence?: number;
  manualOverride?: boolean;
}) {
  const confidence = Number(input.confidence ?? 0.9);
  if (confidence < 0.55) throw new Error("Confidence below autonomous threshold");

  const actionsInHour = await prisma.autonomousAction.count({
    where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (actionsInHour >= env.SELF_HEAL_MAX_ACTIONS_PER_HOUR) {
    throw new Error("Autonomous action budget exceeded for current hour");
  }

  const predictedLoad = Number(input.predictedLoad ?? 0.5);
  const replicas = predictedLoad > 0.75 ? 6 : predictedLoad < 0.35 ? 2 : 4;
  const result = await cloudService.execute({
    provider: input.provider,
    operation: "scaleDeployment",
    deploymentName: input.deploymentName,
    namespace: input.namespace,
    replicas,
  } as any);

  const rec = await prisma.autonomousAction.create({
    data: {
      type: "scale_deployment",
      decision: predictedLoad > 0.75 ? "scale_up" : predictedLoad < 0.35 ? "scale_down" : "stabilize",
      confidence,
      status: "EXECUTED",
      manualOverride: Boolean(input.manualOverride),
      metadata: { provider: input.provider, deploymentName: input.deploymentName, namespace: input.namespace, replicas, result } as any,
    },
  });

  return { actionId: rec.id, status: rec.status, replicas, result };
}

