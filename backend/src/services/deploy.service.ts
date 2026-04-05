import { v4 as uuidv4 } from "uuid";
import { getDbPool } from "../config/db";
import { getArgoRolloutsConfig, getK8sCustomObjectsApi } from "../config/k8s";
import { logger } from "../utils/logger";
import { mongoEnabled } from "../config/mongo";
import {
  createDeploymentMongo,
  getDeploymentStatusMongo,
  setDeploymentStateMongo,
} from "./deploy.mongo";
import {
  createDeploymentMemory,
  deployMemoryEnabled,
  getDeploymentStatusMemory,
  setDeploymentStateMemory,
} from "./deploy.memory";

export type DeployStrategy = "canary" | "rolling" | "blueGreen";

export interface DeployStartInput {
  workflowId: string;
  rolloutName: string;
  namespace: string;
  strategy: DeployStrategy;
}

export interface DeploymentStatus {
  deploymentId: string;
  status: string;
  phase?: string;
  message?: string;
}

export async function stopDeployment(deploymentId: string): Promise<DeploymentStatus> {
  const current = await getDeploymentStatus(deploymentId);
  if (current.status === "SUCCEEDED" || current.status === "FAILED" || current.status === "STOPPED") {
    return current;
  }

  await setDeploymentState(
    deploymentId,
    "STOPPED",
    current.phase ?? null,
    "Stopped by operator request"
  );
  return await getDeploymentStatus(deploymentId);
}

function asStatusPhase(argoPhase: string | undefined): string | undefined {
  return argoPhase || undefined;
}

function deploymentDone(status: string) {
  return status === "SUCCEEDED" || status === "FAILED";
}

export async function startDeployment(input: DeployStartInput): Promise<{
  deploymentId: string;
  status: string;
}> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    const started = await createDeploymentMongo(input);
    void runDeployment(started.deploymentId, input).catch((e) => {
      logger.error("deployment_worker_failed", {
        deploymentId: started.deploymentId,
        message: e instanceof Error ? e.message : String(e),
      });
    });
    return started;
  }
  if (deployMemoryEnabled()) {
    const started = await createDeploymentMemory(input);
    void runDeployment(started.deploymentId, input).catch((e) => {
      logger.error("deployment_worker_failed", {
        deploymentId: started.deploymentId,
        message: e instanceof Error ? e.message : String(e),
      });
    });
    return started;
  }
  const db = getDbPool();
  const deploymentId = uuidv4();

  await db.query(
    `INSERT INTO deployments (id, workflow_id, rollout_name, namespace, strategy, status, phase, message)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
    [
      deploymentId,
      input.workflowId,
      input.rolloutName,
      input.namespace,
      input.strategy,
      "DEPLOYMENT_STARTED",
      "Starting progressive deployment",
    ]
  );

  logger.info("deployment_created", {
    deploymentId,
    workflowId: input.workflowId,
    rolloutName: input.rolloutName,
    namespace: input.namespace,
    strategy: input.strategy,
  });

  // Fire-and-forget: update status in DB, frontend polls /status.
  void runDeployment(deploymentId, input).catch((e) => {
    logger.error("deployment_worker_failed", {
      deploymentId,
      message: e instanceof Error ? e.message : String(e),
    });
  });

  return { deploymentId, status: "DEPLOYMENT_STARTED" };
}

export async function getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    return await getDeploymentStatusMongo(deploymentId);
  }
  if (deployMemoryEnabled()) {
    return await getDeploymentStatusMemory(deploymentId);
  }
  const db = getDbPool();
  const rec = await db.query(
    `SELECT id, status, phase, message
     FROM deployments
     WHERE id = $1`,
    [deploymentId]
  );

  if (rec.rowCount === 0) throw new Error("Deployment not found");

  const row = rec.rows[0];
  return {
    deploymentId: row.id,
    status: row.status,
    phase: row.phase ?? undefined,
    message: row.message ?? undefined,
  };
}

async function setDeploymentState(
  deploymentId: string,
  status: string,
  phase?: string | null,
  message?: string | null
): Promise<void> {
  if (!process.env.DATABASE_URL && mongoEnabled()) {
    await setDeploymentStateMongo(deploymentId, status, phase, message);
    return;
  }
  if (deployMemoryEnabled()) {
    await setDeploymentStateMemory(deploymentId, status, phase, message);
    return;
  }
  const db = getDbPool();
  await db.query(
    `UPDATE deployments
     SET status = $1, phase = $2, message = $3, updated_at = NOW()
     WHERE id = $4`,
    [status, phase ?? null, message ?? null, deploymentId]
  );
}

async function getRollout(rolloutName: string, namespace: string) {
  const { group, version, plural } = getArgoRolloutsConfig();
  const api = getK8sCustomObjectsApi();
  // `@kubernetes/client-node` method signatures differ slightly across versions.
  // Cast to `any` to avoid brittle TS overload mismatches.
  return (api as any).getNamespacedCustomObject(group, version, namespace, plural, rolloutName);
}

async function patchRolloutRestartAnnotation(rolloutName: string, namespace: string) {
  const { group, version, plural } = getArgoRolloutsConfig();
  const api = getK8sCustomObjectsApi();

  const now = new Date().toISOString();
  const patch = {
    spec: {
      template: {
        metadata: {
          annotations: {
            "quantumops.ai/restartedAt": now,
          },
        },
      },
    },
  };

  // Patch annotations only (safest merge-override for arrays).
  // This triggers a new Rollout revision without requiring an image override.
  // If you later want image pinning, extend this with container image patching.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (api as any).patchNamespacedCustomObject(group, version, namespace, plural, rolloutName, patch);
}

async function runDeployment(
  deploymentId: string,
  input: DeployStartInput
): Promise<void> {
  const timeoutMs = Number(process.env.WORKFLOWS_DEPLOY_TIMEOUT_MS ?? 180_000);
  const pollMs = Number(process.env.WORKFLOWS_DEPLOY_POLL_INTERVAL_MS ?? 2_500);

  try {
    await setDeploymentState(
      deploymentId,
      "DEPLOYMENT_QUEUED",
      null,
      "Validating rollout + patching template"
    );

    // Patch rollout to trigger new revision. (Annotations under pod template change => new revision.)
    await patchRolloutRestartAnnotation(input.rolloutName, input.namespace);
    await setDeploymentState(
      deploymentId,
      "DEPLOYMENT_PATCHED",
      null,
      "Rollout revision created. Waiting for health."
    );

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const rollout = await getRollout(input.rolloutName, input.namespace);
      const body = (rollout as any).body ?? rollout;

      const phase = asStatusPhase(body?.status?.phase);
      const conditions = body?.status?.conditions as Array<any> | undefined;

      const progressingCond = conditions?.find((c) => c?.type === "Progressing");
      const healthyCond = conditions?.find((c) => c?.type === "Healthy");
      const msg =
        progressingCond?.message ?? healthyCond?.message ?? body?.status?.message ?? null;

      const nextStatus =
        phase === "Healthy"
          ? "SUCCEEDED"
          : phase === "Degraded"
            ? "FAILED"
            : "RUNNING";

      await setDeploymentState(deploymentId, nextStatus, phase ?? null, msg ?? undefined);

      if (deploymentDone(nextStatus)) {
        logger.info("deployment_finished", { deploymentId, status: nextStatus, phase });
        return;
      }

      await new Promise((r) => setTimeout(r, pollMs));
    }

    await setDeploymentState(
      deploymentId,
      "FAILED",
      null,
      "Timed out waiting for rollout health. Check Rollout events and conditions."
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("deployment_failed", { deploymentId, msg });
    await setDeploymentState(deploymentId, "FAILED", null, msg);
  }
}

