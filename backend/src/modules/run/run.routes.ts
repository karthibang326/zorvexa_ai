import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { runService } from "./run.service";
import { TriggerRunSchema } from "./run.schemas";
import { attachRunStream } from "./run.stream";

export async function runRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/trigger",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = TriggerRunSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const run = await runService.trigger(parsed.data);
        return reply.code(202).send(run);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to trigger run";
        const status = msg.toLowerCase().includes("not found") ? 404 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/:id/retry",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      try {
        const run = await runService.retry((request.params as any).id);
        return reply.code(202).send(run);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to retry run";
        const status = msg.toLowerCase().includes("not found") ? 404 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.get("/", async (_request, reply) => {
    try {
      return { items: await runService.list() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to list runs";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      return await runService.get((request.params as any).id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get run";
      const status = msg.toLowerCase().includes("not found") ? 404 : 500;
      return reply.code(status).send({ error: msg });
    }
  });

  app.get("/:id/stream", async (request, reply) => {
    attachRunStream((request.params as any).id, reply);
    return reply;
  });
}

