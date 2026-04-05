import type { FastifyRequest } from "fastify";
import { env } from "../config/env";
import { verifyAuth0AccessToken } from "./auth0-token";
import { verifySupabaseAccessToken } from "./supabase-jwt";

export type ResolvedAuthUser = {
  id: string;
  role: "owner" | "admin" | "operator" | "viewer" | "auditor";
  email?: string;
  orgId?: string;
  projectId?: string;
  envId?: string;
  jti?: string;
};

function normalizeRole(raw: unknown): ResolvedAuthUser["role"] {
  const v = String(raw ?? "").toLowerCase();
  if (v === "owner") return "owner";
  if (v === "admin") return "admin";
  if (v === "viewer") return "viewer";
  if (v === "auditor") return "auditor";
  return "operator";
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const raw = request.headers.authorization;
  if (typeof raw !== "string" || !raw.startsWith("Bearer ")) return null;
  return raw.slice(7).trim() || null;
}

function claimsToAuthUser(payload: Record<string, unknown>): ResolvedAuthUser {
  const externalRole =
    payload["https://zorvexa.ai/role"] ?? payload["https://astraops.ai/role"] ?? payload.role;
  return {
    id: String(payload.sub ?? payload.id ?? "anonymous"),
    role: normalizeRole(externalRole),
    email: typeof payload.email === "string" ? payload.email : undefined,
    orgId:
      (typeof payload.orgId === "string" ? payload.orgId : undefined) ??
      (typeof payload["https://zorvexa.ai/org_id"] === "string"
        ? (payload["https://zorvexa.ai/org_id"] as string)
        : undefined) ??
      (typeof payload["https://astraops.ai/org_id"] === "string"
        ? (payload["https://astraops.ai/org_id"] as string)
        : undefined),
    projectId:
      (typeof payload.projectId === "string" ? payload.projectId : undefined) ??
      (typeof payload["https://zorvexa.ai/project_id"] === "string"
        ? (payload["https://zorvexa.ai/project_id"] as string)
        : undefined) ??
      (typeof payload["https://astraops.ai/project_id"] === "string"
        ? (payload["https://astraops.ai/project_id"] as string)
        : undefined),
    envId:
      (typeof payload.envId === "string" ? payload.envId : undefined) ??
      (typeof payload["https://zorvexa.ai/env_id"] === "string"
        ? (payload["https://zorvexa.ai/env_id"] as string)
        : undefined) ??
      (typeof payload["https://astraops.ai/env_id"] === "string"
        ? (payload["https://astraops.ai/env_id"] as string)
        : undefined),
    jti: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}

export type ResolveResult =
  | { kind: "none" }
  | { kind: "auth0"; user: ResolvedAuthUser }
  | { kind: "supabase"; user: ResolvedAuthUser }
  | { kind: "hs256" };

export async function resolveAuthFromBearer(request: FastifyRequest): Promise<ResolveResult> {
  const token = extractBearerToken(request);
  if (!token) return { kind: "none" };

  if (env.AUTH_PROVIDER === "auth0" && env.AUTH_ISSUER.trim()) {
    const payload = await verifyAuth0AccessToken(token);
    return { kind: "auth0", user: claimsToAuthUser(payload as Record<string, unknown>) };
  }

  if (env.SUPABASE_URL.trim()) {
    try {
      const payload = await verifySupabaseAccessToken(token);
      return { kind: "supabase", user: claimsToAuthUser(payload as Record<string, unknown>) };
    } catch {
      /* not a valid Supabase user JWT — fall through to @fastify/jwt */
    }
  }

  return { kind: "hs256" };
}

/** Map payload set by @fastify/jwt after jwtVerify(). */
export function fastifyJwtPayloadToAuthUser(payload: Record<string, unknown>): ResolvedAuthUser {
  return claimsToAuthUser(payload);
}
