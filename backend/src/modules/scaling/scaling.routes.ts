import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { autoScale } from "./scaling.service";

const ScaleSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure"]),
  deploymentName: z.string().min(1),
  namespace: z.string().optional(),
  predictedLoad: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  manualOverride: z.boolean().optional(),
});

export async function scalingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/auto",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = ScaleSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        return reply.send(await autoScale(parsed.data));
      } catch (e) {
        return reply.code(400).send({ error: e instanceof Error ? e.message : "Failed to auto-scale" });
      }
    }
  );
}

