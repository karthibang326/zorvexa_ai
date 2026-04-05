import { prisma } from "../../lib/prisma";
import { workflowRepository } from "../workflow/workflow.repository";
import { deployWorkflow, type DeploymentScope, getDeploymentStatusById, getDeploymentLogsById, rollbackDeploymentById } from "../deployment/deployment.service";

export function namespaceFromEnvId(envId: string) {
  // context envId often looks like "env-prod" -> "prod"
  return envId.replace(/^env-/, "") || envId;
}

export async function createDeploymentByService(params: {
  service: string;
  version: string;
  scope: DeploymentScope;
}) {
  const prismaAny = prisma as any;
  const service = params.service.trim();
  if (!service) throw new Error("service is required");

  const wf =
    (await prismaAny.workflow.findFirst({ where: { name: service }, orderBy: { updatedAt: "desc" } })) ??
    (await workflowRepository.create({
      name: service,
      createdBy: "api:deployments",
      nodes: [],
      edges: [],
    }));

  const dep = await deployWorkflow({
    workflowId: wf.id,
    namespace: namespaceFromEnvId(params.scope.envId),
    strategy: "rolling",
    scope: params.scope,
    versionLabel: params.version,
  });

  return { deploymentId: dep.id, status: dep.status };
}

export async function listDeploymentsForContext(scope: DeploymentScope, limit: number) {
  const prismaAny = prisma as any;
  const items = await prismaAny.deployment.findMany({
    where: { orgId: scope.orgId, projectId: scope.projectId, environment: scope.envId },
    orderBy: { startedAt: "desc" },
    take: Math.max(1, Math.min(100, limit)),
  });

  return items.map((d: any) => ({
    id: d.id,
    service: d.service,
    version: d.versionLabel ?? String(d.version),
    status: d.status,
    startedAt: d.startedAt?.toISOString?.() ?? null,
    completedAt: d.completedAt?.toISOString?.() ?? null,
  }));
}

export { getDeploymentLogsById, getDeploymentStatusById, rollbackDeploymentById };

