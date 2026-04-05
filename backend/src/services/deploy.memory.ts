import { v4 as uuidv4 } from "uuid";
import type { DeployStartInput, DeploymentStatus } from "./deploy.service";
import { logger } from "../utils/logger";

type DeploymentMem = {
  id: string;
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

const deployments = new Map<string, DeploymentMem>();

export function deployMemoryEnabled(): boolean {
  return !process.env.DATABASE_URL && !process.env.MONGODB_URI;
}

export async function createDeploymentMemory(input: DeployStartInput): Promise<{ deploymentId: string; status: string }> {
  const id = uuidv4();
  const now = new Date().toISOString();
  deployments.set(id, {
    id,
    workflowId: input.workflowId,
    rolloutName: input.rolloutName,
    namespace: input.namespace,
    strategy: input.strategy,
    status: "DEPLOYMENT_STARTED",
    phase: null,
    message: "Deployment started (ephemeral mode: no DB configured).",
    createdAt: now,
    updatedAt: now,
  });
  logger.warn("deployment_created_memory_store", { deploymentId: id });
  return { deploymentId: id, status: "DEPLOYMENT_STARTED" };
}

export async function setDeploymentStateMemory(
  deploymentId: string,
  status: string,
  phase?: string | null,
  message?: string | null
): Promise<void> {
  const d = deployments.get(deploymentId);
  if (!d) return;
  deployments.set(deploymentId, {
    ...d,
    status,
    phase: phase ?? null,
    message: message ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export async function getDeploymentStatusMemory(deploymentId: string): Promise<DeploymentStatus> {
  const d = deployments.get(deploymentId);
  if (!d) throw new Error("Deployment not found");
  return {
    deploymentId: d.id,
    status: d.status,
    phase: d.phase ?? undefined,
    message: d.message ?? undefined,
  };
}

