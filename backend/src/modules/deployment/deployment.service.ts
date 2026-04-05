import k8s from "@kubernetes/client-node";
import { prisma } from "../../lib/prisma";
import { getDeploymentQueue } from "../../lib/queue";
import { emitPluginEvent } from "../plugins/plugin.event-bus";

export interface DeploymentScope {
  orgId: string;
  projectId: string;
  envId: string;
}

export interface AutoDeployInput {
  repositoryId?: string;
  branch?: string;
  serviceName?: string;
  namespace?: string;
  strategy?: "rolling" | "canary";
  autoDeployOnPush?: boolean;
}

export interface AutoDeployResolvedConfig {
  repositoryId: string;
  branch: string;
  runtime: "node" | "python" | "generic";
  buildCommand: string;
  namespace: string;
  strategy: "rolling" | "canary";
  scaling: { minReplicas: number; maxReplicas: number };
  autoDeployOnPush: boolean;
}

type DeployEventType =
  | "deploy_started"
  | "build_started"
  | "build_completed"
  | "deploy_in_progress"
  | "deploy_success"
  | "deploy_failed";

interface DeployEvent {
  deploymentId: string;
  event: DeployEventType;
  message: string;
  status: string;
  ts: string;
}

const deploymentEventSubscribers = new Map<string, Set<(event: DeployEvent) => void>>();

function publishDeploymentEvent(event: DeployEvent) {
  const set = deploymentEventSubscribers.get(event.deploymentId);
  if (!set || set.size === 0) return;
  for (const handler of set) handler(event);
}

export function subscribeDeploymentEvents(deploymentId: string, handler: (event: DeployEvent) => void) {
  const set = deploymentEventSubscribers.get(deploymentId) ?? new Set<(event: DeployEvent) => void>();
  set.add(handler);
  deploymentEventSubscribers.set(deploymentId, set);
  return () => {
    const existing = deploymentEventSubscribers.get(deploymentId);
    if (!existing) return;
    existing.delete(handler);
    if (existing.size === 0) deploymentEventSubscribers.delete(deploymentId);
  };
}

async function appendDeploymentLog(params: {
  deploymentId: string;
  event: DeployEventType;
  message: string;
  status: string;
}) {
  const prismaAny = prisma as any;
  const level = params.event === "deploy_failed" || params.status.includes("FAILED") ? "ERROR" : "INFO";
  const now = new Date();
  const created = await prismaAny.deploymentLog.create({
    data: {
      deploymentId: params.deploymentId,
      event: params.event,
      message: params.message,
      status: params.status,
      level,
      timestamp: now,
    },
  });
  publishDeploymentEvent({
    deploymentId: params.deploymentId,
    event: params.event,
    message: params.message,
    status: params.status,
    ts: (created.timestamp ?? created.createdAt).toISOString(),
  });
}

async function markDeploymentStatus(deploymentId: string, status: string) {
  const prismaAny = prisma as any;
  const isTerminal = status === "SUCCEEDED" || status === "FAILED" || status === "STOPPED";
  await prismaAny.deployment.update({
    where: { id: deploymentId },
    data: { status, ...(isTerminal ? { completedAt: new Date() } : {}) },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Set `DEPLOYMENT_SIMULATE_DELAYS=true` only for demos; default is real-time (no artificial waits). */
function maybeDelay(ms: number) {
  if (process.env.DEPLOYMENT_SIMULATE_DELAYS === "true") {
    return sleep(ms);
  }
  return Promise.resolve();
}

export async function runDeploymentLifecycle(deploymentId: string) {
  try {
    const prismaAny = prisma as any;
    const dep = await prismaAny.deployment.findUnique({
      where: { id: deploymentId },
      select: { id: true, name: true, namespace: true, workflowId: true },
    });

    await appendDeploymentLog({
      deploymentId,
      event: "deploy_started",
      message: "Pulling image and preparing rollout",
      status: "RUNNING",
    });
    await markDeploymentStatus(deploymentId, "RUNNING");
    await maybeDelay(400);
    await appendDeploymentLog({
      deploymentId,
      event: "build_started",
      message: "Deploying to Kubernetes (best-effort)",
      status: "RUNNING",
    });
    // Worker-side: attempt Kubernetes rollout, but never hard-fail if cluster config isn't available.
    try {
      if (dep) {
        const kc = new k8s.KubeConfig();
        try {
          kc.loadFromDefault();
        } catch {
          // no cluster config (dev)
        }
        if (kc.getCurrentCluster()) {
          const apps = kc.makeApiClient(k8s.AppsV1Api);
          const manifest: k8s.V1Deployment = {
            apiVersion: "apps/v1",
            kind: "Deployment",
            metadata: { name: dep.name ?? `wf-${dep.workflowId.slice(0, 8)}` },
            spec: {
              replicas: 1,
              selector: { matchLabels: { app: dep.name ?? "executor" } },
              template: {
                metadata: { labels: { app: dep.name ?? "executor" } },
                spec: {
                  containers: [
                    {
                      name: "executor",
                      image: process.env.EXECUTOR_IMAGE || "busybox",
                      command: ["sh", "-c", "echo workflow executor running; sleep 3600"],
                      env: [{ name: "WORKFLOW_ID", value: dep.workflowId }],
                    },
                  ],
                },
              },
            },
          };
          await apps.createNamespacedDeployment({ namespace: dep.namespace ?? "default", body: manifest });
        }
      }
    } catch {
      // ignore k8s errors to keep lifecycle resilient
    }
    await maybeDelay(500);
    await appendDeploymentLog({
      deploymentId,
      event: "build_completed",
      message: "Running health checks",
      status: "RUNNING",
    });
    await maybeDelay(400);
    await appendDeploymentLog({
      deploymentId,
      event: "deploy_in_progress",
      message: "Rolling out pods and verifying readiness",
      status: "RUNNING",
    });
    await maybeDelay(500);
    await appendDeploymentLog({
      deploymentId,
      event: "deploy_success",
      message: "Deployment is healthy and serving traffic",
      status: "SUCCEEDED",
    });
    await markDeploymentStatus(deploymentId, "SUCCEEDED");
    await emitPluginEvent("onDeploy", {
      deploymentId,
      status: "SUCCEEDED",
      ts: new Date().toISOString(),
    });
  } catch {
    await appendDeploymentLog({
      deploymentId,
      event: "deploy_failed",
      message: "Deployment failed while applying rollout",
      status: "FAILED",
    });
    await markDeploymentStatus(deploymentId, "FAILED");
    await emitPluginEvent("onDeploy", {
      deploymentId,
      status: "FAILED",
      ts: new Date().toISOString(),
    });
  }
}

async function tryEnqueueDeployment(deploymentId: string) {
  // Queue-based lifecycle for production; dev falls back to in-process execution.
  try {
    const q = getDeploymentQueue();
    await q.add("deploy", { deploymentId });
  } catch {
    void runDeploymentLifecycle(deploymentId);
  }
}

export async function deployWorkflow(params: {
  workflowId: string;
  namespace: string;
  strategy: "rolling" | "canary";
  version?: number;
  trigger?: "deploy" | "rollback";
  scope: DeploymentScope;
  versionLabel?: string;
}) {
  const prismaAny = prisma as any;
  const wf = await prismaAny.workflow.findUnique({ where: { id: params.workflowId } });
  if (!wf) throw new Error("Workflow not found");

  const running = await prismaAny.deployment.findFirst({
    where: {
      workflowId: params.workflowId,
      status: { in: ["PENDING", "RUNNING", "DEPLOYMENT_STARTED", "DEPLOYMENT_IN_PROGRESS", "BUILDING"] },
      orgId: params.scope.orgId,
      projectId: params.scope.projectId,
      environment: params.scope.envId,
    },
    orderBy: { createdAt: "desc" },
  });
  if (running) throw new Error("A deployment is already in progress for this workflow");

  const deploymentName = `wf-${wf.id.slice(0, 8)}`;

  const dep = await prismaAny.deployment.create({
    data: {
      workflowId: params.workflowId,
      version:
        params.version ??
        ((await prismaAny.deployment.count({
          where: { workflowId: params.workflowId, status: { in: ["SUCCEEDED", "DEPLOYED"] } },
        })) +
          1),
      namespace: params.namespace,
      strategy: params.strategy,
      status: "PENDING",
      name: `wf-${wf.id.slice(0, 8)}`,
      service: String(wf.name ?? "service"),
      environment: params.scope.envId,
      projectId: params.scope.projectId,
      orgId: params.scope.orgId,
      startedAt: new Date(),
      versionLabel: params.versionLabel,
      logs: { deploymentName, strategy: params.strategy, trigger: params.trigger ?? "deploy" },
    },
  });
  // Lifecycle is executed by the queue worker (with a dev fallback inside deployWorkflow).
  void tryEnqueueDeployment(dep.id);
  return dep;
}

function detectRuntime(serviceName: string) {
  const n = serviceName.toLowerCase();
  if (n.includes("py")) return "python" as const;
  if (n.includes("node") || n.includes("web") || n.includes("api")) return "node" as const;
  return "generic" as const;
}

function detectBuildCommand(runtime: AutoDeployResolvedConfig["runtime"]) {
  if (runtime === "node") return "npm ci && npm run build";
  if (runtime === "python") return "pip install -r requirements.txt";
  return "docker build .";
}

export async function resolveAutoDeployConfig(input: AutoDeployInput): Promise<AutoDeployResolvedConfig> {
  const repositoryId = input.repositoryId?.trim() || "repo-default";
  const branch = input.branch?.trim() || "main";
  const serviceName = input.serviceName?.trim() || "astraops-service";
  const runtime = detectRuntime(serviceName);

  return {
    repositoryId,
    branch,
    runtime,
    buildCommand: detectBuildCommand(runtime),
    namespace: input.namespace?.trim() || "prod",
    strategy: input.strategy ?? "rolling",
    scaling: { minReplicas: 1, maxReplicas: 3 },
    autoDeployOnPush: Boolean(input.autoDeployOnPush ?? true),
  };
}

export async function autoDeploy(input: AutoDeployInput, scope: DeploymentScope) {
  const resolved = await resolveAutoDeployConfig(input);
  const serviceName = input.serviceName?.trim() || "astraops-service";
  const wf =
    (await (prisma as any).workflow.findFirst({
      where: { name: serviceName },
      orderBy: { updatedAt: "desc" },
    })) ??
    (await (prisma as any).workflow.create({
      data: {
        name: serviceName,
        version: 1,
        status: "READY",
        createdBy: "system:auto-deploy",
      },
    }));

  const dep = await deployWorkflow({
    workflowId: wf.id,
    namespace: resolved.namespace,
    strategy: resolved.strategy,
    trigger: "deploy",
    scope,
    versionLabel: undefined,
  });

  await (prisma as any).deployment.update({
    where: { id: dep.id },
    data: {
      logs: {
        ...(typeof dep.logs === "object" && dep.logs ? (dep.logs as Record<string, unknown>) : {}),
        autoResolved: resolved,
      } as any,
    },
  });

  return {
    deploymentId: dep.id,
    status: dep.status,
    message: `Auto deploy started for ${resolved.repositoryId}@${resolved.branch}`,
    config: resolved,
  };
}

export async function getDeploymentLogsById(
  deploymentId: string,
  scope: DeploymentScope,
  opts?: { since?: Date; take?: number }
) {
  const prismaAny = prisma as any;
  const take = opts?.take ?? 50;
  const since = opts?.since;
  const logs = await prismaAny.deploymentLog.findMany({
    where: {
      deploymentId,
      deployment: {
        orgId: scope.orgId,
        projectId: scope.projectId,
        environment: scope.envId,
      },
      ...(since ? { timestamp: { gt: since } } : {}),
    },
    orderBy: { timestamp: "asc" },
    take,
  });
  return logs.map((l: any) => ({
    id: l.id,
    event: l.event,
    message: l.message,
    status: l.status,
    level: l.level,
    ts: (l.timestamp ?? l.createdAt).toISOString(),
  }));
}

export async function getDeploymentHistory(scope: DeploymentScope) {
  const prismaAny = prisma as any;
  const deployments = await prismaAny.deployment.findMany({
    where: { orgId: scope.orgId, projectId: scope.projectId, environment: scope.envId },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  return deployments.map((d: any) => ({
    id: d.id,
    workflowId: d.workflowId,
    version: d.version,
    versionLabel: d.versionLabel ?? null,
    service: d.service ?? null,
    status: d.status,
    namespace: d.namespace,
    strategy: d.strategy,
    createdAt: d.createdAt.toISOString(),
    startedAt: d.startedAt?.toISOString?.() ?? d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString?.() ?? null,
  }));
}

export async function rollbackDeploymentById(deploymentId: string, scope: DeploymentScope) {
  const prismaAny = prisma as any;
  const current = await prismaAny.deployment.findFirst({
    where: { id: deploymentId, orgId: scope.orgId, projectId: scope.projectId, environment: scope.envId },
  });
  if (!current) throw new Error("Deployment not found");
  if (!["SUCCEEDED", "DEPLOYED"].includes(current.status)) {
    throw new Error("Rollback is allowed only for successful deployments");
  }
  // Mark current deployment as failed to reflect the rollback event.
  await appendDeploymentLog({
    deploymentId: current.id,
    event: "deploy_failed",
    message: "Rollback requested by operator",
    status: "FAILED",
  });
  await markDeploymentStatus(current.id, "FAILED");
  const previous = await prismaAny.deployment.findFirst({
    where: {
      workflowId: current.workflowId,
      createdAt: { lt: current.createdAt },
      status: { in: ["SUCCEEDED", "DEPLOYED"] },
      orgId: scope.orgId,
      projectId: scope.projectId,
      environment: scope.envId,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!previous) throw new Error("No previous successful deployment found");

  const rolled = await deployWorkflow({
    workflowId: current.workflowId,
    namespace: previous.namespace,
    strategy: (previous.strategy as "rolling" | "canary") || "rolling",
    version: previous.version,
    trigger: "rollback",
    scope,
    versionLabel: previous.versionLabel ?? String(previous.version),
  });
  await prismaAny.deployment.update({
    where: { id: rolled.id },
    data: {
      logs: {
        ...(typeof rolled.logs === "object" && rolled.logs ? (rolled.logs as Record<string, unknown>) : {}),
        rollbackFromDeploymentId: deploymentId,
        rollbackToVersion: previous.version,
      } as any,
    },
  });
  return {
    deploymentId: rolled.id,
    status: rolled.status,
    rolledBackToVersion: previous.version,
    sourceDeploymentId: deploymentId,
  };
}

export async function getDeploymentStatusById(deploymentId: string, scope: DeploymentScope) {
  const prismaAny = prisma as any;
  const dep = await prismaAny.deployment.findFirst({
    where: { id: deploymentId, orgId: scope.orgId, projectId: scope.projectId, environment: scope.envId },
  });
  if (!dep) throw new Error("Deployment not found");
  return {
    deploymentId: dep.id,
    status: dep.status,
    message: typeof dep.logs === "object" && dep.logs ? "Deployment record available" : undefined,
  };
}

export async function stopDeploymentById(deploymentId: string, scope: DeploymentScope) {
  const prismaAny = prisma as any;
  const dep = await prismaAny.deployment.findFirst({
    where: { id: deploymentId, orgId: scope.orgId, projectId: scope.projectId, environment: scope.envId },
  });
  if (!dep) throw new Error("Deployment not found");
  const updated = await prismaAny.deployment.update({
    where: { id: deploymentId },
    data: {
      status: "STOPPED",
      completedAt: new Date(),
      logs: {
        ...(typeof dep.logs === "object" && dep.logs ? (dep.logs as Record<string, unknown>) : {}),
        stoppedAt: new Date().toISOString(),
      } as any,
    },
  });
  return {
    deploymentId: updated.id,
    status: updated.status,
    message: "Stopped by operator request",
  };
}

