import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { sreSystemService } from "./sre-system.service";

const MetricsSchema = z.object({
  latencyP95: z.number().optional(),
  cpu: z.number().optional(),
  errorRate: z.number().optional(),
  costDeltaPct: z.number().optional(),
  currentReplicas: z.number().optional(),
});

const EvaluateSchema = z.object({
  resource: z.string().min(1),
  provider: z.enum(["aws", "gcp", "azure"]).default("aws"),
  namespace: z.string().optional(),
  metrics: MetricsSchema,
  force: z.boolean().optional(),
});

export async function sreSystemRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/mode", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return sreSystemService.getMode();
  });

  app.post("/mode", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const parsed = z
      .object({
        aiCeoModeEnabled: z.boolean().optional(),
        approvalRequired: z.boolean().optional(),
        maxActionsPerHour: z.number().int().positive().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return sreSystemService.setMode(parsed.data);
  });

  app.post("/evaluate", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const parsed = EvaluateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const scope = (request as any).scopeContext;
    return sreSystemService.evaluate({ ...parsed.data, scope });
  });

  app.post("/act", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const parsed = EvaluateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const scope = (request as any).scopeContext;
    return sreSystemService.act({ ...parsed.data, scope });
  });

  app.get("/actions", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (request) => {
    const scope = (request as any).scopeContext;
    const limit = Number((request.query as any)?.limit ?? 50);
    return { items: await sreSystemService.listActions(scope, limit) };
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
    write({ type: "sre_stream_ready", ts: Date.now() });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const unsub = sreSystemService.subscribe((ev) => write(ev));
    request.raw.on("close", () => {
      clearInterval(hb);
      unsub();
    });
    return reply;
  });
}

