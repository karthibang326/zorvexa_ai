import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { realtimeService } from "./realtime.service";
import { getRecentAiStreamEvents } from "../ai-stream/ai-stream.service";
import { prisma } from "../../lib/prisma";
import { getLearningDashboard, listRecentAiLearning } from "../ai-learning/learning.service";

export async function realtimeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/events",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 100);
      return { items: realtimeService.list(limit) };
    }
  );

  app.get(
    "/ai-stream/recent",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 80);
      return { items: getRecentAiStreamEvents(limit) };
    }
  );

  app.get(
    "/ai-decisions/recent",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 50);
      const items = await prisma.aiDecisionRun.findMany({
        orderBy: { createdAt: "desc" },
        take: Math.min(100, Math.max(1, limit)),
      });
      return { items };
    }
  );

  app.get(
    "/ai-learning/dashboard",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request) => {
      const scope = (request as any).scopeContext as { orgId?: string } | undefined;
      const orgId = scope?.orgId;
      const dashboard = await getLearningDashboard(orgId);
      return { dashboard };
    }
  );

  app.get(
    "/ai-learning/recent",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 40);
      const scope = (request as any).scopeContext as { orgId?: string } | undefined;
      const items = await listRecentAiLearning(Math.min(100, Math.max(1, limit)), scope?.orgId);
      return { items };
    }
  );
}

