import { env } from "../config/env";
import { logError, logInfo, logWarn } from "./logger";

/**
 * Validates critical settings when NODE_ENV=production.
 * Set PRODUCTION_STRICT=true to exit the process on failure (e.g. CI deploy gate).
 */
export function assertProductionReadiness(): void {
  if (env.NODE_ENV !== "production") {
    logInfo("production_readiness_skipped", { nodeEnv: env.NODE_ENV });
    return;
  }

  const issues: string[] = [];
  if (env.AUTH_DEV_BYPASS === "true") {
    issues.push("AUTH_DEV_BYPASS must be false in production");
  }
  if (env.JWT_SECRET.length < 32) {
    issues.push("JWT_SECRET should be at least 32 characters");
  }
  if (/change-me|dev-secret/i.test(env.JWT_SECRET) && env.JWT_SECRET.length < 48) {
    issues.push("JWT_SECRET appears to be a default dev value — rotate before production");
  }
  if (env.AI_OPS_LOOP_START_ON_BOOT === "true") {
    logWarn("production_ops_loop_on_boot", {
      message:
        "AI_OPS_LOOP_START_ON_BOOT=true runs the autonomous ops loop on every API replica — ensure only one leader or use an external scheduler.",
    });
  }
  if (env.AUTH_PROVIDER === "auth0") {
    if (!env.AUTH_ISSUER.trim()) {
      issues.push("AUTH_ISSUER must be set when AUTH_PROVIDER=auth0 (e.g. https://YOUR_TENANT.us.auth0.com/)");
    }
    if (!env.AUTH_AUDIENCE.trim()) {
      issues.push("AUTH_AUDIENCE must be set when AUTH_PROVIDER=auth0 (API identifier matching SPA audience)");
    }
  }

  for (const msg of issues) {
    logError("production_config_violation", { message: msg });
  }

  // Default to strict mode in production — set PRODUCTION_STRICT=false only to override intentionally.
  const strict = env.PRODUCTION_STRICT !== "false";
  if (issues.length > 0 && strict) {
    throw new Error(`Production misconfiguration (set PRODUCTION_STRICT=false to override): ${issues.join("; ")}`);
  }
}
