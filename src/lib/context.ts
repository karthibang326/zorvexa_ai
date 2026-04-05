import { api, setApiAuthToken } from "./api";
import { useContextStore } from "@/store/context";

export async function getContextOptions() {
  const { data } = await api.get("/context/options");
  return data as {
    organizations: Array<{
      id: string;
      name: string;
      role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";
      projects: Array<{ id: string; name: string; environments: Array<{ id: string; name: string }> }>;
    }>;
  };
}

/** Owner-only — removes org data from Postgres (see DELETE /api/org/organizations/:id). */
export async function deleteOrganization(orgId: string) {
  await api.delete(`/org/organizations/${encodeURIComponent(orgId)}`);
}

export async function postSwitchContext(input: { orgId: string; projectId: string; envId: string }) {
  const { data } = await api.post("/context/switch", input);
  const token = String(data?.token ?? "");
  if (token) {
    try {
      localStorage.setItem("quantumops_jwt", token);
    } catch {
      // ignore storage failures
    }
    setApiAuthToken(token);
  }
  return data as {
    token: string;
    context: {
      orgId: string;
      projectId: string;
      envId: string;
      userId: string;
      role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";
    };
  };
}

/**
 * When tenant APIs return 404 (stale org id vs DB), switch to the first org returned by /context/options.
 */
export async function syncContextToFirstAvailableOrg(): Promise<boolean> {
  const data = await getContextOptions();
  const o = data.organizations[0];
  const p = o?.projects?.[0];
  const e = p?.environments?.[0];
  if (!o || !p || !e) return false;
  const out = await postSwitchContext({ orgId: o.id, projectId: p.id, envId: e.id });
  useContextStore.getState().setContext({
    orgId: out.context.orgId,
    projectId: out.context.projectId,
    envId: out.context.envId,
    role: out.context.role,
  });
  try {
    window.dispatchEvent(new CustomEvent("zorvexa:context-changed"));
  } catch {
    /* ignore */
  }
  return true;
}

export function getCurrentContextHeaders() {
  const s = useContextStore.getState();
  return {
    "x-org-id": s.orgId,
    "x-project-id": s.projectId,
    "x-env-id": s.envId,
  };
}

export function withContextQuery(path: string) {
  const s = useContextStore.getState();
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}orgId=${encodeURIComponent(s.orgId)}&projectId=${encodeURIComponent(s.projectId)}&envId=${encodeURIComponent(s.envId)}`;
}

