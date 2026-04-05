import { v4 as uuidv4 } from "uuid";
import { getMongoDb } from "../config/mongo";
import { logger } from "../utils/logger";
import { WorkflowCreateInput, WorkflowLatestVersionRecord, WorkflowRecord, WorkflowType, WorkflowUpdateInput } from "./workflow.service";

type WorkflowDoc = {
  _id: string;
  name: string;
  type: WorkflowType;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
};

type WorkflowVersionDoc = {
  _id: string;
  workflowId: string;
  version: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
};

export async function createWorkflowMongo(input: WorkflowCreateInput): Promise<{
  id: string;
  name: string;
  type: WorkflowType;
  version: string;
}> {
  const db = await getMongoDb();
  const workflows = db.collection<WorkflowDoc>("workflows");
  const versions = db.collection<WorkflowVersionDoc>("workflow_versions");

  const workflowId = uuidv4();
  const version = "v2.4";
  const now = new Date().toISOString();
  const versionId = uuidv4();

  await versions.insertOne({
    _id: versionId,
    workflowId,
    version,
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    edges: Array.isArray(input.edges) ? input.edges : [],
    createdAt: now,
  });

  await workflows.insertOne({
    _id: workflowId,
    name: input.name,
    type: input.type,
    currentVersionId: versionId,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("workflow_created", { workflowId, version, name: input.name, store: "mongo" });
  return { id: workflowId, name: input.name, type: input.type, version };
}

export async function updateWorkflowMongo(workflowId: string, input: WorkflowUpdateInput): Promise<WorkflowRecord> {
  const db = await getMongoDb();
  const workflows = db.collection<WorkflowDoc>("workflows");
  const versions = db.collection<WorkflowVersionDoc>("workflow_versions");

  const wf = await workflows.findOne({ _id: workflowId });
  if (!wf) throw new Error("Workflow not found");

  const now = new Date().toISOString();
  const versionId = uuidv4();
  await versions.insertOne({
    _id: versionId,
    workflowId,
    version: input.version,
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    edges: Array.isArray(input.edges) ? input.edges : [],
    createdAt: now,
  });

  await workflows.updateOne(
    { _id: workflowId },
    { $set: { currentVersionId: versionId, updatedAt: now } }
  );

  return await getWorkflowMongo(workflowId);
}

export async function getWorkflowMongo(workflowId: string): Promise<WorkflowRecord> {
  const db = await getMongoDb();
  const workflows = db.collection<WorkflowDoc>("workflows");
  const versions = db.collection<WorkflowVersionDoc>("workflow_versions");

  const wf = await workflows.findOne({ _id: workflowId });
  if (!wf) throw new Error("Workflow not found");
  const v = await versions.findOne({ _id: wf.currentVersionId });

  return {
    id: wf._id,
    name: wf.name,
    type: wf.type,
    version: v?.version ?? "v2.4",
    nodes: v?.nodes ?? [],
    edges: v?.edges ?? [],
    createdAt: wf.createdAt,
    updatedAt: wf.updatedAt,
  };
}

export async function getLatestVersionMongo(workflowId: string): Promise<WorkflowLatestVersionRecord> {
  const db = await getMongoDb();
  const workflows = db.collection<WorkflowDoc>("workflows");
  const versions = db.collection<WorkflowVersionDoc>("workflow_versions");

  const wf = await workflows.findOne({ _id: workflowId });
  if (!wf) throw new Error("Workflow not found");
  const v = await versions.findOne({ _id: wf.currentVersionId });
  if (!v) throw new Error("Workflow not found");
  return { version: v.version, nodes: v.nodes ?? [], edges: v.edges ?? [] };
}

