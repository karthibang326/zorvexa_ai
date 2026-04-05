import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { listAuditLogsForOrg } from "./audit.service";

export async function auditRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/logs",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string } | undefined;
      const orgId = scope?.orgId;
      if (!orgId) return reply.code(400).send({ error: "Missing tenant scope" });

      const take = Math.min(200, Math.max(1, Number((request.query as any)?.limit ?? 50)));
      const skip = Math.max(0, Number((request.query as any)?.offset ?? 0));

      const out = await listAuditLogsForOrg(orgId, { take, skip });
      return out;
    }
  );
}
