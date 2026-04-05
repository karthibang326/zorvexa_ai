import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { optimizeCostPerformance } from "./optimizer.service";

const OptimizeSchema = z.object({
  latencyTargetMs: z.number().positive().optional(),
  providers: z.array(z.enum(["aws", "gcp", "azure"])).optional(),
});

export async function optimizerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.post(
    "/",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = OptimizeSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return reply.send(await optimizeCostPerformance(parsed.data));
    }
  );
}

