import { v4 as uuidv4 } from "uuid";
import type {
  WorkflowCreateInput,
  WorkflowLatestVersionRecord,
  WorkflowRecord,
  WorkflowType,
  WorkflowUpdateInput,
} from "./workflow.service";
import { logger } from "../utils/logger";

type WorkflowVersionMem = {
  id: string;
  workflowId: string;
  version: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
};

type WorkflowMem = {
  id: string;
  name: string;
  type: WorkflowType;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
};

const workflows = new Map<string, WorkflowMem>();
const versions = new Map<string, WorkflowVersionMem>();

export function memoryEnabled(): boolean {
  // Only as a last resort when no DB is configured.
  return !process.env.DATABASE_URL && !process.env.MONGODB_URI;
}

export async function createWorkflowMemory(input: WorkflowCreateInput): Promise<{
  id: string;
  name: string;
  type: WorkflowType;
  version: string;
}> {
  const workflowId = uuidv4();
  const now = new Date().toISOString();
  const version = "v2.4";
  const versionId = uuidv4();

  versions.set(versionId, {
    id: versionId,
    workflowId,
    version,
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    edges: Array.isArray(input.edges) ? input.edges : [],
    createdAt: now,
  });

  workflows.set(workflowId, {
    id: workflowId,
    name: input.name,
    type: input.type,
    currentVersionId: versionId,
    createdAt: now,
    updatedAt: now,
  });

  logger.warn("workflow_created_memory_store", { workflowId, version });
  return { id: workflowId, name: input.name, type: input.type, version };
}

export async function updateWorkflowMemory(workflowId: string, input: WorkflowUpdateInput): Promise<WorkflowRecord> {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error("Workflow not found");
  const now = new Date().toISOString();
  const versionId = uuidv4();

  versions.set(versionId, {
    id: versionId,
    workflowId,
    version: input.version,
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    edges: Array.isArray(input.edges) ? input.edges : [],
    createdAt: now,
  });

  workflows.set(workflowId, {
    ...wf,
    currentVersionId: versionId,
    updatedAt: now,
  });

  return await getWorkflowMemory(workflowId);
}

export async function getWorkflowMemory(workflowId: string): Promise<WorkflowRecord> {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error("Workflow not found");
  const v = versions.get(wf.currentVersionId);

  return {
    id: wf.id,
    name: wf.name,
    type: wf.type,
    version: v?.version ?? "v2.4",
    nodes: v?.nodes ?? [],
    edges: v?.edges ?? [],
    createdAt: wf.createdAt,
    updatedAt: wf.updatedAt,
  };
}

export async function getLatestVersionMemory(workflowId: string): Promise<WorkflowLatestVersionRecord> {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error("Workflow not found");
  const v = versions.get(wf.currentVersionId);
  if (!v) throw new Error("Workflow not found");
  return { version: v.version, nodes: v.nodes ?? [], edges: v.edges ?? [] };
}

