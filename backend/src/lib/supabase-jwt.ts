import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function supabaseBase(): string {
  return env.SUPABASE_URL.trim().replace(/\/+$/, "");
}

function jwksUrl(): string {
  return `${supabaseBase()}/auth/v1/.well-known/jwks.json`;
}

function expectedIssuer(): string {
  return `${supabaseBase()}/auth/v1`;
}

/**
 * Verify Supabase-issued access tokens (ES256 + JWKS) so the same Bearer works as for Auth0/local JWT.
 */
export async function verifySupabaseAccessToken(token: string): Promise<JWTPayload> {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl()));
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: expectedIssuer(),
    audience: "authenticated",
  });
  return payload;
}
