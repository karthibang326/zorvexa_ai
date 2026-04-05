import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { aiGovernanceService } from "./ai-governance.service";

export async function aiGovernanceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/enable", { preHandler: requireRole(["admin", "operator"]) }, async () => aiGovernanceService.enable());
  app.post("/disable", { preHandler: requireRole(["admin", "operator"]) }, async () => aiGovernanceService.disable());

  app.get("/status", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getState());
  app.get("/risks", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getCriticalRisks());
  app.get("/access", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getAccess());
  app.get("/keys", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getApiKeys());
  app.get("/integrations", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getIntegrations());
  app.get("/predictions", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => aiGovernanceService.getPredictions());

  app.post("/stabilize", { preHandler: requireRole(["admin", "operator"]) }, async () => aiGovernanceService.stabilizeSecurity());
  app.post("/access/least-privilege", { preHandler: requireRole(["admin", "operator"]) }, async () => aiGovernanceService.enforceLeastPrivilege());
  app.post("/access/remove-inactive", { preHandler: requireRole(["admin", "operator"]) }, async () => aiGovernanceService.removeInactiveUsers());

  app.post("/keys/:id/rotate", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const id = String((request.params as { id?: string }).id ?? "");
    if (!id) return reply.code(400).send({ error: "Missing key id" });
    return aiGovernanceService.rotateKey(id);
  });
  app.post("/keys/:id/revoke", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const id = String((request.params as { id?: string }).id ?? "");
    if (!id) return reply.code(400).send({ error: "Missing key id" });
    return aiGovernanceService.revokeKey(id);
  });
  app.post("/keys/:id/restrict-scope", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const id = String((request.params as { id?: string }).id ?? "");
    if (!id) return reply.code(400).send({ error: "Missing key id" });
    return aiGovernanceService.restrictKeyScope(id);
  });

  app.post("/safety", { preHandler: requireRole(["admin", "operator"]) }, async (request, reply) => {
    const schema = z.object({
      approvalMode: z.boolean().optional(),
      auditLogsRequired: z.boolean().optional(),
      rollbackActions: z.boolean().optional(),
      maxOptimizationsPerHour: z.number().int().min(1).max(40).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return aiGovernanceService.updateSafety(parsed.data);
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

    write({ type: "ai_governance_stream_ready", ts: Date.now() });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const detach = aiGovernanceService.subscribe((event) => write(event as unknown as Record<string, unknown>));
    request.raw.on("close", () => {
      clearInterval(hb);
      detach();
    });
    return reply;
  });
}

