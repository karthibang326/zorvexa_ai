import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { optimizeSystem } from "./ai-optimizer.service";

const OptimizeSystemSchema = z.object({
  autoMode: z.boolean().optional(),
  safety: z
    .object({
      maxChangesPerHour: z.number().int().positive().max(50).optional(),
      approvalMode: z.boolean().optional(),
    })
    .optional(),
});

export async function aiOptimizerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/system",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = OptimizeSystemSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await optimizeSystem(parsed.data);
      return reply.send(out);
    }
  );
}
