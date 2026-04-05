import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { fastifyJwtPayloadToAuthUser, resolveAuthFromBearer } from "./auth-resolve";

export type UserRole = "owner" | "admin" | "operator" | "viewer" | "auditor";
const revokedJti = new Set<string>();

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const hasAuthHeader = Boolean((request.headers as any)?.authorization);
    if (!hasAuthHeader && env.AUTH_DEV_BYPASS === "true" && env.NODE_ENV !== "production" && env.NODE_ENV !== "test") {
      (request as any).authUser = {
        id: "dev-user",
        role: "owner" as UserRole,
        email: "dev@local",
        orgId: "org-1",
        projectId: "proj-1",
        envId: "env-prod",
      };
      return;
    }
    const resolved = await resolveAuthFromBearer(request);
    if (resolved.kind === "auth0") {
      const u = resolved.user;
      if (u.jti && revokedJti.has(String(u.jti))) {
        return reply.code(401).send({ error: "Token revoked" });
      }
      (request as any).authUser = u;
      return;
    }

    if (resolved.kind === "supabase") {
      const u = resolved.user;
      (request as any).authUser = {
        ...u,
        orgId: u.orgId ?? "org-1",
        projectId: u.projectId ?? "proj-1",
        envId: u.envId ?? "env-prod",
      };
      return;
    }

    await (request as any).jwtVerify();
    const payload = (request as any).user as any;
    if (env.AUTH_ISSUER && env.AUTH_PROVIDER !== "auth0" && String(payload?.iss ?? "") !== env.AUTH_ISSUER) {
      return reply.code(401).send({ error: "Invalid token issuer" });
    }
    if (env.AUTH_AUDIENCE && env.AUTH_PROVIDER !== "auth0") {
      const aud = payload?.aud;
      const ok = Array.isArray(aud) ? aud.includes(env.AUTH_AUDIENCE) : String(aud ?? "") === env.AUTH_AUDIENCE;
      if (!ok) return reply.code(401).send({ error: "Invalid token audience" });
    }
    if (payload?.jti && revokedJti.has(String(payload.jti))) {
      return reply.code(401).send({ error: "Token revoked" });
    }
    (request as any).authUser = fastifyJwtPayloadToAuthUser(payload as Record<string, unknown>);
  } catch {
    if (env.AUTH_DEV_BYPASS === "true" && env.NODE_ENV !== "production" && env.NODE_ENV !== "test") {
      (request as any).authUser = {
        id: "dev-user",
        role: "owner" as UserRole,
        email: "dev@local",
        orgId: "org-1",
        projectId: "proj-1",
        envId: "env-prod",
      };
      return;
    }
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).authUser as { role?: UserRole } | undefined;
    // owner is the top-level role; it should be allowed wherever any role-gated route is used.
    if (user?.role === "owner") return;
    if (!user?.role || !roles.includes(user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}

export function revokeTokenJti(jti?: string) {
  if (!jti) return;
  revokedJti.add(jti);
}

