import { getDbPool } from "../../config/db";
import type { AiDecisionRow, WorkloadRow } from "./astra-ops.types";

let schemaEnsured = false;

/**
 * Raw SQL tables (not in Prisma schema). Without these, ALTER TABLE in ensureAstraOpsColumns
 * throws "relation ai_decisions does not exist" → 500 on /astra-ops/approvals and ingest.
 */
async function ensureAstraOpsTables(): Promise<void> {
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS workloads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      environment_id TEXT NOT NULL,
      name TEXT,
      type TEXT,
      cpu_usage DOUBLE PRECISION,
      memory_usage DOUBLE PRECISION,
      cost DOUBLE PRECISION,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS workloads_env_created_idx ON workloads (environment_id, created_at DESC)`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workload_id UUID REFERENCES workloads(id) ON DELETE CASCADE,
      action TEXT,
      reason TEXT,
      confidence DOUBLE PRECISION,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      feedback_success BOOLEAN,
      improved_confidence DOUBLE PRECISION,
      updated_at TIMESTAMP(6)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS ai_decisions_status_created_idx ON ai_decisions (status, created_at DESC)`);
}

async function ensureAstraOpsColumns(): Promise<void> {
  if (schemaEnsured) return;
  const db = getDbPool();
  await ensureAstraOpsTables();
  await db.query(`ALTER TABLE ai_decisions ADD COLUMN IF NOT EXISTS feedback_success BOOLEAN`);
  await db.query(`ALTER TABLE ai_decisions ADD COLUMN IF NOT EXISTS improved_confidence DOUBLE PRECISION`);
  await db.query(`ALTER TABLE ai_decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6)`);
  schemaEnsured = true;
}

export async function insertWorkload(input: {
  environmentId: string;
  name: string;
  cpu: number;
  memory: number;
  cost: number;
  status?: string;
}): Promise<WorkloadRow> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  const { rows } = await db.query<WorkloadRow>(
    `INSERT INTO workloads (environment_id, name, cpu_usage, memory_usage, cost, status)
     VALUES ($1::text, $2, $3, $4, $5, $6)
     RETURNING id, environment_id, name, type, cpu_usage, memory_usage, cost, status, created_at`,
    [input.environmentId, input.name, input.cpu, input.memory, input.cost, input.status ?? "running"]
  );
  return rows[0];
}

export async function insertAiDecision(input: {
  workloadId: string;
  action: string;
  reason: string;
  confidence: number;
  status?: string;
}): Promise<AiDecisionRow> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  const { rows } = await db.query<AiDecisionRow>(
    `INSERT INTO ai_decisions (workload_id, action, reason, confidence, status)
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING id, workload_id, action, reason, confidence, status, created_at, feedback_success, improved_confidence`,
    [input.workloadId, input.action, input.reason, input.confidence, input.status ?? "pending"]
  );
  return rows[0];
}

export async function updateDecisionExecuted(decisionId: string): Promise<void> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  await db.query(
    `UPDATE ai_decisions SET status = $2, updated_at = NOW() WHERE id = $1::uuid`,
    [decisionId, "executed"]
  );
}

export async function updateDecisionStatus(decisionId: string, status: string): Promise<void> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  await db.query(`UPDATE ai_decisions SET status = $2, updated_at = NOW() WHERE id = $1::uuid`, [
    decisionId,
    status,
  ]);
}

export async function updateDecisionFeedback(
  decisionId: string,
  feedback: { success: boolean; improvedConfidence: number }
): Promise<void> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  await db.query(
    `UPDATE ai_decisions
     SET feedback_success = $2,
         improved_confidence = $3,
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [decisionId, feedback.success, feedback.improvedConfidence]
  );
}

export async function getDecisionById(decisionId: string): Promise<AiDecisionRow | null> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  const { rows } = await db.query<AiDecisionRow>(
    `SELECT id, workload_id, action, reason, confidence, status, created_at, feedback_success, improved_confidence
     FROM ai_decisions WHERE id = $1::uuid`,
    [decisionId]
  );
  return rows[0] ?? null;
}

export async function listDecisionsAwaitingApproval(limit = 100): Promise<AiDecisionRow[]> {
  await ensureAstraOpsColumns();
  const db = getDbPool();
  const { rows } = await db.query<AiDecisionRow>(
    `SELECT id, workload_id, action, reason, confidence, status, created_at, feedback_success, improved_confidence
     FROM ai_decisions
     WHERE status = 'awaiting_approval'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/** Resolve org / project / env from workloads → environments → projects → organizations (astraops schema). */
/** Recent workloads for autonomous observe → detect (control loop). */
export async function listRecentWorkloadsForLoop(limit = 80): Promise<WorkloadRow[]> {
  await ensureAstraOpsColumns();
  try {
    const db = getDbPool();
    const { rows } = await db.query<WorkloadRow>(
      `SELECT id, environment_id, name, type, cpu_usage, memory_usage, cost, status, created_at
       FROM workloads
       WHERE created_at > NOW() - INTERVAL '48 hours'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function getWorkloadOrgScope(
  workloadId: string
): Promise<{ orgId: string; projectId: string; envId: string } | null> {
  await ensureAstraOpsColumns();
  try {
    const db = getDbPool();
    const { rows } = await db.query<{
      org_id: string | null;
      project_id: string | null;
      env_id: string | null;
    }>(
      `SELECT o.id AS org_id, p.id AS project_id, e.id AS env_id
       FROM workloads w
       LEFT JOIN "Environment" e ON e.id = w.environment_id
       LEFT JOIN "Project" p ON p.id = e."projectId"
       LEFT JOIN "Organization" o ON o.id = p."organizationId"
       WHERE w.id = $1::uuid
       LIMIT 1`,
      [workloadId]
    );
    const r = rows[0];
    if (!r?.org_id) return null;
    return {
      orgId: r.org_id,
      projectId: r.project_id ?? "",
      envId: r.env_id ?? "",
    };
  } catch {
    return null;
  }
}
