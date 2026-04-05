import { prisma } from "../../lib/prisma";
import { createHash } from "crypto";

export async function auditAiAction(input: {
  orgId: string;
  projectId: string;
  environment: string;
  module: string;
  action: string;
  reason: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  simulation?: string;
  status: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}) {
  const prismaAny = prisma as any;
  const latest = await prismaAny.sREAction.findFirst({
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const prevHash = String((latest?.metadata as any)?.hash ?? "");
  const chainPayload = JSON.stringify({
    prevHash,
    orgId: input.orgId,
    projectId: input.projectId,
    environment: input.environment,
    module: input.module,
    action: input.action,
    status: input.status,
    outcome: input.outcome,
    at: new Date().toISOString(),
  });
  const hash = createHash("sha256").update(chainPayload).digest("hex");

  await prismaAny.sREAction.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      environment: input.environment,
      action: `${input.module}:${input.action}`,
      resource: "ai-orchestrator",
      status: input.status,
      result: input.outcome,
      riskScore: input.risk === "high" ? 0.9 : input.risk === "medium" ? 0.6 : 0.3,
      confidence: input.confidence,
      metadata: {
        immutable: true,
        prevHash,
        hash,
        reason: input.reason,
        risk: input.risk,
        simulation: input.simulation ?? "not-run",
        timestamp: new Date().toISOString(),
        ...(input.metadata ?? {}),
      },
    },
  });
}

