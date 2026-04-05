import { prisma } from "../../lib/prisma";
import { getWorkflowRuntimeQueue } from "../../lib/queue";
import type { RuntimeContext, RuntimeMode } from "../../core/workflow/runtime/types";

export const workflowRuntimeService = {
  async execute(input: {
    workflowId: string;
    mode: RuntimeMode;
    context: RuntimeContext;
    idempotencyKey: string;
  }) {
    const prismaAny = prisma as any;
    const wf = await prismaAny.workflow.findUnique({ where: { id: input.workflowId } });
    if (!wf) throw new Error("Workflow not found");

    const existing = await prismaAny.run.findFirst({
      where: {
        workflowId: input.workflowId,
        idempotencyKey: input.idempotencyKey,
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { workflowId: input.workflowId, runId: existing.id, status: existing.status };

    const run = await prismaAny.run.create({
      data: {
        workflowId: input.workflowId,
        workflowVersion: Number(wf.version ?? 1),
        idempotencyKey: input.idempotencyKey,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });
    await getWorkflowRuntimeQueue().add(
      "workflow.runtime.execute",
      {
        runId: run.id,
        workflowId: input.workflowId,
        mode: input.mode,
        context: input.context,
      },
      {
        jobId: run.id,
      }
    );
    return { workflowId: input.workflowId, runId: run.id, status: "RUNNING" as const };
  },

  async approve(input: {
    workflowId: string;
    runId?: string;
    approvedBy: string;
    mode: RuntimeMode;
    context: RuntimeContext;
  }) {
    const prismaAny = prisma as any;
    const pending = input.runId
      ? await prismaAny.run.findFirst({ where: { id: input.runId, workflowId: input.workflowId } })
      : await prismaAny.run.findFirst({
          where: { workflowId: input.workflowId, status: "PENDING_APPROVAL" },
          orderBy: { createdAt: "desc" },
        });
    if (!pending) throw new Error("No pending approval run found");
    await prismaAny.runStepLog.create({
      data: {
        runId: pending.id,
        stepId: "__approval",
        stepName: "Approval",
        stepType: "GATE",
        status: "SUCCESS",
        message: `Approved by ${input.approvedBy}`,
        startedAt: new Date(),
        endedAt: new Date(),
      },
    });
    await prismaAny.run.update({ where: { id: pending.id }, data: { status: "RUNNING" } });
    await getWorkflowRuntimeQueue().add(
      "workflow.runtime.resume",
      {
        runId: pending.id,
        workflowId: input.workflowId,
        mode: input.mode,
        context: { ...input.context, approvalRequired: false },
      },
      { jobId: `resume:${pending.id}:${Date.now()}` }
    );
    return { workflowId: input.workflowId, runId: pending.id, status: "RUNNING" as const };
  },

  async simulate(input: {
    workflowId: string;
    mode: RuntimeMode;
    context: RuntimeContext;
  }) {
    const prismaAny = prisma as any;
    const wf = await prismaAny.workflow.findUnique({
      where: { id: input.workflowId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!wf) throw new Error("Workflow not found");
    const nodes = (wf.versions?.[0]?.nodes as any[]) ?? [];
    const steps = nodes.map((n, i) => {
      const risk = i % 3 === 0 ? "MEDIUM" : "LOW";
      return {
        node: String(n?.id ?? `node-${i}`),
        predictedStatus: input.context.approvalRequired && risk !== "LOW" ? "pending_approval" : "success",
        reason: input.mode === "manual" ? "Manual mode requires explicit operator execution." : "AI predicts successful completion.",
        risk,
        confidence: risk === "LOW" ? 0.86 : 0.71,
        metricsUsed: { cpu: 68 + i, latency: 180 - i * 4, errorRate: 1, cost: 15 + i },
      };
    });
    return {
      workflowId: input.workflowId,
      mode: input.mode,
      simulation: {
        predicted_latency: `${Math.max(80, 220 - steps.length * 10)}ms`,
        cpu_reduction: `${Math.min(35, steps.length * 3)}%`,
        cost_increase: input.context.approvalRequired ? "+4%" : "+1%",
        risk: steps.some((s) => s.risk === "MEDIUM") ? "medium" : "low",
      },
      steps,
    };
  },
};
