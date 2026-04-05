import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { environmentPolicyService } from "./environment-policy.service";

const TierSchema = z.enum(["dev", "staging", "prod"]);
const ActionKindSchema = z.enum(["scale", "restart", "deploy", "optimize", "rollback"]);

const UpdateSchema = z.object({
  tier: TierSchema.optional(),
  autonomyMode: z.enum(["simulation", "assisted", "autonomous"]).optional(),
  approvalScope: z.enum(["high_risk", "medium_risk", "all_actions"]).optional(),
  approvalRequired: z.boolean().optional(),
  maxActionsPerHour: z.number().int().positive().optional(),
  monthlyBudgetUsd: z.number().positive().optional(),
  blastRadius: z.enum(["low", "medium", "high"]).optional(),
  blastRadiusScope: z.enum(["service", "namespace", "cluster"]).optional(),
  sloAvailabilityTarget: z.number().min(90).max(100).optional(),
  autoRollback: z.boolean().optional(),
  rollbackOnPerformanceDegradation: z.boolean().optional(),
  pauseAutomationWhenBudgetExceeded: z.boolean().optional(),
  minConfidenceToAutoExecute: z.number().min(0).max(100).optional(),
  allowDestructiveActions: z.boolean().optional(),
  allowedActionKinds: z.array(ActionKindSchema).min(1).optional(),
  complianceTags: z.array(z.string().min(1)).optional(),
});

export async function environmentPolicyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/current",
    { preHandler: requireRole(["owner", "admin", "operator", "viewer", "auditor"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
      const orgId = String(scope?.orgId ?? "");
      const projectId = String(scope?.projectId ?? "");
      const envId = String(scope?.envId ?? "");
      if (!orgId || !projectId || !envId) return reply.code(400).send({ error: "Missing tenant context headers" });

      const tierRaw = String((request.query as any)?.tier ?? "dev");
      const tier = TierSchema.safeParse(tierRaw).success ? (tierRaw as "dev" | "staging" | "prod") : "dev";
      return { policy: environmentPolicyService.getOrCreate({ orgId, projectId, envId, tier }) };
    }
  );

  app.put(
    "/current",
    { preHandler: requireRole(["owner", "admin"]) },
    async (request, reply) => {
      const scope = (request as any).scopeContext as { orgId?: string; projectId?: string; envId?: string } | undefined;
      const orgId = String(scope?.orgId ?? "");
      const projectId = String(scope?.projectId ?? "");
      const envId = String(scope?.envId ?? "");
      if (!orgId || !projectId || !envId) return reply.code(400).send({ error: "Missing tenant context headers" });

      const parsed = UpdateSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      return { policy: environmentPolicyService.update({ orgId, projectId, envId }, parsed.data) };
    }
  );
}

