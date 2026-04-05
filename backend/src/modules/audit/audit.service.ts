import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { logError } from "../../lib/logger";

export async function recordAudit(params: {
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        orgId: params.orgId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logError("audit_record_failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

export async function listAuditLogsForOrg(orgId: string, opts: { take: number; skip: number }) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: opts.take,
      skip: opts.skip,
    }),
    prisma.auditLog.count({ where: { orgId } }),
  ]);
  return { items, total };
}
