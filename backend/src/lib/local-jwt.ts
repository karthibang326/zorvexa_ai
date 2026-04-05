import type { FastifyRequest } from "fastify";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { extractBearerToken } from "./auth-resolve";

const enc = new TextEncoder();

function secretKey(secret: string) {
  return enc.encode(secret);
}

/** HS256 tokens for app-issued sessions (context switch, API auth). Replaces @fastify/jwt / fast-jwt. */
export async function signLocalJwt(secret: string, payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secretKey(secret));
}

export async function verifyLocalJwt(secret: string, token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ["HS256"] });
  return payload;
}

/** Verify Bearer HS256 JWT and set `request.user` (same shape as former @fastify/jwt). */
export async function attachLocalJwtUser(request: FastifyRequest, secret: string): Promise<void> {
  const token = extractBearerToken(request);
  if (!token) {
    const err = new Error("Missing bearer token");
    (err as any).statusCode = 401;
    throw err;
  }
  const payload = await verifyLocalJwt(secret, token);
  (request as any).user = payload;
}
