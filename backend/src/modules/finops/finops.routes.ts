import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { attachFinopsListener } from "./finops.stream";
import { finopsService } from "./finops.service";

export async function finopsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/cost", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    const data = await finopsService.cost();
    return { records: data };
  });

  app.get("/anomaly", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return finopsService.anomaly();
  });

  app.get("/predict", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return finopsService.predict();
  });

  app.post("/optimize", { preHandler: requireRole(["admin", "operator"]) }, async () => {
    return finopsService.optimize();
  });

  app.post("/enforce", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const schema = z.object({
      threshold: z.number().positive().optional(),
      provider: z.enum(["aws", "gcp", "azure"]).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return finopsService.enforce(parsed.data);
  });

  app.get("/stream", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const write = (payload: Record<string, unknown>) => {
      reply.raw.write("event: update\n");
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    write({ type: "finops_stream_ready" });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const detach = attachFinopsListener((event) => write(event));
    request.raw.on("close", () => {
      clearInterval(hb);
      detach();
    });

    return reply;
  });
}

