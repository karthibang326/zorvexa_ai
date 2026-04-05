import { prisma } from "../../lib/prisma";
import { MetricsState, OpsScope } from "./types";
function stateVector(s: MetricsState): [number, number, number, number] {
  return [
    Number(s.cpu ?? 0) / 100,
    Number(s.latency ?? 0) / 600,
    Number(s.errorRate ?? 0) / 10,
    Number(s.cost ?? 0) / 100,
  ];
}

function l2(a: [number, number, number, number], b: [number, number, number, number]) {
  return Math.sqrt(a.reduce((acc, v, i) => acc + (v - b[i]) ** 2, 0));
}

export const memoryService = {
  async findSimilarExperiences(scope: OpsScope, state: MetricsState, limit = 8) {
    const prismaAny = prisma as any;
    const rows = await prismaAny.agentExperience.findMany({
      where: {
        orgId: scope.orgId,
        status: "COMPLETED",
        reward: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const target = stateVector(state);
    const scored = rows
      .map((r: any) => {
        const st = (r.state ?? {}) as MetricsState;
        const d = l2(target, stateVector(st));
        return { ...r, _distance: d };
      })
      .sort((a: any, b: any) => a._distance - b._distance)
      .slice(0, limit);

    return scored.map((r: any) => ({
      id: r.id,
      action: r.action,
      reward: r.reward,
      distance: Number(r._distance.toFixed(4)),
      state: r.state,
      result: r.result,
    }));
  },

  async getBestHistoricalAction(scope: OpsScope, state: MetricsState) {
    const similar = await this.findSimilarExperiences(scope, state, 12);
    if (!similar.length) return null;
    const byAction = new Map<string, { sum: number; n: number }>();
    for (const s of similar) {
      const k = String(s.action);
      const cur = byAction.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(s.reward ?? 0);
      cur.n += 1;
      byAction.set(k, cur);
    }
    let best: { action: string; avgReward: number } | null = null;
    for (const [action, v] of byAction) {
      const avg = v.sum / v.n;
      if (!best || avg > best.avgReward) best = { action, avgReward: Number(avg.toFixed(4)) };
    }
    return best;
  },

  async getFailedActions(scope: OpsScope, minTrials = 2) {
    const prismaAny = prisma as any;
    const rows = await prismaAny.agentExperience.findMany({
      where: { orgId: scope.orgId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    const stats = new Map<string, { low: number; n: number }>();
    for (const r of rows) {
      const a = String((r as any).action);
      const reward = Number((r as any).reward ?? 0);
      const cur = stats.get(a) ?? { low: 0, n: 0 };
      cur.n += 1;
      if (reward < -0.2) cur.low += 1;
      stats.set(a, cur);
    }
    const blocked = new Set<string>();
    for (const [action, v] of stats) {
      if (v.n >= minTrials && v.low / v.n > 0.5) blocked.add(action);
    }
    return blocked;
  },
};
