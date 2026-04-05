import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { uialService } from "./uial.service";

const ProviderSchema = z.enum(["aws", "azure", "gcp", "baremetal", "vmware", "k8s-onprem"]);
const EnvSchema = z.enum(["cloud", "onprem", "hybrid"]).optional();

export async function uialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /** List all registered providers + environment */
  app.get("/providers", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return { providers: uialService.providers() };
  });

  /** Health check across every adapter */
  app.get("/health", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    const results = await uialService.healthAll();
    const allHealthy = results.every((r) => (r as any).healthy);
    return { healthy: allHealthy, providers: results };
  });

  /** Unified metrics snapshot (optionally filter by environment) */
  app.get("/metrics", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const env = EnvSchema.safeParse((req.query as any).env);
    const metrics = await uialService.metricsAll(env.success ? env.data : undefined);
    return reply.send({ metrics });
  });

  /** Create compute resource on any provider */
  app.post("/compute/create", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      region: z.string().optional(),
      instanceType: z.string().optional(),
      imageId: z.string().optional(),
      count: z.number().int().min(1).max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.createCompute(parsed.data as any);
  });

  /** Scale compute */
  app.post("/compute/scale", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      resourceId: z.string().min(1),
      targetCount: z.number().int().min(0).max(500),
      namespace: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.scaleCompute(parsed.data as any);
  });

  /** Monitor a single compute resource */
  app.get("/compute/:provider/:resourceId", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const { provider, resourceId } = req.params as { provider: string; resourceId: string };
    const p = ProviderSchema.safeParse(provider);
    if (!p.success) return reply.code(400).send({ error: "Invalid provider" });
    return uialService.monitorCompute(p.data, resourceId);
  });

  /** Create storage */
  app.post("/storage/create", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      sizeGb: z.number().int().min(1),
      storageClass: z.enum(["ssd", "hdd", "nvme", "object"]).optional(),
      encrypted: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.createStorage(parsed.data as any);
  });

  /** Create network */
  app.post("/network/create", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      cidr: z.string().optional(),
      region: z.string().optional(),
      enableVpn: z.boolean().optional(),
      enablePrivateLink: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.createNetwork(parsed.data as any);
  });

  /** Deploy to Kubernetes (any provider) */
  app.post("/kubernetes/deploy", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      clusterId: z.string().min(1),
      namespace: z.string().min(1),
      deploymentName: z.string().min(1),
      image: z.string().optional(),
      replicas: z.number().int().min(1).max(100).optional(),
      strategy: z.enum(["rolling", "canary", "blue-green"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.kubeCreate(parsed.data as any);
  });

  /** Scale Kubernetes deployment */
  app.post("/kubernetes/scale", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      clusterId: z.string().min(1),
      namespace: z.string().min(1),
      deploymentName: z.string().min(1),
      replicas: z.number().int().min(0).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.kubeScale(parsed.data as any);
  });

  /** Create IAM principal */
  app.post("/iam/create", { preHandler: requireRole(["admin"]) }, async (req, reply) => {
    const schema = z.object({
      provider: ProviderSchema,
      principalId: z.string().min(1),
      role: z.string().min(1),
      resourceArn: z.string().optional(),
      policies: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return uialService.createIAM(parsed.data as any);
  });
}
