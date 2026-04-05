import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { SelfHealingTriggerSchema } from "./self-healing.schemas";
import { selfHealingService } from "./self-healing.service";
import { attachSelfHealingListener } from "./self-healing.stream";

export async function selfHealingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/trigger",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = SelfHealingTriggerSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await selfHealingService.trigger(parsed.data);
      return reply.send(out);
    }
  );

  app.get(
    "/events",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const stream = String((request.query as any)?.stream ?? "") === "1";
      if (!stream) {
        const limit = Number((request.query as any)?.limit ?? 100);
        return selfHealingService.listEvents(limit);
      }

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const write = (payload: Record<string, unknown>) => {
        reply.raw.write(`event: update\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };
      write({ type: "self_healing_stream_ready" });

      const heartbeat = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15_000);
      const detach = attachSelfHealingListener((event) => write(event));

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        detach();
      });

      return reply;
    }
  );
}

