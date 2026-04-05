import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { pluginService } from "./plugin.service";

export async function pluginRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/catalog",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const type = typeof (request.query as any)?.type === "string" ? String((request.query as any).type) : undefined;
      await pluginService.seedOfficialCatalog();
      return { items: await pluginService.listCatalog(type) };
    }
  );

  app.get(
    "/installed",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const scope = (request as any).scopeContext;
      return { items: await pluginService.listInstalled(scope) };
    }
  );

  app.post(
    "/install",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext;
      const parsed = z
        .object({
          pluginId: z.string().min(1),
          config: z.record(z.any()).optional(),
        })
        .safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return pluginService.install(scope, parsed.data);
    }
  );

  app.post(
    "/:installId/enable",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request) => {
      const scope = (request as any).scopeContext;
      return pluginService.setEnabled(scope, String((request.params as any).installId), true);
    }
  );

  app.post(
    "/:installId/disable",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request) => {
      const scope = (request as any).scopeContext;
      return pluginService.setEnabled(scope, String((request.params as any).installId), false);
    }
  );

  app.post(
    "/reload",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request) => {
      const scope = (request as any).scopeContext;
      return pluginService.reload(scope);
    }
  );

  app.post(
    "/emit",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = z
        .object({
          event: z.enum(["onMetric", "onIncident", "onDeploy"]),
          payload: z.record(z.any()).default({}),
        })
        .safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return pluginService.emit(parsed.data.event, parsed.data.payload);
    }
  );
}

