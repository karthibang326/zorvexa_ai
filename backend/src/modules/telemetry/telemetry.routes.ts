import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { telemetryService } from "./telemetry.service";

export async function telemetryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /** Full normalised telemetry aggregate from all providers */
  app.get("/collect", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return telemetryService.collect();
  });

  /** Active alerts */
  app.get("/alerts", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req) => {
    const { limit } = req.query as { limit?: string };
    return { alerts: await telemetryService.alerts(limit ? Number(limit) : 100) };
  });

  /** Resolve an alert */
  app.post("/alerts/:alertId/resolve", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const { alertId } = req.params as { alertId: string };
    const ok = telemetryService.resolveAlert(alertId);
    if (!ok) return reply.code(404).send({ error: "Alert not found" });
    return { ok: true, alertId };
  });

  /** SSE stream — pushes a new telemetry snapshot every 30 s */
  app.get("/stream", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const push = async () => {
      try {
        const data = await telemetryService.collect();
        reply.raw.write(`event: telemetry\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: "collect_failed" })}\n\n`);
      }
    };

    await push(); // immediate first push
    const interval = setInterval(push, 30_000);
    const hb = setInterval(() => {
      reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 15_000);

    req.raw.on("close", () => { clearInterval(interval); clearInterval(hb); });
    return reply;
  });
}
