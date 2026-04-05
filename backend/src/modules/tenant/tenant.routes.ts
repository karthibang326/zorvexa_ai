import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export async function tenantRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/summary",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
      if (!scope?.orgId || !scope.projectId || !scope.envId) {
        return reply.code(400).send({ error: "Missing tenant scope" });
      }

      const org = await prisma.organization.findUnique({ where: { id: scope.orgId } });
      if (!org) return reply.code(404).send({ error: "Organization not found" });

      const [deploymentCount, sreActionCount, auditCount] = await Promise.all([
        prisma.deployment.count({
          where: {
            orgId: scope.orgId,
            projectId: scope.projectId,
            environment: scope.envId,
          },
        }),
        prisma.sREAction.count({ where: { orgId: scope.orgId } }),
        prisma.auditLog.count({ where: { orgId: scope.orgId } }),
      ]);

      const healthScore = Math.min(
        99,
        Math.max(
          52,
          78 + Math.min(20, Math.floor(deploymentCount / 2)) - Math.min(15, sreActionCount % 8)
        )
      );

      return {
        tenant: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          billingPlan: org.billingPlan,
        },
        scope: {
          orgId: scope.orgId,
          projectId: scope.projectId,
          envId: scope.envId,
        },
        healthScore,
        counts: {
          deployments: deploymentCount,
          sreActions: sreActionCount,
          auditEvents: auditCount,
        },
        aiActivity: {
          decisions24h: Math.min(500, sreActionCount * 3 + deploymentCount * 2),
          automationsApplied: Math.min(200, deploymentCount + Math.floor(sreActionCount / 2)),
        },
      };
    }
  );

  app.get(
    "/billing",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string } | undefined;
      if (!scope?.orgId) return reply.code(400).send({ error: "Missing tenant scope" });

      const org = await prisma.organization.findUnique({ where: { id: scope.orgId } });
      if (!org) return reply.code(404).send({ error: "Organization not found" });

      return {
        tenantId: org.id,
        plan: org.billingPlan,
        monthlySpendUsd: org.monthlySpendUsd,
        aiSavingsUsd: org.aiSavingsUsd,
        netEffectiveUsd: Math.max(0, org.monthlySpendUsd - org.aiSavingsUsd),
      };
    }
  );
}
