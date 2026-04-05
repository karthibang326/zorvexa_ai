import type { FastifyRequest } from "fastify";

export type AstraOpsAuditContext = {
  orgId: string;
  projectId: string;
  envId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
};

export function getAstraOpsAuditContext(request: FastifyRequest): AstraOpsAuditContext {
  const auth = (request as any).authUser ?? {};
  const scope = (request as any).scopeContext ?? {};
  return {
    orgId: String(scope.orgId ?? ""),
    projectId: String(scope.projectId ?? ""),
    envId: String(scope.envId ?? ""),
    actorId: String(auth.id ?? ""),
    actorEmail: String(auth.email ?? ""),
    actorRole: String(auth.role ?? ""),
  };
}
