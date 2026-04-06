/**
 * secrets-manager — Dynamic secret resolution with rotation support.
 *
 * Abstracts three backends:
 *   local           — reads from process.env (dev default)
 *   aws_secrets_manager — AWS Secrets Manager with in-process TTL cache + rotation polling
 *   vault           — HashiCorp Vault with renewable leases
 *
 * The active backend is selected by env.SECRETS_PROVIDER.
 *
 * Usage:
 *   const dbUrl = await secretsManager.get("DATABASE_URL");
 *   const apiKey = await secretsManager.get("OPENAI_API_KEY");
 *
 * Rotation:
 *   secretsManager.startRotationPoller(60_000); // poll AWS/Vault every 60 s
 *   secretsManager.stopRotationPoller();
 */

import { env } from "../config/env";
import { logInfo, logWarn, logError } from "./logger";

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  fetchedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry>();

function fromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function toCache(key: string, value: string, ttlMs: number) {
  cache.set(key, { value, fetchedAt: Date.now(), ttlMs });
}

// ── Backend implementations ───────────────────────────────────────────────────

async function getFromLocal(key: string): Promise<string> {
  const value = process.env[key] ?? "";
  return value;
}

async function getFromAws(key: string): Promise<string> {
  // Lazy-import to avoid bundling AWS SDK in non-AWS deployments.
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager" as string
  ).catch(() => {
    throw new Error(
      "AWS Secrets Manager requires @aws-sdk/client-secrets-manager — add it to dependencies."
    );
  });

  const secretId = process.env.AWS_SECRET_PREFIX
    ? `${process.env.AWS_SECRET_PREFIX}/${key}`
    : key;

  const client = new SecretsManagerClient({ region: env.AWS_REGION || "us-east-1" });
  const cmd = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(cmd);

  const raw = response.SecretString ?? "";
  // Support both plain-string secrets and JSON-encoded objects { key: value }.
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && key in parsed
      ? String(parsed[key])
      : raw;
  } catch {
    return raw;
  }
}

async function getFromVault(key: string): Promise<string> {
  const vaultAddr = process.env.VAULT_ADDR ?? "http://localhost:8200";
  const vaultToken = process.env.VAULT_TOKEN ?? "";
  const vaultPath = process.env.VAULT_SECRET_PATH ?? "secret/data/zorvexa";

  const url = `${vaultAddr}/v1/${vaultPath}`;
  const response = await fetch(url, {
    headers: { "X-Vault-Token": vaultToken },
  });

  if (!response.ok) {
    throw new Error(`Vault responded ${response.status} for path ${vaultPath}`);
  }

  const body = (await response.json()) as { data?: { data?: Record<string, string> } };
  const secrets = body?.data?.data ?? {};

  if (!(key in secrets)) {
    throw new Error(`Secret "${key}" not found in Vault path ${vaultPath}`);
  }
  return secrets[key];
}

// ── Public API ────────────────────────────────────────────────────────────────

const TTL_MS = 5 * 60 * 1000; // 5-minute cache for remote backends

export const secretsManager = {
  /**
   * Resolve a secret by name.
   * Remote backends are cached for 5 minutes — safe for rotation
   * (the poller below invalidates on change).
   */
  async get(key: string): Promise<string> {
    const cached = fromCache(key);
    if (cached !== null) return cached;

    let value: string;
    const provider = env.SECRETS_PROVIDER;

    try {
      if (provider === "aws_secrets_manager") {
        value = await getFromAws(key);
        toCache(key, value, TTL_MS);
      } else if (provider === "vault") {
        value = await getFromVault(key);
        toCache(key, value, TTL_MS);
      } else {
        // local — no cache needed (process.env is already in-memory)
        value = await getFromLocal(key);
      }
    } catch (err) {
      logError("secrets_manager_get_failed", {
        key,
        provider,
        message: err instanceof Error ? err.message : String(err),
      });
      // Fallback to process.env so the service doesn't crash on transient failures
      value = process.env[key] ?? "";
    }

    return value;
  },

  /** Invalidate a specific secret from the cache (force re-fetch on next access). */
  invalidate(key: string) {
    cache.delete(key);
    logInfo("secrets_manager_invalidated", { key });
  },

  /** Invalidate all cached secrets. */
  invalidateAll() {
    cache.clear();
    logInfo("secrets_manager_invalidated_all");
  },

  // ── Rotation poller ─────────────────────────────────────────────────────────

  _pollerId: null as ReturnType<typeof setInterval> | null,

  /**
   * Start polling the secrets backend for rotated values.
   * On each tick, re-fetches all currently-cached secrets and updates the
   * cache if a value has changed — zero-downtime rotation.
   *
   * @param intervalMs  Poll frequency. Defaults to 60 000 ms (1 min).
   */
  startRotationPoller(intervalMs = 60_000) {
    if (this._pollerId) return; // already running
    if (env.SECRETS_PROVIDER === "local") return; // no rotation needed for process.env

    this._pollerId = setInterval(async () => {
      const keys = [...cache.keys()];
      for (const key of keys) {
        try {
          const previous = cache.get(key)?.value;
          cache.delete(key); // force re-fetch
          const current = await this.get(key);
          if (previous !== undefined && previous !== current) {
            logWarn("secrets_manager_rotation_detected", { key });
          }
        } catch (err) {
          logError("secrets_manager_rotation_poll_failed", {
            key,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }, intervalMs);

    logInfo("secrets_manager_poller_started", { intervalMs, provider: env.SECRETS_PROVIDER });
  },

  stopRotationPoller() {
    if (this._pollerId) {
      clearInterval(this._pollerId);
      this._pollerId = null;
      logInfo("secrets_manager_poller_stopped");
    }
  },
};
