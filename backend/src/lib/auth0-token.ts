import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function issuerBase(): string {
  return env.AUTH_ISSUER.trim().replace(/\/+$/, "");
}

function jwksUrl(): string {
  return `${issuerBase()}/.well-known/jwks.json`;
}

/** Verify Auth0 (or any OIDC) RS256 access token using JWKS. */
export async function verifyAuth0AccessToken(token: string): Promise<JWTPayload> {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl()));
  }
  const issuerWithSlash = `${issuerBase()}/`;
  const { payload } = await jwtVerify(token, jwks, {
    issuer: issuerWithSlash,
    audience: env.AUTH_AUDIENCE.trim() || undefined,
  });
  return payload;
}
