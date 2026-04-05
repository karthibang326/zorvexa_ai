import { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../lib/auth";
import { AnalyzeWorkflowSchema, AnomalySchema, GenerateWorkflowSchema } from "./ai.schemas";
import { aiCopilotService } from "./ai.service";
import { attachAssistantStream, attachWorkflowAiStream } from "./ai.stream";
import { selfHealingService } from "../self-healing/self-healing.service";
import { realtimeService } from "../realtime/realtime.service";

export async function aiCopilotRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/analyze",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = AnalyzeWorkflowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await aiCopilotService.analyzeWorkflow({ nodes: parsed.data.nodes, edges: parsed.data.edges });
      return reply.send(out);
    }
  );

  app.post(
    "/generate",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = GenerateWorkflowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await aiCopilotService.generateWorkflow(parsed.data);
      return reply.send(out);
    }
  );

  app.post(
    "/anomaly",
    {
      preHandler: requireRole(["admin", "operator"]),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = AnomalySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const out = await aiCopilotService.detectAnomaly({ metrics: parsed.data.metrics });
      if (out.anomaly) {
        void selfHealingService.trigger({
          source: "ANOMALY",
          metrics: {
            cpu: Number(parsed.data.metrics.cpu ?? 0),
            memory: Number(parsed.data.metrics.memory ?? 0),
            cost: Number(parsed.data.metrics.cost ?? 0),
          },
        });
      }
      return reply.send(out);
    }
  );

  app.get(
    "/workflows/:id/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const workflowId = String((request.params as any).id || "");
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const write = (payload: any) => {
        reply.raw.write(`event: update\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      write({ type: "ai.stream.ready", workflowId });

      const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15_000);
      const detach = attachWorkflowAiStream(workflowId, (payload) => write(payload));

      request.raw.on("close", () => {
        clearInterval(hb);
        detach();
      });

      return reply;
    }
  );

  app.post(
    "/chat",
    {
      preHandler: requireRole(["admin", "operator", "viewer"]),
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as any;
      const message = String(body.message ?? "").trim();
      if (!message) return reply.code(400).send({ error: "message is required" });
      const out = await aiCopilotService.chat({
        message,
        sessionId: body.sessionId ? String(body.sessionId) : undefined,
        context: body.context ?? {},
      });
      return reply.send(out);
    }
  );

  app.get(
    "/chat/history",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const sessionId = String((request.query as any)?.sessionId ?? "default-session");
      return reply.send({ sessionId, messages: realtimeService.getChat(sessionId) });
    }
  );

  app.get(
    "/chat/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const write = (payload: Record<string, unknown>) => {
        reply.raw.write("event: assistant\n");
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };
      write({ type: "assistant.stream.ready", ts: Date.now() });

      const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
      const detach = attachAssistantStream((payload) => write(payload));

      request.raw.on("close", () => {
        clearInterval(hb);
        detach();
      });
      return reply;
    }
  );
}

