import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, revokeTokenJti } from "../../lib/auth";
import { recordAudit } from "../audit/audit.service";
import {
  getContextOptions,
  getContextOptionsFromPrisma,
  validateContextForUserAsync,
} from "../../middleware/context";

const SwitchSchema = z.object({
  orgId: z.string().min(1),
  projectId: z.string().min(1),
  envId: z.string().min(1),
});

export async function contextRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/options", async (request, reply) => {
    const userId = String((request as any)?.authUser?.id ?? "");
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });
    let options = await getContextOptionsFromPrisma(userId);
    /** Real SaaS: list only Postgres-backed orgs. Optional legacy mock (dev-only) if explicitly enabled. */
    const allowMock =
      process.env.NODE_ENV !== "production" && process.env.ALLOW_MOCK_CONTEXT_OPTIONS === "true";
    if (!options.length && allowMock) {
      options = getContextOptions(userId);
    }
    return { organizations: options };
  });

  app.post("/switch", async (request, reply) => {
    const userId = String((request as any)?.authUser?.id ?? "");
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = SwitchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { orgId, projectId, envId } = parsed.data;

    const valid = await validateContextForUserAsync(userId, orgId, projectId, envId);
    if (!valid.ok) return reply.code(403).send({ error: valid.error });

    const prevJti = String(((request as any).authUser?.jti ?? (request as any).user?.jti ?? "") || "");
    if (prevJti) revokeTokenJti(prevJti);
    const jti = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const role = valid.role;
    const token = app.jwt.sign({
      sub: userId,
      role: role === "OWNER" || role === "ADMIN" ? "admin" : role === "ENGINEER" ? "operator" : "viewer",
      orgId,
      projectId,
      envId,
      jti,
    });

    void recordAudit({
      orgId,
      userId,
      action: "context.switch",
      resourceType: "workspace",
      resourceId: `${projectId}:${envId}`,
      metadata: { projectId, envId },
    });

    return {
      token,
      context: { orgId, projectId, envId, userId, role },
    };
  });
}

