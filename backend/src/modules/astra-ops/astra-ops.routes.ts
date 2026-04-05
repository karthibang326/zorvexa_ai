import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { getDbPool } from "../../config/db";
import { getEffectiveAutonomyPolicies } from "../../core/astra-ops/autonomy";
import { getLastControlLoopStats, runControlLoopTick } from "../../core/astra-ops/loop/control-loop.service";
import { insertAstraOpsAudit, listAstraOpsAuditForOrg, countAuditEvents24h } from "./astra-ops-audit.repository";
import { getInfraConnectivity } from "./astra-ops-infra";
import {
  astraOpsApprovalRoles,
  astraOpsIngestRoles,
  astraOpsReadOpsRoles,
} from "./astra-ops.rbac";
import { getAstraOpsAuditContext } from "./astra-ops.request";
import {
  approveDecision,
  ingestMetrics,
  listPendingApprovals,
  rejectDecision,
} from "./astra-ops.service";

const IngestSchema = z.object({
  env_id: z.string().uuid(),
  name: z.string().min(1),
  cpu: z.coerce.number(),
  memory: z.coerce.number(),
  cost: z.coerce.number(),
});

export async function astraOpsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/ingest",
    { preHandler: requireRole(astraOpsIngestRoles()) },
    async (request, reply) => {
      if (!process.env.DATABASE_URL) {
        return reply.code(503).send({ error: "DATABASE_URL not configured" });
      }
      try {
        getDbPool();
      } catch {
        return reply.code(503).send({ error: "Postgres not reachable" });
      }

      const parsed = IngestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      try {
        const ctx = getAstraOpsAuditContext(request);
        const out = await ingestMetrics(parsed.data, {
          orgId: ctx.orgId,
          projectId: ctx.projectId,
          envId: ctx.envId,
        });
        await insertAstraOpsAudit({
          orgId: ctx.orgId,
          projectId: ctx.projectId,
          envId: ctx.envId,
          event: "ingest",
          actorId: ctx.actorId,
          actorEmail: ctx.actorEmail,
          actorRole: ctx.actorRole,
          workloadId: out.workload?.id,
          detail: {
            env_id: parsed.data.env_id,
            name: parsed.data.name,
            cpu: parsed.data.cpu,
            memory: parsed.data.memory,
            cost: parsed.data.cost,
          },
        });
        return out;
      } catch (e) {
        request.log.error(e);
        const msg = e instanceof Error ? e.message : "ingest_failed";
        return reply.code(500).send({ error: msg });
      }
    }
  );

  app.get(
    "/approvals",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async (request, reply) => {
      if (!process.env.DATABASE_URL) {
        return reply.code(503).send({ error: "DATABASE_URL not configured" });
      }
      try {
        getDbPool();
      } catch {
        return reply.code(503).send({ error: "Postgres not reachable" });
      }
      try {
        return await listPendingApprovals();
      } catch (e) {
        request.log.error(e);
        return reply.code(500).send({
          error: "astra_ops_schema_failed",
          details: e instanceof Error ? e.message : String(e),
          hint: "Ensure Postgres is up; workloads/ai_decisions tables are created on first access.",
        });
      }
    }
  );

  app.get(
    "/audit-log",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async (request, reply) => {
      if (!process.env.DATABASE_URL) {
        return reply.code(503).send({ error: "DATABASE_URL not configured" });
      }
      try {
        getDbPool();
      } catch {
        return reply.code(503).send({ error: "Postgres not reachable" });
      }
      const ctx = getAstraOpsAuditContext(request);
      const limit = Math.min(100, Math.max(1, Number((request.query as { limit?: string })?.limit) || 50));
      try {
        const entries = await listAstraOpsAuditForOrg(ctx.orgId, limit);
        return { entries };
      } catch (e) {
        request.log.error(e);
        return reply.code(500).send({
          error: "astra_ops_audit_failed",
          details: e instanceof Error ? e.message : String(e),
        });
      }
    }
  );

  app.post(
    "/decisions/:decisionId/approve",
    { preHandler: requireRole(astraOpsApprovalRoles()) },
    async (request, reply) => {
      if (!process.env.DATABASE_URL) {
        return reply.code(503).send({ error: "DATABASE_URL not configured" });
      }
      try {
        getDbPool();
      } catch {
        return reply.code(503).send({ error: "Postgres not reachable" });
      }
      const { decisionId } = request.params as { decisionId: string };
      const out = await approveDecision(decisionId);
      if (!out.ok) {
        const code =
          out.error === "decision_not_found" ? 404 : out.error === "not_awaiting_approval" ? 409 : 400;
        return reply.code(code).send({ error: out.error });
      }
      const ctx = getAstraOpsAuditContext(request);
      await insertAstraOpsAudit({
        orgId: ctx.orgId,
        projectId: ctx.projectId,
        envId: ctx.envId,
        event: "approval_granted",
        actorId: ctx.actorId,
        actorEmail: ctx.actorEmail,
        actorRole: ctx.actorRole,
        decisionId,
        detail: { status: "queued_for_execution" },
      });
      return { ok: true, decisionId, status: "queued_for_execution" };
    }
  );

  app.post(
    "/decisions/:decisionId/reject",
    { preHandler: requireRole(astraOpsApprovalRoles()) },
    async (request, reply) => {
      if (!process.env.DATABASE_URL) {
        return reply.code(503).send({ error: "DATABASE_URL not configured" });
      }
      try {
        getDbPool();
      } catch {
        return reply.code(503).send({ error: "Postgres not reachable" });
      }
      const { decisionId } = request.params as { decisionId: string };
      const out = await rejectDecision(decisionId);
      if (!out.ok) {
        const code =
          out.error === "decision_not_found" ? 404 : out.error === "not_awaiting_approval" ? 409 : 400;
        return reply.code(code).send({ error: out.error });
      }
      const ctx = getAstraOpsAuditContext(request);
      await insertAstraOpsAudit({
        orgId: ctx.orgId,
        projectId: ctx.projectId,
        envId: ctx.envId,
        event: "approval_rejected",
        actorId: ctx.actorId,
        actorEmail: ctx.actorEmail,
        actorRole: ctx.actorRole,
        decisionId,
        detail: { status: "rejected" },
      });
      return { ok: true, decisionId, status: "rejected" };
    }
  );

  app.get(
    "/autonomy",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async () => ({ policies: getEffectiveAutonomyPolicies() })
  );

  app.get(
    "/infra-status",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async () => getInfraConnectivity()
  );

  app.get(
    "/impact",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async (request) => {
      const ctx = getAstraOpsAuditContext(request);
      const counts = await countAuditEvents24h(ctx.orgId);
      const executorSuccess = counts["executor_succeeded"] ?? 0;
      return {
        windowHours: 24,
        auditEventCounts: counts,
        estimatedAiActions:
          executorSuccess + (counts["executor_simulated"] ?? 0) + (counts["decision_learned"] ?? 0),
        incidentsAutoResolved: executorSuccess,
        costSavedNote: "Wire FinOps actuals for $ saved",
        mttrNote: "Wire incident store for measured MTTR",
      };
    }
  );

  app.get(
    "/loop",
    { preHandler: requireRole(astraOpsReadOpsRoles()) },
    async () => ({ stats: getLastControlLoopStats() })
  );

  app.post(
    "/loop/tick",
    { preHandler: requireRole(astraOpsIngestRoles()) },
    async (request) => {
      const ctx = getAstraOpsAuditContext(request);
      const out = await runControlLoopTick({
        orgId: ctx.orgId,
        projectId: ctx.projectId,
        envId: ctx.envId,
      });
      return { ok: true, ...out };
    }
  );
}
