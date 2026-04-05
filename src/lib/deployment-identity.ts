/**
 * Canonical deployment identity for AstraOps:
 * `<org>/<project>/<env>/<service>/<region>`
 */

export type DeploymentEnvGroup = "production" | "staging" | "development";

export type CloudProvider = "aws" | "gcp" | "azure";

export interface DeploymentIdentity {
  orgId: string;
  projectId: string;
  envId: string;
  service: string;
  region: string;
}

export function formatDeploymentPath(i: DeploymentIdentity): string {
  return `${i.orgId}/${i.projectId}/${i.envId}/${i.service}/${i.region}`;
}

/** Shorten UUID-like ids for dense UI; full value stays in tooltips where needed. */
export function shortenScopeId(raw: string): string {
  const s = raw.trim();
  if (!s) return "—";
  const hex = s.replace(/-/g, "");
  if (hex.length >= 24 && /^[0-9a-f]+$/i.test(hex)) {
    return `${s.slice(0, 8)}…`;
  }
  return s.length > 18 ? `${s.slice(0, 16)}…` : s;
}

/** Workspace scope line: org / project / env (all segments shortened when long or UUID-like). */
export function formatDeploymentScopeSubtitle(orgId: string, projectId: string, envId: string): string {
  const envRaw = envId.trim();
  const envDisp = !envRaw ? "—" : shortenScopeId(envRaw);
  return `${shortenScopeId(orgId)} / ${shortenScopeId(projectId)} / ${envDisp}`;
}

/** One-line deploy ref for lists (not the full five-part path). */
export function formatDeploymentRef(id: string): string {
  const s = id.trim();
  if (!s) return "—";
  const hex = s.replace(/-/g, "");
  if (hex.length >= 24 && /^[0-9a-f]+$/i.test(hex)) {
    return `${s.slice(0, 8)}…${s.slice(-4)}`;
  }
  return s.length > 14 ? `${s.slice(0, 12)}…` : s;
}

/** Map persisted env ids (e.g. env-prod) to product environment groups. */
export function inferEnvGroup(envId: string): DeploymentEnvGroup {
  const s = envId.toLowerCase();
  if (s.includes("prod") || s === "production") return "production";
  if (s.includes("stag") || s.includes("stage") || s.includes("uat") || s.includes("preprod")) return "staging";
  return "development";
}

export function envGroupLabel(g: DeploymentEnvGroup): string {
  switch (g) {
    case "production":
      return "Production";
    case "staging":
      return "Staging";
    default:
      return "Development";
  }
}

export function shortEnvTag(g: DeploymentEnvGroup): "Prod" | "Stage" | "Dev" {
  switch (g) {
    case "production":
      return "Prod";
    case "staging":
      return "Stage";
    default:
      return "Dev";
  }
}
