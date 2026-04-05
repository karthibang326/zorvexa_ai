import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { workflowService } from "./workflow.service";
import { CreateWorkflowSchema, RevertWorkflowSchema, SaveWorkflowSchema } from "./workflow.schemas";
import { deployWorkflow } from "../deployment/deployment.service";
import { aiCopilotService } from "../ai-copilot/ai.service";
import { workflowAiService } from "./workflow-ai.service";
import { getWorkflowStreamHistory, subscribeWorkflowStream } from "../ai-control/workflow-engine/stream";
import { workflowRuntimeService } from "./workflow-runtime.service";

export async function workflowRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  const WorkflowAiExecuteSchema = z.object({
    workflowId: z.string().min(1),
    mode: z.enum(["manual", "assist", "auto"]).default("assist"),
    context: z.object({
      environment: z.string().min(1),
      namespace: z.string().min(1),
      strategy: z.enum(["canary", "rolling"]).default("canary"),
      maxActionsPerHour: z.number().int().positive().default(12),
      approvalRequired: z.boolean().default(true),
    }),
  });

  app.get("/", async (_request, reply) => {
    try {
      const items = await workflowService.list();
      return reply.send({ items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to list workflows";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post(
    "/:id/execute",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const bodySchema = z.object({
        mode: z.enum(["manual", "assist", "auto"]).default("assist"),
        context: z.object({
          environment: z.string().min(1),
          namespace: z.string().min(1),
          strategy: z.enum(["canary", "rolling"]).default("canary"),
          maxActionsPerHour: z.number().int().positive().default(12),
          approvalRequired: z.boolean().default(true),
        }),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const workflowId = String((request.params as any).id);
        const out = await workflowRuntimeService.execute({
          workflowId,
          mode: parsed.data.mode,
          context: parsed.data.context,
          idempotencyKey: `wf:${workflowId}:${Date.now()}`,
        });
        return reply.code(202).send(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to execute workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/:id/simulate",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const bodySchema = z.object({
        mode: z.enum(["manual", "assist", "auto"]).default("assist"),
        context: z.object({
          environment: z.string().min(1),
          namespace: z.string().min(1),
          strategy: z.enum(["canary", "rolling"]).default("canary"),
          maxActionsPerHour: z.number().int().positive().default(12),
          approvalRequired: z.boolean().default(true),
        }),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const workflowId = String((request.params as any).id);
        const out = await workflowRuntimeService.simulate({
          workflowId,
          mode: parsed.data.mode,
          context: parsed.data.context,
        });
        return reply.send(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to simulate workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/:id/approve",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const bodySchema = z.object({
        runId: z.string().min(1).optional(),
        mode: z.enum(["manual", "assist", "auto"]).default("assist"),
        context: z.object({
          environment: z.string().min(1),
          namespace: z.string().min(1),
          strategy: z.enum(["canary", "rolling"]).default("canary"),
          maxActionsPerHour: z.number().int().positive().default(12),
          approvalRequired: z.boolean().default(false),
        }),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const workflowId = String((request.params as any).id);
        const out = await workflowRuntimeService.approve({
          workflowId,
          runId: parsed.data.runId,
          approvedBy: (request as any)?.authUser?.id ?? "operator",
          mode: parsed.data.mode,
          context: parsed.data.context,
        });
        return reply.send(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to approve workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/ai/execute",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = WorkflowAiExecuteSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        return await workflowAiService.execute({
          workflowId: parsed.data.workflowId,
          mode: parsed.data.mode,
          context: parsed.data.context,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to execute workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/ai/simulate",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = WorkflowAiExecuteSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        return await workflowAiService.simulate({
          workflowId: parsed.data.workflowId,
          mode: parsed.data.mode,
          context: parsed.data.context,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to simulate workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/ai/optimize",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = z.object({ workflowId: z.string().min(1) }).safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        return await workflowAiService.optimize({ workflowId: parsed.data.workflowId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to optimize workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.get(
    "/stream",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();
      const workflowId = typeof (request.query as any)?.workflowId === "string" ? String((request.query as any).workflowId) : undefined;
      const write = (ev: any) => {
        reply.raw.write(`event: ${String(ev.type ?? "update")}\n`);
        reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
      };

      for (const item of getWorkflowStreamHistory(workflowId)) write(item);
      const unsub = subscribeWorkflowStream((ev) => {
        if (workflowId && ev.workflowId !== workflowId) return;
        write(ev);
      });
      const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15_000);
      request.raw.on("close", () => {
        clearInterval(hb);
        unsub();
      });
      return reply;
    }
  );

  app.post(
    "/",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = CreateWorkflowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const wf = await workflowService.create(parsed.data, (request as any).authUser.id);
        return reply.code(201).send(wf);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create workflow";
        const status = msg.toLowerCase().includes("dag") ? 400 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/:id/save",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = SaveWorkflowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const workflowId = String((request.params as any).id);
      let wf;
      try {
        wf = await workflowService.saveVersion(workflowId, parsed.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : msg.toLowerCase().includes("dag") ? 400 : 500;
        return reply.code(status).send({ error: msg });
      }

      // Fire-and-forget: publish AI suggestions via SSE for this workflow.
      void aiCopilotService.analyzeWorkflow({
        workflowId,
        nodes: parsed.data.nodes as any,
        edges: parsed.data.edges as any,
      });

      return reply.send(wf);
    }
  );

  app.post(
    "/save",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const bodySchema = z.object({
        workflowId: z.string().min(1),
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const wf = await workflowService.saveVersion(parsed.data.workflowId, {
          nodes: parsed.data.nodes as any,
          edges: parsed.data.edges as any,
        });
        return reply.send(wf);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/:id/revert",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = RevertWorkflowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const old = await workflowService.revert((request.params as any).id, parsed.data.version);
        return reply.send(old);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to revert workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.post(
    "/revert",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const bodySchema = z.object({
        workflowId: z.string().min(1),
        version: z.number().int().positive(),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const out = await workflowService.revert(parsed.data.workflowId, parsed.data.version);
        return reply.send(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to revert workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.get("/:id", async (request, reply) => {
    try {
      return await workflowService.getById((request.params as any).id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch workflow";
      const status = msg.toLowerCase().includes("not found") ? 404 : 500;
      return reply.code(status).send({ error: msg });
    }
  });

  app.post(
    "/:id/deploy",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext;
      const schema = z.object({
        namespace: z.string().min(1),
        strategy: z.enum(["rolling", "canary"]).default("rolling"),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      try {
        const dep = await deployWorkflow({
          workflowId: (request.params as any).id,
          namespace: parsed.data.namespace,
          strategy: parsed.data.strategy,
          scope,
        });
        return reply.code(202).send({
          deploymentId: dep.id,
          status: dep.status,
          message: "Deployment created",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to deploy workflow";
        const status = msg.toLowerCase().includes("not found") ? 404 : 500;
        return reply.code(status).send({ error: msg });
      }
    }
  );
}

