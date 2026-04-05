import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { aiOrchestratorService } from "./ai-orchestrator.service";

export async function aiOrchestratorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/state", { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) }, async (request) => {
    const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
    return aiOrchestratorService.getState(scope);
  });

  app.get("/stream", { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) }, async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const write = (payload: Record<string, unknown>) => {
      reply.raw.write(`event: ${String(payload.type ?? "update")}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    write({ type: "ai_orchestrator_stream_ready", ts: Date.now() });
    const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
    write({ type: "ai_orchestrator_snapshot", ts: Date.now(), state: aiOrchestratorService.getState(scope) });

    const unsub = aiOrchestratorService.subscribe((ev) => write(ev as unknown as Record<string, unknown>));
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);

    request.raw.on("close", () => {
      clearInterval(hb);
      unsub();
    });
    return reply;
  });
}

