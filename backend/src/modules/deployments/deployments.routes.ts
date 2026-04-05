import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { type DeploymentScope } from "../deployment/deployment.service";
import { createDeploymentByService, listDeploymentsForContext, getDeploymentLogsById, getDeploymentStatusById, rollbackDeploymentById, namespaceFromEnvId } from "./deployments.service";
import { logInfo } from "../../lib/logger";

export async function deploymentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as DeploymentScope;
      const schema = z.object({
        service: z.string().min(1),
        version: z.string().min(1),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const out = await createDeploymentByService({ ...parsed.data, scope });
      logInfo("deployment_created_via_service_api", { deploymentId: out.deploymentId, scope });
      return reply.code(202).send(out);
    }
  );

  app.get(
    "/",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as DeploymentScope;
      const limit = Number((request.query as any)?.limit ?? 20);
      const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
      const items = await listDeploymentsForContext(scope, safeLimit);
      return reply.send({ items });
    }
  );

  app.get(
    "/:id/status",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as DeploymentScope;
      try {
        return await getDeploymentStatusById(String((request.params as any).id), scope);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to get deployment status";
        const status = msg.toLowerCase().includes("not found") ? 404 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.get(
    "/:id/logs/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as DeploymentScope;
      const id = String((request.params as any).id);

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders?.();

      const sinceIso =
        typeof (request.query as any)?.since === "string" ? String((request.query as any).since) : undefined;
      const lastEventIdHeader = request.headers["last-event-id"];
      const sinceParsed =
        typeof lastEventIdHeader === "string"
          ? new Date(lastEventIdHeader)
          : sinceIso
            ? new Date(sinceIso)
            : null;
      const initialSince = sinceParsed && !Number.isNaN(sinceParsed.getTime()) ? sinceParsed : undefined;

      let lastTs = initialSince;

      const initial = await getDeploymentLogsById(id, scope, { since: initialSince, take: 50 });
      for (const evt of initial) {
        reply.raw.write(`event: ${evt.event}\n`);
        reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
      }
      if (initial.length) lastTs = new Date(initial[initial.length - 1].ts);

      const hb = setInterval(() => reply.raw.write("event: heartbeat\ndata: {}\n\n"), 15000);
      const poll = setInterval(async () => {
        try {
          const next = await getDeploymentLogsById(id, scope, { since: lastTs, take: 20 });
          if (next.length) {
            for (const evt of next) {
              reply.raw.write(`event: ${evt.event}\n`);
              reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
            }
            lastTs = new Date(next[next.length - 1].ts);
          }
        } catch {
          // best-effort
        }
      }, 2000);

      request.raw.on("close", () => {
        clearInterval(hb);
        clearInterval(poll);
      });
      return reply;
    }
  );

  app.post(
    "/:id/rollback",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as DeploymentScope;
      try {
        return await rollbackDeploymentById(String((request.params as any).id), scope);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to rollback deployment";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );
}

