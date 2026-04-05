import { FastifyReply, FastifyRequest } from "fastify";
import { env as appEnv } from "../config/env";
import { fastifyJwtPayloadToAuthUser, resolveAuthFromBearer } from "../lib/auth-resolve";
import { prisma } from "../lib/prisma";
import { logError } from "../lib/logger";

type MembershipRole = "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";

/** Minimal fallback when Prisma is unreachable — matches dev-bootstrap ids only (no fake second tenant). */
const organizations = [{ id: "org-1", name: "Default organization", ownerId: "dev-user" }];
const projects = [{ id: "proj-1", name: "Default project", organizationId: "org-1" }];
const environments = [{ id: "env-prod", name: "Production", projectId: "proj-1" }];
const memberships = [{ userId: "dev-user", organizationId: "org-1", role: "OWNER" as MembershipRole }];

const roleOrder: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  ENGINEER: 2,
  VIEWER: 1,
};

const roleMapToAuth = {
  OWNER: "admin",
  ADMIN: "admin",
  ENGINEER: "operator",
  VIEWER: "viewer",
} as const;

function normalizeMembershipRole(raw: unknown): MembershipRole {
  const v = String(raw ?? "").toUpperCase();
  if (v === "OWNER") return "OWNER";
  if (v === "ADMIN") return "ADMIN";
  if (v === "ENGINEER") return "ENGINEER";
  return "VIEWER";
}

function allowDevMembershipBypass() {
  return appEnv.NODE_ENV !== "production" && appEnv.NODE_ENV !== "test";
}

function resolveContextFromRequest(request: FastifyRequest) {
  const q = request.query as Record<string, string | undefined>;
  const orgId = String((request.headers["x-org-id"] as string | undefined) ?? q.orgId ?? "");
  const projectId = String((request.headers["x-project-id"] as string | undefined) ?? q.projectId ?? "");
  const envId = String((request.headers["x-env-id"] as string | undefined) ?? q.envId ?? "");
  return { orgId, projectId, envId };
}

/** Launch Mode: create org/project/env without requiring existing tenant headers (routes use JWT only). */
function isOrgBootstrapPost(path: string, method: string) {
  if (method !== "POST") return false;
  return (
    path === "/api/org/organizations" ||
    path === "/api/org/projects" ||
    path === "/api/org/environments"
  );
}

/** Delete org by id uses JWT only — target org may differ from x-org-id context. */
function isOrgDeleteWithoutContext(path: string, method: string) {
  return method === "DELETE" && /^\/api\/org\/organizations\/[^/]+$/.test(path);
}

/** Launch wizard: auth is enforced by route `authenticate` — skip DB context here to avoid pre-auth 401/403 ordering issues. */
function isLaunchCloudPreflight(path: string, method: string) {
  if (method !== "POST") return false;
  return path === "/api/cloud/test" || path === "/api/cloud/discover" || path === "/api/cloud/validate";
}

export async function contextMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const path = request.url.split("?")[0] ?? request.url;
  if (path === "/health" || path.startsWith("/metrics")) return;
  if (path.startsWith("/api/context/switch") || path.startsWith("/api/context/options")) return;
  if (isOrgBootstrapPost(path, request.method)) return;
  if (isOrgDeleteWithoutContext(path, request.method)) return;
  if (isLaunchCloudPreflight(path, request.method)) return;

  try {
    const { orgId, projectId, envId } = resolveContextFromRequest(request);
    if (!orgId || !projectId || !envId) {
      return reply.code(400).send({ error: "Missing required context headers: x-org-id, x-project-id, x-env-id" });
    }

    let authUser = (request as any).authUser as { id?: string; role?: string; email?: string; jti?: string } | undefined;
    if (!authUser) {
      try {
        const hasAuthHeader = Boolean((request.headers as any)?.authorization);
        if (!hasAuthHeader) {
          authUser = { id: "dev-user", role: "operator", email: "dev@local" };
          (request as any).authUser = authUser;
        } else {
          const resolved = await resolveAuthFromBearer(request);
          if (resolved.kind === "auth0") {
            authUser = {
              id: resolved.user.id,
              role: resolved.user.role,
              email: resolved.user.email,
              jti: resolved.user.jti,
            };
            (request as any).authUser = authUser;
          } else {
            await (request as any).jwtVerify();
            const payload = (request as any).user as Record<string, unknown>;
            const u = fastifyJwtPayloadToAuthUser(payload);
            authUser = {
              id: u.id,
              role: u.role,
              email: u.email,
              jti: u.jti,
            };
            (request as any).authUser = authUser;
          }
        }
      } catch {
        if (appEnv.NODE_ENV !== "production" && appEnv.NODE_ENV !== "test") {
          authUser = { id: "dev-user", role: "operator", email: "dev@local" };
          (request as any).authUser = authUser;
        } else {
          return reply.code(401).send({ error: "Unauthorized context request" });
        }
      }
    }
    const userId = String(authUser?.id ?? "");
    if (!userId) return reply.code(401).send({ error: "Unauthorized context request" });

    // Prefer DB-backed validation when Prisma tables exist; fall back to in-memory defaults in older/demo setups.
    let effectiveRole: MembershipRole = "ADMIN";
    try {
      const [org, project, env] = await Promise.all([
        prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } }),
        prisma.project.findUnique({ where: { id: projectId }, select: { id: true, organizationId: true } }),
        prisma.environment.findUnique({ where: { id: envId }, select: { id: true, projectId: true } }),
      ]);
      if (!org || !project || !env) {
        // Local/dev convenience: allow any context when dev bypass is enabled.
        // This keeps dashboards usable even if the DB was reset or seeded IDs differ.
        if (allowDevMembershipBypass()) {
          effectiveRole = "ADMIN";
        } else {
          return reply.code(403).send({ error: "Invalid context hierarchy" });
        }
      }
      if (org && project && env && (project.organizationId !== org.id || env.projectId !== project.id)) {
        if (!allowDevMembershipBypass()) {
          return reply.code(403).send({ error: "Context hierarchy mismatch" });
        }
      }
      const membership = await prisma.membership.findFirst({
        where: { userId, organizationId: orgId },
        select: { role: true },
      });
      if (!membership && !allowDevMembershipBypass()) {
        return reply.code(403).send({ error: "No membership for organization context" });
      }
      effectiveRole = normalizeMembershipRole(membership?.role ?? "ADMIN");
    } catch {
      const org = organizations.find((o) => o.id === orgId);
      const project = projects.find((p) => p.id === projectId);
      const env = environments.find((e) => e.id === envId);
      if (!org || !project || !env) return reply.code(403).send({ error: "Invalid context hierarchy" });
      if (project.organizationId !== org.id || env.projectId !== project.id) {
        return reply.code(403).send({ error: "Context hierarchy mismatch" });
      }
      const membership = memberships.find((m) => m.userId === userId && m.organizationId === org.id);
      if (!membership && !allowDevMembershipBypass()) return reply.code(403).send({ error: "No membership for organization context" });
      effectiveRole = membership?.role ?? "ADMIN";
    }

    const authRole =
      effectiveRole in roleMapToAuth ? roleMapToAuth[effectiveRole as keyof typeof roleMapToAuth] : "admin";

    (request as any).scopeContext = {
      orgId,
      projectId,
      envId,
      userId,
      role: effectiveRole,
    };
    (request as any).authUser = {
      ...(request as any).authUser,
      role: authRole,
    };
  } catch (e) {
    logError("context_middleware_failed", { message: e instanceof Error ? e.message : String(e) });
    return reply.code(500).send({ error: "Context resolution failed", details: e instanceof Error ? e.message : String(e) });
  }
}

export function requireContextRole(minRole: MembershipRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ctxRole = (request as any)?.scopeContext?.role as MembershipRole | undefined;
    if (!ctxRole || roleOrder[ctxRole] < roleOrder[minRole]) {
      return reply.code(403).send({ error: "Insufficient context role" });
    }
  };
}

/** DB-backed tenant list for SaaS multi-org switcher (strict membership). */
export async function getContextOptionsFromPrisma(userId: string) {
  const mems = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  const orgIds = mems.map((m) => m.organizationId);
  if (!orgIds.length) return [];
  const organizations = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    orderBy: { createdAt: "desc" },
  });
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: orgIds } },
  });
  const projectIds = projects.map((p) => p.id);
  const environments = projectIds.length
    ? await prisma.environment.findMany({ where: { projectId: { in: projectIds } } })
    : [];

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    role: normalizeMembershipRole(mems.find((m) => m.organizationId === org.id)?.role ?? "VIEWER"),
    projects: projects
      .filter((p) => p.organizationId === org.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        environments: environments.filter((e) => e.projectId === p.id).map((e) => ({ id: e.id, name: e.name })),
      })),
  }));
}

export function getContextOptions(userId: string) {
  const allowedOrgs = memberships.filter((m) => m.userId === userId).map((m) => m.organizationId);
  return organizations
    .filter((o) => allowedOrgs.includes(o.id))
    .map((org) => ({
      id: org.id,
      name: org.name,
      role: memberships.find((m) => m.userId === userId && m.organizationId === org.id)?.role ?? "VIEWER",
      projects: projects
        .filter((p) => p.organizationId === org.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          environments: environments.filter((e) => e.projectId === p.id).map((e) => ({ id: e.id, name: e.name })),
        })),
    }));
}

export function validateContextForUser(userId: string, orgId: string, projectId: string, envId: string) {
  const org = organizations.find((o) => o.id === orgId);
  const project = projects.find((p) => p.id === projectId);
  const env = environments.find((e) => e.id === envId);
  if (!org || !project || !env) return { ok: false as const, error: "Invalid context identifiers" };
  if (project.organizationId !== org.id || env.projectId !== project.id) return { ok: false as const, error: "Invalid context hierarchy" };
  const membership = memberships.find((m) => m.userId === userId && m.organizationId === org.id);
  if (!membership && !allowDevMembershipBypass()) return { ok: false as const, error: "No membership for selected organization" };
  return { ok: true as const, role: normalizeMembershipRole(membership?.role ?? "ADMIN") };
}

/** Prefer Prisma-backed validation when org/project/env rows exist (production SaaS). */
export async function validateContextForUserAsync(
  userId: string,
  orgId: string,
  projectId: string,
  envId: string
): Promise<{ ok: true; role: MembershipRole } | { ok: false; error: string }> {
  try {
    const [org, project, env, membership] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true, organizationId: true } }),
      prisma.environment.findUnique({ where: { id: envId }, select: { id: true, projectId: true } }),
      prisma.membership.findFirst({ where: { userId, organizationId: orgId }, select: { role: true } }),
    ]);
    if (org && project && env && project.organizationId === org.id && env.projectId === project.id) {
      if (!membership && !allowDevMembershipBypass()) {
        return { ok: false, error: "No membership for selected organization" };
      }
      return { ok: true, role: normalizeMembershipRole(membership?.role ?? "ADMIN") };
    }
  } catch {
    /* fall through */
  }
  return validateContextForUser(userId, orgId, projectId, envId);
}

