import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { listPredictions, predictFailure } from "./predictor.service";

const PredictSchema = z.object({
  historicalMetrics: z.array(
    z.object({
      ts: z.string(),
      cpu: z.number().optional(),
      memory: z.number().optional(),
      traffic: z.number().optional(),
      errors: z.number().optional(),
    })
  ),
});

export async function predictorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = PredictSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return reply.send(await predictFailure(parsed.data));
    }
  );

  app.get(
    "/history",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 50);
      return { items: await listPredictions(limit) };
    }
  );
}

