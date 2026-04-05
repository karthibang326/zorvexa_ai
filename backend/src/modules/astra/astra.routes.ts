import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { astraService } from "./astra.service";
import { subscribeAstraBus, getRecentAstraEvents, type AstraEnvelope } from "../astra-bus/astra-bus";

const MetricsSchema = z.object({
  cpu: z.number().optional(),
  latency: z.number().optional(),
  errorRate: z.number().optional(),
  cost: z.number().optional(),
});

const DecideSchema = z.object({
  state: MetricsSchema,
  manualApproval: z.boolean().optional(),
});

const SimulateSchema = z.object({
  action: z.string().min(1),
  replicas: z.number().int().min(1).max(50).optional(),
  resource: z.string().optional(),
  state: MetricsSchema,
});

const PredictSchema = z.object({
  state: MetricsSchema,
});

export async function astraRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/decide",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = DecideSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      return astraService.decide(parsed.data, {
        orgId: scope.orgId,
        projectId: scope.projectId,
        envId: scope.envId,
      });
    }
  );

  app.post(
    "/simulate",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = SimulateSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return astraService.simulate(parsed.data);
    }
  );

  app.post(
    "/predict",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = PredictSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return astraService.predict(parsed.data.state);
    }
  );

  /** SSE tap on the in-process bus (Kafka-compatible topic names in payload.topic) */
  app.get(
    "/bus/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const write = (ev: AstraEnvelope) => {
        reply.raw.write(`event: ${ev.topic.replace(/\./g, "_")}\n`);
        reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
      };

      for (const ev of getRecentAstraEvents(80)) {
        write(ev);
      }

      const unsub = subscribeAstraBus(write);
      const hb = setInterval(() => {
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 20000);

      request.raw.on("close", () => {
        clearInterval(hb);
        unsub();
      });
      return reply;
    }
  );
}
