import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export const workflowRepository = {
  list: () =>
    prisma.workflow.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      // Batch-include latest version to avoid callers issuing per-row queries (N+1 guard).
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    }),

  create: (data: { name: string; createdBy: string; nodes: Prisma.InputJsonValue; edges: Prisma.InputJsonValue }) =>
    prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: { name: data.name, createdBy: data.createdBy, status: "DRAFT", version: 1 },
      });
      await tx.workflowVersion.create({
        data: { workflowId: wf.id, version: 1, nodes: data.nodes, edges: data.edges },
      });
      return wf;
    }),

  getById: (id: string) =>
    prisma.workflow.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    }),

  saveVersion: (workflowId: string, nodes: Prisma.InputJsonValue, edges: Prisma.InputJsonValue) =>
    prisma.$transaction(async (tx) => {
      const current = await tx.workflow.findUnique({ where: { id: workflowId } });
      if (!current) throw new Error("Workflow not found");
      const nextVersion = current.version + 1;
      await tx.workflowVersion.create({
        data: { workflowId, version: nextVersion, nodes, edges },
      });
      const wf = await tx.workflow.update({
        where: { id: workflowId },
        data: { version: nextVersion, updatedAt: new Date() },
      });
      return wf;
    }),

  findVersion: (workflowId: string, version: number) =>
    prisma.workflowVersion.findFirst({
      where: { workflowId, version },
      orderBy: { createdAt: "desc" },
    }),

  setVersion: (workflowId: string, version: number) =>
    prisma.workflow.update({ where: { id: workflowId }, data: { version, updatedAt: new Date() } }),
};

