import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { cloudService } from "./cloud.service";
import { cloudConnectionService } from "./cloud-connection.service";
import { getMultiCloudControlPlaneStatus } from "../multi-cloud/cloud-status.service";
import { AuthMethodSchema, discoverInfra, testConnection, validateConnectionFormat } from "./launch-onboarding.service";

const ProviderSchema = z.enum(["aws", "gcp", "azure"]);

const CredentialsSchema = z.object({
  roleArn: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  externalId: z.string().optional(),
  region: z.string().optional(),
  serviceAccountJson: z.string().optional(),
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  subscriptionId: z.string().optional(),
});

const ValidateBodySchema = z.object({
  provider: ProviderSchema,
  authMethod: AuthMethodSchema,
  credentials: CredentialsSchema,
});

export async function cloudRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/status",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (_request, reply) => {
      const controlPlanes = getMultiCloudControlPlaneStatus();
      const metrics = await cloudService.metrics();
      return reply.send({ controlPlanes, metrics });
    }
  );

  app.post(
    "/connect",
    {
      preHandler: requireRole(["owner", "admin", "operator"]),
    },
    async (request, reply) => {
      const schema = z.object({
        provider: ProviderSchema,
        name: z.string().min(2).max(80),
        credentials: CredentialsSchema,
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
      const orgId = String(scope?.orgId ?? (request as any)?.authUser?.orgId ?? "");
      if (!orgId) return reply.code(400).send({ error: "Missing org context" });

      const out = cloudConnectionService.connect({
        orgId,
        projectId: scope?.projectId,
        envId: scope?.envId,
        provider: parsed.data.provider,
        name: parsed.data.name,
        credentials: parsed.data.credentials,
      });
      return reply.code(201).send({ connection: out });
    }
  );

  app.post(
    "/validate",
    {
      preHandler: requireRole(["owner", "admin", "operator"]),
    },
    async (request, reply) => {
      const parsed = ValidateBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const result = validateConnectionFormat(parsed.data);
      return reply.send({ result });
    }
  );

  app.post(
    "/test",
    {
      preHandler: requireRole(["owner", "admin", "operator"]),
    },
    async (request, reply) => {
      try {
        const parsed = ValidateBodySchema.safeParse(request.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
        const result = testConnection(parsed.data);
        return reply.send({ result });
      } catch (e) {
        request.log.error(e);
        return reply.code(500).send({ error: e instanceof Error ? e.message : "Cloud test failed" });
      }
    }
  );

  app.post(
    "/discover",
    {
      preHandler: requireRole(["owner", "admin", "operator"]),
    },
    async (request, reply) => {
      try {
        const schema = z.object({
          provider: ProviderSchema,
          region: z.string().optional(),
        });
        const parsed = schema.safeParse(request.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
        const discovery = discoverInfra(parsed.data.provider, parsed.data.region);
        return reply.send({ discovery });
      } catch (e) {
        request.log.error(e);
        return reply.code(500).send({ error: e instanceof Error ? e.message : "Discovery failed" });
      }
    }
  );

  app.get(
    "/connections",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
      const orgId = String(scope?.orgId ?? (request as any)?.authUser?.orgId ?? "");
      if (!orgId) return reply.code(400).send({ error: "Missing org context" });
      const connections = cloudConnectionService.list({
        orgId,
        projectId: scope?.projectId,
        envId: scope?.envId,
      });
      return reply.send({ connections });
    }
  );

  app.post(
    "/execute",
    {
      preHandler: requireRole(["admin", "operator"]),
    },
    async (request, reply) => {
      const schema = z.object({
        provider: ProviderSchema,
        operation: z.enum(["scaleDeployment", "restartService", "deployWorkflow"]),
        namespace: z.string().optional(),
        deploymentName: z.string().optional(),
        serviceName: z.string().optional(),
        clusterName: z.string().optional(),
        region: z.string().optional(),
        replicas: z.number().int().positive().optional(),
        workflowId: z.string().optional(),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await cloudService.execute(parsed.data);
      return reply.send(out);
    }
  );

  app.get(
    "/metrics",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const provider = (request.query as any)?.provider;
      if (provider && !["aws", "gcp", "azure"].includes(String(provider))) {
        return reply.code(400).send({ error: "provider must be aws|gcp|azure" });
      }
      const out = await cloudService.metrics(provider ? (provider as any) : undefined);
      return reply.send({ metrics: out });
    }
  );

  app.post(
    "/optimize",
    {
      preHandler: requireRole(["admin", "operator"]),
    },
    async (request, reply) => {
      const schema = z.object({
        latency: z.number().optional(),
        providers: z.array(ProviderSchema).optional(),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await cloudService.optimize(parsed.data);
      return reply.send(out);
    }
  );
}

