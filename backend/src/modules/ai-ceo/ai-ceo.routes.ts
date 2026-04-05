import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import {
  disableAICeo,
  enableAICeo,
  getAICeoDecisionLog,
  getAICeoState,
  optimizeAllSystems,
  pauseAICeo,
  scaleAllCriticalServices,
  stabilizeSystem,
  subscribeAICeo,
} from "./ai-ceo.service";

const EnableSchema = z.object({
  approvalMode: z.boolean().optional(),
  maxActionsPerHour: z.number().int().positive().max(100).optional(),
  rollbackEnabled: z.boolean().optional(),
});

export async function aiCeoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/enable", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const parsed = EnableSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return reply.send(enableAICeo(parsed.data));
  });

  app.post("/disable", { preHandler: requireRole(["admin", "operator"]) }, async () => disableAICeo());
  app.post("/pause", { preHandler: requireRole(["admin", "operator"]) }, async () => pauseAICeo());

  app.get("/status", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => getAICeoState());
  app.get("/decisions", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (request) => {
    const limit = Number((request.query as { limit?: string })?.limit ?? 100);
    return { items: getAICeoDecisionLog(limit) };
  });

  app.post("/control/optimize-all", { preHandler: requireRole(["admin", "operator"]) }, async () => optimizeAllSystems());
  app.post("/control/scale-critical", { preHandler: requireRole(["admin", "operator"]) }, async () => scaleAllCriticalServices());
  app.post("/control/stabilize", { preHandler: requireRole(["admin", "operator"]) }, async () => stabilizeSystem());

  app.get("/stream", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const write = (payload: Record<string, unknown>) => {
      reply.raw.write(`event: ${String(payload.type ?? "update")}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    write({ type: "ai_ceo_stream_ready", ts: Date.now() });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const unsub = subscribeAICeo((ev) => write(ev as unknown as Record<string, unknown>));
    request.raw.on("close", () => {
      clearInterval(hb);
      unsub();
    });
    return reply;
  });
}
