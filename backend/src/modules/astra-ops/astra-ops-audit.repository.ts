import { getDbPool } from "../../config/db";

export type AstraOpsAuditRow = {
  id: string;
  created_at: Date;
  org_id: string;
  project_id: string | null;
  env_id: string | null;
  event: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  decision_id: string | null;
  workload_id: string | null;
  detail: Record<string, unknown> | null;
};

let auditTableEnsured = false;

async function ensureAuditTable(): Promise<void> {
  if (auditTableEnsured) return;
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS astra_ops_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      org_id TEXT NOT NULL,
      project_id TEXT,
      env_id TEXT,
      event TEXT NOT NULL,
      actor_id TEXT,
      actor_email TEXT,
      actor_role TEXT,
      decision_id UUID,
      workload_id UUID,
      detail JSONB
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS astra_ops_audit_org_created_idx ON astra_ops_audit (org_id, created_at DESC)`
  );
  auditTableEnsured = true;
}

export async function insertAstraOpsAudit(input: {
  orgId: string;
  projectId?: string;
  envId?: string;
  event: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  decisionId?: string;
  workloadId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await ensureAuditTable();
  const db = getDbPool();
  await db.query(
    `INSERT INTO astra_ops_audit (
      org_id, project_id, env_id, event, actor_id, actor_email, actor_role, decision_id, workload_id, detail
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, $10::jsonb)`,
    [
      input.orgId,
      input.projectId ?? null,
      input.envId ?? null,
      input.event,
      input.actorId ?? null,
      input.actorEmail ?? null,
      input.actorRole ?? null,
      input.decisionId ?? null,
      input.workloadId ?? null,
      input.detail ? JSON.stringify(input.detail) : null,
    ]
  );
}

export async function countAuditEvents24h(orgId: string): Promise<Record<string, number>> {
  await ensureAuditTable();
  const db = getDbPool();
  const { rows } = await db.query<{ event: string; c: string }>(
    `SELECT event, COUNT(*)::text AS c FROM astra_ops_audit
     WHERE org_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY event`,
    [orgId]
  );
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.event] = Number(r.c);
  }
  return out;
}

export async function listAstraOpsAuditForOrg(orgId: string, limit = 50): Promise<AstraOpsAuditRow[]> {
  await ensureAuditTable();
  const db = getDbPool();
  const { rows } = await db.query<AstraOpsAuditRow>(
    `SELECT id, created_at, org_id, project_id, env_id, event, actor_id, actor_email, actor_role,
            decision_id, workload_id, detail
     FROM astra_ops_audit
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [orgId, limit]
  );
  return rows;
}
