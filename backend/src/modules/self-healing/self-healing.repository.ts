import { prisma } from "../../lib/prisma";
import { usePrismaPersistence } from "../../lib/prisma-env";

type SelfHealingEventRow = {
  id: string;
  runId: string | null;
  type: string;
  status: string;
  details: unknown;
  createdAt: Date;
};

const mem: SelfHealingEventRow[] = [];

function hasDb() {
  return usePrismaPersistence();
}

export const selfHealingRepository = {
  async create(data: {
    runId?: string;
    type: "DETECT" | "ANALYZE" | "DECIDE" | "ACT" | "VERIFY";
    status: string;
    details: unknown;
  }) {
    if (!hasDb()) {
      const row: SelfHealingEventRow = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        runId: data.runId ?? null,
        type: data.type,
        status: data.status,
        details: data.details,
        createdAt: new Date(),
      };
      mem.unshift(row);
      return row;
    }
    return prisma.selfHealingEvent.create({
      data: {
        runId: data.runId,
        type: data.type,
        status: data.status,
        details: data.details as any,
      },
    });
  },

  async list(limit = 100) {
    if (!hasDb()) return mem.slice(0, limit);
    return prisma.selfHealingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async countActionsInLastHour() {
    if (!hasDb()) {
      const since = Date.now() - 60 * 60 * 1000;
      return mem.filter((e) => e.type === "ACT" && e.createdAt.getTime() >= since).length;
    }
    const since = new Date(Date.now() - 60 * 60 * 1000);
    return prisma.selfHealingEvent.count({
      where: {
        type: "ACT",
        createdAt: { gte: since },
      },
    });
  },
};

