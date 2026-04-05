import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { infraGeneratorService } from "./infra-generator.service";

export async function infraGeneratorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/generate",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const schema = z.object({
        prompt: z.string().min(1),
        dryRun: z.boolean().optional(),
        autoDeploy: z.boolean().optional(),
        approvalGranted: z.boolean().optional(),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await infraGeneratorService.generate(parsed.data);
      return reply.send(out);
    }
  );
}

