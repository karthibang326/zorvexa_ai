import { v4 as uuidv4 } from "uuid";
import { getDbPool } from "../config/db";
import { logger } from "../utils/logger";
import { mongoEnabled } from "../config/mongo";
import {
  createWorkflowMongo,
  getLatestVersionMongo,
  getWorkflowMongo,
  updateWorkflowMongo,
} from "./workflow.mongo";
import {
  createWorkflowMemory,
  getLatestVersionMemory,
  getWorkflowMemory,
  memoryEnabled,
  updateWorkflowMemory,
} from "./workflow.memory";

export type WorkflowType = "system" | "user" | "agent";

export interface WorkflowCreateInput {
  name: string;
  type: WorkflowType;
  nodes: unknown[];
  edges: unknown[];
}

export interface WorkflowUpdateInput {
  version: string;
  nodes: unknown[];
  edges: unknown[];
}

export interface WorkflowRecord {
  id: string;
  name: string;
  type: WorkflowType;
  version: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowLatestVersionRecord {
  version: string;
  nodes: unknown[];
  edges: unknown[];
}

export async function getWorkflowVersion(
  workflowId: string,
  version: string
): Promise<WorkflowLatestVersionRecord> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    const { getMongoDb } = await import("../config/mongo");
    const db = await getMongoDb();
    const versions = db.collection<any>("workflow_versions");
    const v = await versions.findOne({ workflowId, version });
    if (!v) throw new Error("Workflow version not found");
    return { version: v.version, nodes: v.nodes ?? [], edges: v.edges ?? [] };
  }
  if (memoryEnabled()) {
    const { getLatestVersionMemory } = await import("./workflow.memory");
    // Memory mode keeps latest as source-of-truth; version-specific lookup is omitted.
    return await getLatestVersionMemory(workflowId);
  }

  const db = getDbPool();
  const rec = await db.query(
    `SELECT version, nodes, edges
     FROM workflow_versions
     WHERE workflow_id = $1 AND version = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [workflowId, version]
  );
  if (rec.rowCount === 0) throw new Error("Workflow version not found");
  const row = rec.rows[0];
  return { version: row.version, nodes: row.nodes ?? [], edges: row.edges ?? [] };
}

function toIsoOrNow(v: Date | null | undefined): string {
  return v ? v.toISOString() : new Date().toISOString();
}

export async function createWorkflow(input: WorkflowCreateInput): Promise<{
  id: string;
  name: string;
  type: WorkflowType;
  version: string;
}> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    return await createWorkflowMongo(input);
  }
  if (memoryEnabled()) {
    return await createWorkflowMemory(input);
  }
  const db = getDbPool();

  const workflowId = uuidv4();
  const version = "v2.4";
  const now = new Date();

  await db.query(
    `INSERT INTO workflows (id, name, type, current_version_id, created_at, updated_at)
     VALUES ($1, $2, $3, NULL, $4, $4)`,
    [workflowId, input.name, input.type, now]
  );

  const versionId = uuidv4();
  await db.query(
    `INSERT INTO workflow_versions (id, workflow_id, version, nodes, edges, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [versionId, workflowId, version, JSON.stringify(input.nodes ?? []), JSON.stringify(input.edges ?? []), now]
  );

  await db.query(
    `UPDATE workflows
     SET current_version_id = $1, updated_at = $2
     WHERE id = $3`,
    [versionId, now, workflowId]
  );

  logger.info("workflow_created", { workflowId, version, name: input.name });

  return { id: workflowId, name: input.name, type: input.type, version };
}

export async function updateWorkflow(
  workflowId: string,
  input: WorkflowUpdateInput
): Promise<WorkflowRecord> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    return await updateWorkflowMongo(workflowId, input);
  }
  if (memoryEnabled()) {
    return await updateWorkflowMemory(workflowId, input);
  }
  const db = getDbPool();
  const now = new Date();

  const wfRes = await db.query(`SELECT id FROM workflows WHERE id = $1`, [workflowId]);
  if (wfRes.rowCount === 0) {
    throw new Error("Workflow not found");
  }

  const versionId = uuidv4();
  await db.query(
    `INSERT INTO workflow_versions (id, workflow_id, version, nodes, edges, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [
      versionId,
      workflowId,
      input.version,
      JSON.stringify(input.nodes ?? []),
      JSON.stringify(input.edges ?? []),
      now,
    ]
  );

  await db.query(
    `UPDATE workflows
     SET current_version_id = $1, updated_at = $2
     WHERE id = $3`,
    [versionId, now, workflowId]
  );

  const rec = await db.query(
    `SELECT w.id, w.name, w.type,
            v.version, v.nodes, v.edges,
            w.created_at, w.updated_at
     FROM workflows w
     JOIN workflow_versions v ON v.id = w.current_version_id
     WHERE w.id = $1`,
    [workflowId]
  );

  const row = rec.rows[0];
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    version: row.version,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    createdAt: toIsoOrNow(row.created_at),
    updatedAt: toIsoOrNow(row.updated_at),
  };
}

export async function getWorkflow(workflowId: string): Promise<WorkflowRecord> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    return await getWorkflowMongo(workflowId);
  }
  if (memoryEnabled()) {
    return await getWorkflowMemory(workflowId);
  }
  const db = getDbPool();
  const rec = await db.query(
    `SELECT w.id, w.name, w.type,
            v.version, v.nodes, v.edges,
            w.created_at, w.updated_at
     FROM workflows w
     LEFT JOIN workflow_versions v ON v.id = w.current_version_id
     WHERE w.id = $1`,
    [workflowId]
  );

  if (rec.rowCount === 0) throw new Error("Workflow not found");

  const row = rec.rows[0];
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    version: row.version || "v2.4",
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    createdAt: toIsoOrNow(row.created_at),
    updatedAt: toIsoOrNow(row.updated_at),
  };
}

export async function getLatestVersion(
  workflowId: string
): Promise<WorkflowLatestVersionRecord> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    return await getLatestVersionMongo(workflowId);
  }
  if (memoryEnabled()) {
    return await getLatestVersionMemory(workflowId);
  }
  const db = getDbPool();
  const rec = await db.query(
    `SELECT v.version, v.nodes, v.edges
     FROM workflows w
     JOIN workflow_versions v ON v.id = w.current_version_id
     WHERE w.id = $1`,
    [workflowId]
  );

  if (rec.rowCount === 0) throw new Error("Workflow not found");

  const row = rec.rows[0];
  return {
    version: row.version,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
  };
}

