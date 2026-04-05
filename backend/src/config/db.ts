import { Pool } from "pg";

let dbConfigured = false;

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Postgres not configured. Set DATABASE_URL in the backend env (or project root .env) to enable Workflows + Deploy."
    );
  }
  pool = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
  });

  dbConfigured = true;
  return pool;
}

export async function initDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    // Keep the Copilot backend working even without DB.
    dbConfigured = false;
    return;
  }
  const db = getDbPool();

  await db.query(`CREATE TABLE IF NOT EXISTS workflows (
    id uuid PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    current_version_id uuid NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await db.query(`CREATE TABLE IF NOT EXISTS workflow_versions (
    id uuid PRIMARY KEY,
    workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    runtime JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await db.query(`CREATE INDEX IF NOT EXISTS workflow_versions_workflow_id_idx
    ON workflow_versions(workflow_id);`);

  await db.query(`CREATE TABLE IF NOT EXISTS deployments (
    id uuid PRIMARY KEY,
    workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    rollout_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    strategy TEXT NOT NULL,
    status TEXT NOT NULL,
    phase TEXT NULL,
    message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await db.query(`CREATE INDEX IF NOT EXISTS deployments_workflow_id_idx
    ON deployments(workflow_id);`);

  await db.query(`CREATE TABLE IF NOT EXISTS runs (
    id uuid PRIMARY KEY,
    workflow_id uuid NOT NULL,
    workflow_version TEXT NOT NULL,
    status TEXT NOT NULL,
    idempotency_key TEXT NULL,
    retry_of uuid NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ NULL,
    finished_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await db.query(`CREATE INDEX IF NOT EXISTS runs_workflow_id_idx
    ON runs(workflow_id, created_at DESC);`);

  await db.query(`CREATE INDEX IF NOT EXISTS runs_idempotency_idx
    ON runs(workflow_id, workflow_version, idempotency_key);`);

  await db.query(`CREATE TABLE IF NOT EXISTS run_step_logs (
    id uuid PRIMARY KEY,
    run_id uuid NOT NULL,
    step_name TEXT NOT NULL,
    step_index INT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NULL,
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL
  );`);

  await db.query(`CREATE INDEX IF NOT EXISTS run_step_logs_run_id_idx
    ON run_step_logs(run_id, step_index);`);
}

export function isDbConfigured(): boolean {
  return dbConfigured;
}

