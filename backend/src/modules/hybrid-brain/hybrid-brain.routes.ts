import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { hybridBrainService } from "./hybrid-brain.service";

const WorkloadProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dataLocality: z.enum(["onprem-only", "cloud-ok", "region-restricted"]),
  compliance: z.array(z.enum(["GDPR", "HIPAA", "PCI-DSS", "SOC2", "INTERNAL"])),
  latencySensitive: z.boolean(),
  burstable: z.boolean(),
  cpuRequest: z.number().min(0),
  memoryRequest: z.number().min(0),
  priorityClass: z.enum(["critical", "high", "normal", "low"]),
});

const ProviderSchema = z.enum(["aws", "azure", "gcp", "baremetal", "vmware", "k8s-onprem"]);
const EnvSchema = z.enum(["cloud", "onprem", "hybrid"]);

export async function hybridBrainRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /** AI placement decision for a workload */
  app.post("/decide", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const schema = z.object({
      workload: WorkloadProfileSchema,
      forceOnPrem: z.boolean().optional(),
      forceCloud: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const decision = await hybridBrainService.decide(parsed.data.workload, {
      forceOnPrem: parsed.data.forceOnPrem,
      forceCloud: parsed.data.forceCloud,
    });
    return { decision };
  });

  /** Live infra snapshot across all providers */
  app.get("/snapshot", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    const snapshots = await hybridBrainService.snapshot();
    return { snapshots };
  });

  /** Trigger a workload migration */
  app.post("/migrate", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      workloadId: z.string().min(1),
      workloadName: z.string().min(1),
      fromProvider: ProviderSchema,
      fromEnvironment: EnvSchema,
      toProvider: ProviderSchema,
      toEnvironment: EnvSchema,
      reason: z.enum([
        "data-locality", "compliance", "cost-optimise", "burst-traffic",
        "latency", "onprem-failure", "cloud-outage", "resource-pressure",
        "learning", "default",
      ]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    const migration = await hybridBrainService.migrate(
      parsed.data.workloadId,
      parsed.data.workloadName,
      null as any, // internal overload
      {
        fromProvider: parsed.data.fromProvider,
        fromEnvironment: parsed.data.fromEnvironment,
        toProvider: parsed.data.toProvider,
        toEnvironment: parsed.data.toEnvironment,
        reason: parsed.data.reason,
      },
    );
    return { migration };
  });

  /** List recent migrations */
  app.get("/migrations", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req) => {
    const { limit } = req.query as { limit?: string };
    return { migrations: hybridBrainService.listMigrations(limit ? Number(limit) : 50) };
  });

  /** Get single migration */
  app.get("/migrations/:migrationId", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const { migrationId } = req.params as { migrationId: string };
    const m = hybridBrainService.getMigration(migrationId);
    if (!m) return reply.code(404).send({ error: "Migration not found" });
    return { migration: m };
  });
}
