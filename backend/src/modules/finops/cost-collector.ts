import { cloudService } from "../cloud/cloud.service";
import { prisma } from "../../lib/prisma";
import { usePrismaPersistence } from "../../lib/prisma-env";

export interface NormalizedCostRecord {
  provider: "aws" | "gcp" | "azure";
  service: string;
  cost: number;
  timestamp: Date;
}

const memoryStore: NormalizedCostRecord[] = [];

export async function collectCostRecords(): Promise<NormalizedCostRecord[]> {
  const metrics = await cloudService.metrics();
  const now = new Date();
  const records: NormalizedCostRecord[] = metrics.map((m) => ({
    provider: m.provider,
    service: m.provider === "aws" ? "EKS" : m.provider === "gcp" ? "GKE" : "AKS",
    cost: Number(m.cost),
    timestamp: now,
  }));

  if (usePrismaPersistence()) {
    try {
      await prisma.costRecord.createMany({
        data: records.map((r) => ({
          provider: r.provider,
          service: r.service,
          cost: r.cost,
          timestamp: r.timestamp,
        })),
      });
    } catch {
      memoryStore.push(...records);
    }
  } else {
    memoryStore.push(...records);
  }

  return records;
}

export async function getCostRecords(limit = 100): Promise<NormalizedCostRecord[]> {
  if (usePrismaPersistence()) {
    try {
      const rows = await prisma.costRecord.findMany({ orderBy: { timestamp: "desc" }, take: limit });
      return rows.map((r) => ({
        provider: r.provider as any,
        service: r.service,
        cost: r.cost,
        timestamp: r.timestamp,
      }));
    } catch {
      return memoryStore.slice(-limit);
    }
  }
  return memoryStore.slice(-limit);
}

