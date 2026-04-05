import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { logError } from "../../lib/logger";
import { unloadPluginsForOrg } from "../plugins/plugin.loader";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(80),
});

const CreateProjectSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2).max(80),
});

const CreateEnvironmentSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2).max(80),
});

async function deleteOrganizationCascade(orgId: string) {
  await unloadPluginsForOrg(orgId);
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { orgId } });
    await tx.environmentPolicy.deleteMany({ where: { orgId } });
    await tx.installedPlugin.deleteMany({ where: { orgId } });
    await tx.sREAction.deleteMany({ where: { orgId } });
    await tx.aiDecisionRun.deleteMany({ where: { orgId } });
    await tx.aiLearning.deleteMany({ where: { orgId } });
    await tx.agentExperience.deleteMany({ where: { orgId } });
    await tx.deployment.deleteMany({ where: { orgId } });
    const projects = await tx.project.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length) {
      await tx.environment.deleteMany({ where: { projectId: { in: projectIds } } });
    }
    await tx.membership.deleteMany({ where: { organizationId: orgId } });
    await tx.project.deleteMany({ where: { organizationId: orgId } });
    await tx.organization.delete({ where: { id: orgId } });
  });
}

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/hierarchy",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const user = (request as any).authUser as { id?: string } | undefined;
      const userId = String(user?.id ?? "");
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const memberships = await prisma.membership.findMany({
        where: { userId },
        select: { organizationId: true, role: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);
      if (!orgIds.length) {
        return { organizations: [] };
      }

      const organizations = await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        orderBy: { createdAt: "desc" },
      });
      const projects = await prisma.project.findMany({
        where: { organizationId: { in: orgIds } },
      });
      const projectIds = projects.map((p) => p.id);
      const environments = projectIds.length
        ? await prisma.environment.findMany({ where: { projectId: { in: projectIds } } })
        : [];

      return {
        organizations: organizations.map((org) => ({
          ...org,
          role: memberships.find((m) => m.organizationId === org.id)?.role ?? "VIEWER",
          projects: projects
            .filter((p) => p.organizationId === org.id)
            .map((p) => ({
              ...p,
              environments: environments.filter((e) => e.projectId === p.id),
            })),
        })),
      };
    }
  );

  app.post(
    "/organizations",
    { preHandler: requireRole(["owner", "admin"]) },
    async (request, reply) => {
      const parsed = CreateOrgSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const user = (request as any).authUser as { id?: string } | undefined;
      const userId = String(user?.id ?? "");
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      try {
        const org = await prisma.organization.create({
          data: {
            name: parsed.data.name,
            ownerId: userId,
          },
        });

        await prisma.membership.create({
          data: {
            userId,
            organizationId: org.id,
            role: "OWNER",
          },
        });

        return reply.code(201).send({ organization: org });
      } catch (e) {
        logError("org_create_failed", { message: e instanceof Error ? e.message : String(e) });
        return reply.code(503).send({
          error: "Database unavailable or schema out of date",
          details: e instanceof Error ? e.message : String(e),
          hint: "Ensure PostgreSQL is running and run: cd backend && npx prisma migrate deploy",
        });
      }
    }
  );

  app.post(
    "/projects",
    { preHandler: requireRole(["owner", "admin"]) },
    async (request, reply) => {
      const parsed = CreateProjectSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const project = await prisma.project.create({
          data: {
            organizationId: parsed.data.orgId,
            name: parsed.data.name,
          },
        });

        return reply.code(201).send({ project });
      } catch (e) {
        logError("project_create_failed", { message: e instanceof Error ? e.message : String(e) });
        return reply.code(503).send({
          error: "Database unavailable or invalid organization",
          details: e instanceof Error ? e.message : String(e),
        });
      }
    }
  );

  app.post(
    "/environments",
    { preHandler: requireRole(["owner", "admin"]) },
    async (request, reply) => {
      const parsed = CreateEnvironmentSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const environment = await prisma.environment.create({
          data: {
            projectId: parsed.data.projectId,
            name: parsed.data.name,
          },
        });

        return reply.code(201).send({ environment });
      } catch (e) {
        logError("environment_create_failed", { message: e instanceof Error ? e.message : String(e) });
        return reply.code(503).send({
          error: "Database unavailable or invalid project",
          details: e instanceof Error ? e.message : String(e),
        });
      }
    }
  );

  app.delete("/organizations/:id", async (request, reply) => {
    const user = (request as any).authUser as { id?: string } | undefined;
    const userId = String(user?.id ?? "");
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const id = String((request.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.code(400).send({ error: "Missing organization id" });

    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: id },
    });
    if (!membership || membership.role !== "OWNER") {
      return reply.code(403).send({ error: "Only the organization owner can delete this workspace" });
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    try {
      await deleteOrganizationCascade(id);
      return reply.code(204).send();
    } catch (e) {
      logError("org_delete_failed", { message: e instanceof Error ? e.message : String(e), orgId: id });
      return reply.code(503).send({
        error: "Could not delete organization",
        details: e instanceof Error ? e.message : String(e),
      });
    }
  });
}

