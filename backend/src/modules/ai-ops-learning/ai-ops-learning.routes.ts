import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { k8sAiLoopService } from "../autonomous/k8s-ai-loop.service";
import { aiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { aiOpsLearningService } from "./ai-ops-learning.service";

const OpsCloudProviderSchema = z.enum(["aws", "gcp", "azure", "kubernetes"]);

const MetricsSchema = z.object({
  cpu: z.number().optional(),
  latency: z.number().optional(),
  errorRate: z.number().optional(),
  cost: z.number().optional(),
});

const AnalyzeSchema = z.object({
  state: MetricsSchema,
  manualApproval: z.boolean().optional(),
});

const ExecuteSchema = z.object({
  state: MetricsSchema,
  action: z.string().min(1),
  resource: z.string().min(1),
  provider: OpsCloudProviderSchema.optional(),
  namespace: z.string().optional(),
  manualApproval: z.boolean().optional(),
});

const FeedbackSchema = z.object({
  experienceId: z.string().uuid(),
  after: MetricsSchema,
  before: MetricsSchema.optional(),
});

const AutonomousLoopSchema = z.object({
  provider: OpsCloudProviderSchema.optional(),
  namespace: z.string().optional(),
  signal: z.object({
    metrics: MetricsSchema,
    logs: z.array(z.string()).default([]),
    events: z
      .array(
        z.object({
          type: z.string().min(1),
          message: z.string().min(1),
          severity: z.enum(["low", "medium", "high"]).optional(),
        })
      )
      .default([]),
  }),
});

const StartContinuousLoopSchema = z.object({
  intervalMs: z.number().int().min(2000).max(120000).optional(),
  provider: OpsCloudProviderSchema.optional(),
  namespace: z.string().optional(),
});

export async function aiOpsLearningRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/analyze",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request, reply) => {
      const parsed = AnalyzeSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      return aiOpsLearningService.analyze(parsed.data, {
        orgId: scope.orgId,
        projectId: scope.projectId,
        envId: scope.envId,
      });
    }
  );

  app.post(
    "/execute",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = ExecuteSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      try {
        return await aiOpsLearningService.execute(parsed.data, {
          orgId: scope.orgId,
          projectId: scope.projectId,
          envId: scope.envId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Execute failed";
        return reply.code(400).send({ error: msg });
      }
    }
  );

  app.post(
    "/feedback",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = FeedbackSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      try {
        return await aiOpsLearningService.feedback(parsed.data, {
          orgId: scope.orgId,
          projectId: scope.projectId,
          envId: scope.envId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Feedback failed";
        const status = msg.includes("not found") ? 404 : 400;
        return reply.code(status).send({ error: msg });
      }
    }
  );

  app.get(
    "/memory",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async (request) => {
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      const limit = Number((request.query as any)?.limit ?? 50);
      return aiOpsLearningService.memory(
        { orgId: scope.orgId, projectId: scope.projectId, envId: scope.envId },
        limit
      );
    }
  );

  app.post(
    "/autonomous/run",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = AutonomousLoopSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      return aiOpsLearningService.runAutonomousLoop(
        {
          provider: parsed.data.provider,
          namespace: parsed.data.namespace,
          signal: parsed.data.signal,
        },
        { orgId: scope.orgId, projectId: scope.projectId, envId: scope.envId }
      );
    }
  );

  app.post(
    "/autonomous/loop/start",
    { preHandler: requireRole(["admin", "operator"]) },
    async (request, reply) => {
      const parsed = StartContinuousLoopSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const scope = (request as any).scopeContext as { orgId: string; projectId?: string; envId?: string };
      return aiOpsLearningService.startContinuousLoop({
        intervalMs: parsed.data.intervalMs,
        provider: parsed.data.provider,
        namespace: parsed.data.namespace,
        scope: { orgId: scope.orgId, projectId: scope.projectId, envId: scope.envId },
      });
    }
  );

  app.post(
    "/autonomous/loop/stop",
    { preHandler: requireRole(["admin", "operator"]) },
    async () => {
      return aiOpsLearningService.stopContinuousLoop();
    }
  );

  app.get(
    "/autonomous/loop/status",
    { preHandler: requireRole(["admin", "operator", "viewer"]) },
    async () => {
      return aiOpsLearningService.getContinuousLoopStatus();
    }
  );

  /** Stops ops continuous loop, K8s autonomous loop, and AI orchestrator (enterprise kill-switch). */
  app.post(
    "/autonomous/emergency-stop",
    { preHandler: requireRole(["admin", "operator"]) },
    async () => {
      const ops = aiOpsLearningService.stopContinuousLoop();
      k8sAiLoopService.stop();
      aiOrchestratorService.stop();
      return {
        ok: true,
        stopped: ["ai_ops_continuous_loop", "k8s_autonomous_loop", "ai_orchestrator"],
        opsLoopStatus: ops,
      };
    }
  );
}
