import { insertAstraOpsAudit } from "./astra-ops-audit.repository";
import { getWorkloadOrgScope } from "./astra-ops.repository";
import { logWarn } from "../../lib/logger";

const SYSTEM = {
  actorId: "system:astra-executor",
  actorEmail: "executor@astraops.internal",
  actorRole: "system",
};

export type ExecutorScope = { orgId: string; projectId?: string; envId?: string };

/** Append-only audit from the BullMQ executor (never throws). */
export async function auditExecutorOutcome(input: {
  workloadId: string;
  decisionId: string;
  event: string;
  detail: Record<string, unknown>;
  /** From ingest / approve queue payload — preferred over DB join */
  scope?: ExecutorScope;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const fromDb = await getWorkloadOrgScope(input.workloadId);
    const orgId = input.scope?.orgId || fromDb?.orgId || "_unscoped";
    const projectId = input.scope?.projectId || fromDb?.projectId || undefined;
    const envId = input.scope?.envId || fromDb?.envId || undefined;

    await insertAstraOpsAudit({
      orgId,
      projectId,
      envId,
      event: input.event,
      actorId: SYSTEM.actorId,
      actorEmail: SYSTEM.actorEmail,
      actorRole: SYSTEM.actorRole,
      decisionId: input.decisionId,
      workloadId: input.workloadId,
      detail: {
        ...input.detail,
        orgScopeFromJob: Boolean(input.scope?.orgId),
        orgScopeFromDb: Boolean(fromDb?.orgId),
      },
    });
  } catch (e) {
    logWarn("astra_executor_audit_failed", {
      decisionId: input.decisionId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
