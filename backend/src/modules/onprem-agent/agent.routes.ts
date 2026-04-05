import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { agentService } from "./agent.service";
import type { AgentCommandType } from "./agent.types";

const CommandTypeSchema = z.enum([
  "DEPLOY_CONTAINER", "STOP_CONTAINER", "RESTART_SERVICE", "SCALE_WORKLOAD",
  "DRAIN_NODE", "EVICT_PODS", "COLLECT_METRICS", "EXECUTE_SCRIPT",
  "UPDATE_AGENT", "FAILOVER_INITIATE", "FAILOVER_COMPLETE",
]);

export async function onpremAgentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /** List all registered on-prem agents */
  app.get("/", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async () => {
    return { agents: agentService.listAgents() };
  });

  /** Get single agent detail */
  app.get("/:agentId", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    try {
      return agentService.getAgent(agentId);
    } catch (e) {
      return reply.code(404).send({ error: (e as Error).message });
    }
  });

  /** Send a command to a specific agent */
  app.post("/:agentId/command", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    const schema = z.object({
      type: CommandTypeSchema,
      payload: z.record(z.unknown()).optional().default({}),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    try {
      const cmd = agentService.sendCommand(agentId, parsed.data.type as AgentCommandType, parsed.data.payload);
      return { command: cmd };
    } catch (e) {
      return reply.code(404).send({ error: (e as Error).message });
    }
  });

  /** Broadcast command to all agents in a datacenter */
  app.post("/broadcast", { preHandler: requireRole(["admin", "operator"]) }, async (req, reply) => {
    const schema = z.object({
      datacenter: z.string().min(1),
      type: CommandTypeSchema,
      payload: z.record(z.unknown()).optional().default({}),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const cmds = agentService.broadcastCommand(
      parsed.data.datacenter, parsed.data.type as AgentCommandType, parsed.data.payload,
    );
    return { dispatched: cmds.length, commands: cmds };
  });

  /** List commands for an agent */
  app.get("/:agentId/commands", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req) => {
    const { agentId } = req.params as { agentId: string };
    return { commands: agentService.listCommands(agentId) };
  });

  /** List events (optionally scoped to one agent) */
  app.get("/events", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req) => {
    const { agentId, limit } = req.query as { agentId?: string; limit?: string };
    return { events: agentService.listEvents(agentId, limit ? Number(limit) : 100) };
  });

  /** Simulate an agent failure (chaos / test) */
  app.post("/:agentId/simulate-failure", { preHandler: requireRole(["admin"]) }, async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    try {
      return agentService.simulateFailure(agentId);
    } catch (e) {
      return reply.code(404).send({ error: (e as Error).message });
    }
  });

  /** SSE stream of all agent events */
  app.get("/events/stream", { preHandler: requireRole(["admin", "operator", "viewer"]) }, async (req, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    // Replay last 50 events
    const recent = agentService.listEvents(undefined, 50).reverse();
    for (const ev of recent) {
      reply.raw.write(`event: agent_event\ndata: ${JSON.stringify(ev)}\n\n`);
    }

    const unsub = agentService.subscribeEvents((ev) => {
      reply.raw.write(`event: agent_event\ndata: ${JSON.stringify(ev)}\n\n`);
    });
    const hb = setInterval(() => {
      reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 15_000);

    req.raw.on("close", () => { clearInterval(hb); unsub(); });
    return reply;
  });
}
