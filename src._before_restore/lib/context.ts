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

