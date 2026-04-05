import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { listIncidents, subscribeIncidentStream, triggerIncident } from "./incident.service";

const IncidentTriggerSchema = z.object({
  source: z.enum(["deploy_failure", "run_failure", "metrics_anomaly", "chaos_experiment"]),
  issue: z.string().min(1),
  deploymentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function incidentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/trigger",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = IncidentTriggerSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return reply.code(202).send(await triggerIncident(parsed.data));
    }
  );

  app.get(
    "/history",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const limit = Number((request.query as any)?.limit ?? 100);
      return await listIncidents(limit);
    }
  );

  app.get(
    "/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const write = (payload: Record<string, unknown>) => {
        reply.raw.write(`event: ${String(payload.type ?? "update")}\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      write({ type: "incident_stream_ready", ts: Date.now() });
      const heartbeat = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
      const detach = subscribeIncidentStream((event) => write(event as any));

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        detach();
      });
      return reply;
    }
  );
}

