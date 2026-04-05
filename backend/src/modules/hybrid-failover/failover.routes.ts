import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { failoverService } from "./failover.service";

const ProviderSchema = z.enum(["aws", "azure", "gcp", "baremetal", "vmware", "k8s-onprem"]);
const EnvSchema = z.enum(["cloud", "onprem", "hybrid"]);

export async function failoverRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /** List all failover events */
  app.get("/", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req) => {
    const { limit } = req.query as { limit?: string };
    return { failovers: failoverService.listFailovers(limit ? Number(limit) : 50) };
  });

  /** Get single failover event */
  app.get("/:failoverId", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const { failoverId } = req.params as { failoverId: string };
    const ev = failoverService.getFailover(failoverId);
    if (!ev) return reply.code(404).send({ error: "Failover not found" });
    return { failover: ev };
  });

  /** Manually trigger a failover */
  app.post("/trigger", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      trigger: z.enum([
        "ONPREM_NODE_CRASH", "VMWARE_HOST_FAILURE", "K8S_NODE_NOT_READY",
        "CLOUD_REGION_OUTAGE", "LATENCY_SPIKE", "ERROR_RATE_BREACH",
        "MANUAL_DRILL", "SCHEDULED_TEST",
      ]),
      sourceProvider: ProviderSchema,
      sourceEnvironment: EnvSchema,
      affectedWorkloads: z.array(z.string()).min(1),
      targetProvider: ProviderSchema.optional(),
      targetEnvironment: EnvSchema.optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const ev = await failoverService.trigger(parsed.data as any);
    return { failover: ev };
  });

  /** Run a pre-defined failure scenario (chaos / drill) */
  app.post("/simulate/:scenario", { preHandler: requireRole(["admin"]) }, async (req, reply) => {
    const schema = z.object({ scenario: z.enum(["onprem-crash", "cloud-outage", "latency-spike"]) });
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) return reply.code(400).send({ error: "scenario must be onprem-crash | cloud-outage | latency-spike" });
    const ev = await failoverService.simulateScenario(parsed.data.scenario);
    return { failover: ev };
  });

  /** SSE stream of live failover events */
  app.get("/stream", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    // Replay last 10 events
    const recent = failoverService.listFailovers(10).reverse();
    for (const ev of recent) {
      reply.raw.write(`event: failover_event\ndata: ${JSON.stringify(ev)}\n\n`);
    }

    const unsub = failoverService.onFailoverEvent((ev) => {
      reply.raw.write(`event: failover_event\ndata: ${JSON.stringify(ev)}\n\n`);
    });
    const hb = setInterval(() => {
      reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 20_000);

    req.raw.on("close", () => { clearInterval(hb); unsub(); });
    return reply;
  });
}
