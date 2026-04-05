import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { securityService } from "./security.service";

const RoleSchema = z.enum(["owner", "admin", "viewer"]);

export async function securityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/compliance",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async () => {
      return securityService.getComplianceStatus();
    }
  );

  app.post(
    "/rbac/map",
    { preHandler: requireRole(["owner", "admin"]) },
    async (request, reply) => {
      const schema = z.object({
        userId: z.string().min(1),
        role: RoleSchema,
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return securityService.setUserRole(parsed.data.userId, parsed.data.role);
    }
  );

  app.get(
    "/rbac/map/:userId",
    { preHandler: requireRole(["owner", "admin", "auditor"]) },
    async (request) => {
      const userId = String((request.params as any)?.userId ?? "");
      return {
        userId,
        role: securityService.getMappedRole(userId),
      };
    }
  );
}

