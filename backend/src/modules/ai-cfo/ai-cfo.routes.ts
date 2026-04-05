import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { aiCfoService } from "./ai-cfo.service";

export async function aiCfoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/enable", { preHandler: requireRole(["admin", "operator"]) }, async () => {
    return aiCfoService.enable();
  });

  app.post("/disable", { preHandler: requireRole(["admin", "operator"]) }, async () => {
    return aiCfoService.disable();
  });

  app.get("/status", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return aiCfoService.getState();
  });

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

    write({ type: "ai_cfo_stream_ready", ts: Date.now() });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const detach = aiCfoService.subscribe((event) => write(event as unknown as Record<string, unknown>));

    request.raw.on("close", () => {
      clearInterval(hb);
      detach();
    });
    return reply;
  });
}

