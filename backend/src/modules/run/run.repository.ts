import { prisma } from "../../lib/prisma";

export const runRepository = {
  findByIdempotencyKey: (idempotencyKey: string) =>
    prisma.run.findUnique({ where: { idempotencyKey } }),

  create: (data: {
    workflowId: string;
    workflowVersion: number;
    idempotencyKey: string;
    status: string;
    attempt?: number;
  }) =>
    prisma.run.create({
      data: {
        workflowId: data.workflowId,
        workflowVersion: data.workflowVersion,
        idempotencyKey: data.idempotencyKey,
        status: data.status,
        attempt: data.attempt ?? 1,
      },
    }),

  list: () => prisma.run.findMany({ orderBy: { createdAt: "desc" } }),

  get: (id: string) =>
    prisma.run.findUnique({
      where: { id },
      include: { stepLogs: { orderBy: { createdAt: "asc" } } },
    }),

  updateStatus: (
    id: string,
    data: {
      status: string;
      errorMessage?: string | null;
      startedAt?: Date | null;
      finishedAt?: Date | null;
      attempt?: number;
    }
  ) =>
    prisma.run.update({
      where: { id },
      data,
    }),

  createStepLog: (data: {
    runId: string;
    stepId: string;
    stepName: string;
    stepType: string;
    status: string;
    message?: string;
    attempt?: number;
    startedAt?: Date;
    endedAt?: Date;
  }) => prisma.runStepLog.create({ data }),
};

