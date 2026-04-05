import { v4 as uuidv4 } from "uuid";
import { getDbPool } from "../config/db";
import { getMongoDb, mongoEnabled } from "../config/mongo";
import { memoryEnabled } from "./workflow.memory";
import { getLatestVersion } from "./workflow.service";
import { logger } from "../utils/logger";
import { incRunsFailed, incRunsSucceeded } from "./metrics";

export type RunStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "RETRYING";

export interface RunRecord {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: RunStatus;
  idempotencyKey?: string | null;
  retryOf?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
}

export interface RunStepLog {
  id: string;
  runId: string;
  stepName: string;
  stepIndex: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
  message?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

type RunMemory = {
  runs: Map<string, RunRecord>;
  steps: Map<string, RunStepLog[]>;
};

const memoryStore: RunMemory = {
  runs: new Map(),
  steps: new Map(),
};

function nowIso() {
  return new Date().toISOString();
}

function usingMongoOnly() {
  return !process.env.DATABASE_URL && mongoEnabled();
}

function usingMemoryOnly() {
  return !process.env.DATABASE_URL && !process.env.MONGODB_URI && memoryEnabled();
}

export async function triggerRun(params: {
  workflowId: string;
  workflowVersion?: string;
  idempotencyKey?: string;
  retryOf?: string;
}): Promise<RunRecord> {
  const workflowVersion =
    params.workflowVersion ?? (await getLatestVersion(params.workflowId)).version;
  const key = params.idempotencyKey?.trim() || null;

  if (usingMongoOnly()) {
    const db = await getMongoDb();
    const runs = db.collection<any>("runs");
    if (key) {
      const existing = await runs.findOne({
        workflowId: params.workflowId,
        workflowVersion,
        idempotencyKey: key,
        status: { $in: ["QUEUED", "RUNNING", "RETRYING"] },
      });
      if (existing) {
        return mapMongoRun(existing);
      }
    }
    const id = uuidv4();
    const rec = {
      _id: id,
      workflowId: params.workflowId,
      workflowVersion,
      status: params.retryOf ? "RETRYING" : "QUEUED",
      idempotencyKey: key,
      retryOf: params.retryOf ?? null,
      errorMessage: null,
      createdAt: nowIso(),
      startedAt: null,
      finishedAt: null,
      updatedAt: nowIso(),
    };
    await runs.insertOne(rec);
    return mapMongoRun(rec);
  }

  if (usingMemoryOnly()) {
    if (key) {
      const existing = Array.from(memoryStore.runs.values()).find(
        (r) =>
          r.workflowId === params.workflowId &&
          r.workflowVersion === workflowVersion &&
          r.idempotencyKey === key &&
          (r.status === "QUEUED" || r.status === "RUNNING" || r.status === "RETRYING")
      );
      if (existing) return existing;
    }
    const id = uuidv4();
    const rec: RunRecord = {
      id,
      workflowId: params.workflowId,
      workflowVersion,
      status: params.retryOf ? "RETRYING" : "QUEUED",
      idempotencyKey: key,
      retryOf: params.retryOf ?? null,
      errorMessage: null,
      createdAt: nowIso(),
      startedAt: null,
      finishedAt: null,
      updatedAt: nowIso(),
    };
    memoryStore.runs.set(id, rec);
    return rec;
  }

  const db = getDbPool();
  if (key) {
    const existing = await db.query(
      `SELECT * FROM runs
       WHERE workflow_id=$1 AND workflow_version=$2 AND idempotency_key=$3
         AND status IN ('QUEUED','RUNNING','RETRYING')
       ORDER BY created_at DESC LIMIT 1`,
      [params.workflowId, workflowVersion, key]
    );
    if (existing.rowCount && existing.rows[0]) return mapPgRun(existing.rows[0]);
  }
  const id = uuidv4();
  await db.query(
    `INSERT INTO runs (id, workflow_id, workflow_version, status, idempotency_key, retry_of, error_message, created_at, started_at, finished_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,NOW(),NULL,NULL,NOW())`,
    [
      id,
      params.workflowId,
      workflowVersion,
      params.retryOf ? "RETRYING" : "QUEUED",
      key,
      params.retryOf ?? null,
    ]
  );
  const created = await db.query(`SELECT * FROM runs WHERE id=$1`, [id]);
  return mapPgRun(created.rows[0]);
}

export async function listRuns(limit = 50): Promise<RunRecord[]> {
  if (usingMongoOnly()) {
    const db = await getMongoDb();
    const rows = await db
      .collection<any>("runs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows.map(mapMongoRun);
  }
  if (usingMemoryOnly()) {
    return Array.from(memoryStore.runs.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  }
  const db = getDbPool();
  const rows = await db.query(`SELECT * FROM runs ORDER BY created_at DESC LIMIT $1`, [limit]);
  return rows.rows.map(mapPgRun);
}

export async function getRun(runId: string): Promise<RunRecord & { steps: RunStepLog[] }> {
  if (usingMongoOnly()) {
    const db = await getMongoDb();
    const run = await db.collection<any>("runs").findOne({ _id: runId });
    if (!run) throw new Error("Run not found");
    const steps = await db
      .collection<any>("run_step_logs")
      .find({ runId })
      .sort({ stepIndex: 1, startedAt: 1 })
      .toArray();
    return { ...mapMongoRun(run), steps: steps.map(mapMongoStep) };
  }
  if (usingMemoryOnly()) {
    const run = memoryStore.runs.get(runId);
    if (!run) throw new Error("Run not found");
    return { ...run, steps: memoryStore.steps.get(runId) ?? [] };
  }
  const db = getDbPool();
  const run = await db.query(`SELECT * FROM runs WHERE id=$1`, [runId]);
  if (!run.rowCount) throw new Error("Run not found");
  const steps = await db.query(
    `SELECT * FROM run_step_logs WHERE run_id=$1 ORDER BY step_index ASC, started_at ASC`,
    [runId]
  );
  return { ...mapPgRun(run.rows[0]), steps: steps.rows.map(mapPgStep) };
}

export async function markRunStatus(
  runId: string,
  status: RunStatus,
  opts?: { errorMessage?: string | null; started?: boolean; finished?: boolean }
) {
  const updateAt = nowIso();
  if (usingMongoOnly()) {
    const db = await getMongoDb();
    await db.collection<any>("runs").updateOne(
      { _id: runId } as any,
      {
        $set: {
          status,
          errorMessage: opts?.errorMessage ?? null,
          startedAt: opts?.started ? updateAt : undefined,
          finishedAt: opts?.finished ? updateAt : undefined,
          updatedAt: updateAt,
        },
      }
    );
    return;
  }
  if (usingMemoryOnly()) {
    const r = memoryStore.runs.get(runId);
    if (!r) return;
    memoryStore.runs.set(runId, {
      ...r,
      status,
      errorMessage: opts?.errorMessage ?? null,
      startedAt: opts?.started ? updateAt : r.startedAt ?? null,
      finishedAt: opts?.finished ? updateAt : r.finishedAt ?? null,
      updatedAt: updateAt,
    });
    return;
  }
  const db = getDbPool();
  await db.query(
    `UPDATE runs
     SET status=$2,
         error_message=$3,
         started_at=CASE WHEN $4::boolean THEN COALESCE(started_at, NOW()) ELSE started_at END,
         finished_at=CASE WHEN $5::boolean THEN NOW() ELSE finished_at END,
         updated_at=NOW()
     WHERE id=$1`,
    [runId, status, opts?.errorMessage ?? null, Boolean(opts?.started), Boolean(opts?.finished)]
  );
}

export async function appendStepLog(log: Omit<RunStepLog, "id">): Promise<RunStepLog> {
  const id = uuidv4();
  const row: RunStepLog = { id, ...log };
  if (usingMongoOnly()) {
    const db = await getMongoDb();
    await db.collection<any>("run_step_logs").insertOne({ _id: id, ...log } as any);
    return row;
  }
  if (usingMemoryOnly()) {
    const current = memoryStore.steps.get(log.runId) ?? [];
    current.push(row);
    memoryStore.steps.set(log.runId, current);
    return row;
  }
  const db = getDbPool();
  await db.query(
    `INSERT INTO run_step_logs
      (id, run_id, step_name, step_index, status, message, started_at, ended_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      log.runId,
      log.stepName,
      log.stepIndex,
      log.status,
      log.message ?? null,
      log.startedAt ?? null,
      log.endedAt ?? null,
    ]
  );
  return row;
}

function mapPgRun(r: any): RunRecord {
  return {
    id: r.id,
    workflowId: r.workflow_id,
    workflowVersion: r.workflow_version,
    status: r.status,
    idempotencyKey: r.idempotency_key,
    retryOf: r.retry_of,
    errorMessage: r.error_message,
    createdAt: new Date(r.created_at).toISOString(),
    startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
    finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapPgStep(r: any): RunStepLog {
  return {
    id: r.id,
    runId: r.run_id,
    stepName: r.step_name,
    stepIndex: r.step_index,
    status: r.status,
    message: r.message,
    startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
    endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null,
  };
}

function mapMongoRun(r: any): RunRecord {
  return {
    id: r._id,
    workflowId: r.workflowId,
    workflowVersion: r.workflowVersion,
    status: r.status,
    idempotencyKey: r.idempotencyKey ?? null,
    retryOf: r.retryOf ?? null,
    errorMessage: r.errorMessage ?? null,
    createdAt: r.createdAt,
    startedAt: r.startedAt ?? null,
    finishedAt: r.finishedAt ?? null,
    updatedAt: r.updatedAt,
  };
}

function mapMongoStep(r: any): RunStepLog {
  return {
    id: r._id,
    runId: r.runId,
    stepName: r.stepName,
    stepIndex: r.stepIndex,
    status: r.status,
    message: r.message ?? null,
    startedAt: r.startedAt ?? null,
    endedAt: r.endedAt ?? null,
  };
}

export async function simulateDagExecution(runId: string): Promise<void> {
  const run = await getRun(runId);
  const wf = await getLatestVersion(run.workflowId);
  const nodes = Array.isArray(wf.nodes) ? wf.nodes : [];

  await markRunStatus(runId, "RUNNING", { started: true });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as any;
    const stepName = String(node?.label ?? node?.type ?? `step-${i + 1}`);
    const startedAt = nowIso();
    await appendStepLog({
      runId,
      stepName,
      stepIndex: i,
      status: "RUNNING",
      message: "Step started",
      startedAt,
      endedAt: null,
    });

    // Simulated executor path; fails if node explicitly carries fail flags.
    // Replace this block with real executor dispatch (HTTP/SQL/AI) per node type.
    await new Promise((r) => setTimeout(r, 120));
    const shouldFail = Boolean(node?.fail === true || node?.config?.fail === true);

    if (shouldFail) {
      await appendStepLog({
        runId,
        stepName,
        stepIndex: i,
        status: "FAILED",
        message: "Step execution failed",
        startedAt,
        endedAt: nowIso(),
      });
      await markRunStatus(runId, "FAILED", {
        finished: true,
        errorMessage: `Step failed: ${stepName}`,
      });
      incRunsFailed();
      logger.error("run_failed", { runId, stepName, stepIndex: i });
      return;
    }

    await appendStepLog({
      runId,
      stepName,
      stepIndex: i,
      status: "SUCCESS",
      message: "Step execution completed",
      startedAt,
      endedAt: nowIso(),
    });
  }

  await markRunStatus(runId, "SUCCESS", { finished: true, errorMessage: null });
  incRunsSucceeded();
  logger.info("run_succeeded", { runId, steps: nodes.length });
}

