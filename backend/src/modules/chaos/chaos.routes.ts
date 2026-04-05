import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { listChaosExperiments, runChaosExperiment } from "./chaos.service";

const ChaosSchema = z.object({
  type: z.enum(["cpu_spike", "memory_leak", "pod_kill", "network_latency"]),
  target: z.string().min(1),
  duration: z.coerce.number().int().positive().max(1800),
  deploymentId: z.string().optional(),
  approvalMode: z.enum(["auto", "manual"]).optional(),
});

export async function chaosRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/run",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = ChaosSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const out = await runChaosExperiment(parsed.data, (request as any).authUser?.email);
        return reply.code(202).send(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to run chaos experiment";
        return reply.code(400).send({ error: msg });
      }
    }
  );

  app.get(
    "/history",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 50);
      return { items: await listChaosExperiments(limit) };
    }
  );
}

