import type { AiTargetProvider, MetricSnapshot } from "../ai-decision-engine/types";
import { env } from "../../config/env";

/** Demo mapping: each synthetic service is pinned to a control plane for multi-cloud demos. */
export const RESOURCE_TO_PROVIDER: Record<string, AiTargetProvider> = {
  "payments-api": "aws",
  "checkout-edge": "gcp",
  "inventory-svc": "azure",
  "auth-gateway": "kubernetes",
};

function resourceMapFromEnv(): Record<string, AiTargetProvider> | null {
  const raw = env.MULTI_CLOUD_RESOURCE_MAP_JSON.trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, AiTargetProvider> = {};
    for (const [k, v] of Object.entries(o)) {
      const p = String(v).toLowerCase();
      if (p === "aws" || p === "gcp" || p === "azure" || p === "kubernetes") {
        out[String(k).trim()] = p;
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * Resolves where autonomous actions should run: optional env override, else metric hint, else AWS.
 */
export function resolveAiTargetProvider(m: MetricSnapshot): AiTargetProvider {
  const o = env.ASTRA_DEFAULT_AI_PROVIDER.trim().toLowerCase();
  if (o === "aws" || o === "gcp" || o === "azure" || o === "kubernetes") return o;
  return m.provider;
}

export function providerForResourceName(resource: string): AiTargetProvider {
  const custom = resourceMapFromEnv();
  if (custom?.[resource]) return custom[resource];
  return RESOURCE_TO_PROVIDER[resource] ?? "aws";
}
