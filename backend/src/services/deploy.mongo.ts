import { v4 as uuidv4 } from "uuid";
import { getMongoDb } from "../config/mongo";
import { logger } from "../utils/logger";
import { DeployStartInput, DeploymentStatus } from "./deploy.service";

type DeploymentDoc = {
  _id: string;
  workflowId: string;
  rolloutName: string;
  namespace: string;
  strategy: string;
  status: string;
  phase?: string | null;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function createDeploymentMongo(input: DeployStartInput): Promise<{
  deploymentId: string;
  status: string;
}> {
  const db = await getMongoDb();
  const deployments = db.collection<DeploymentDoc>("deployments");
  const now = new Date().toISOString();
  const deploymentId = uuidv4();

  await deployments.insertOne({
    _id: deploymentId,
    workflowId: input.workflowId,
    rolloutName: input.rolloutName,
    namespace: input.namespace,
    strategy: input.strategy,
    status: "DEPLOYMENT_STARTED",
    phase: null,
    message: "Starting progressive deployment",
    createdAt: now,
    updatedAt: now,
  });

  logger.info("deployment_created", { deploymentId, workflowId: input.workflowId, store: "mongo" });
  return { deploymentId, status: "DEPLOYMENT_STARTED" };
}

export async function setDeploymentStateMongo(
  deploymentId: string,
  status: string,
  phase?: string | null,
  message?: string | null
): Promise<void> {
  const db = await getMongoDb();
  const deployments = db.collection<DeploymentDoc>("deployments");
  const now = new Date().toISOString();
  await deployments.updateOne(
    { _id: deploymentId },
    { $set: { status, phase: phase ?? null, message: message ?? null, updatedAt: now } }
  );
}

export async function getDeploymentStatusMongo(deploymentId: string): Promise<DeploymentStatus> {
  const db = await getMongoDb();
  const deployments = db.collection<DeploymentDoc>("deployments");
  const d = await deployments.findOne({ _id: deploymentId });
  if (!d) throw new Error("Deployment not found");
  return {
    deploymentId: d._id,
    status: d.status,
    phase: d.phase ?? undefined,
    message: d.message ?? undefined,
  };
}

