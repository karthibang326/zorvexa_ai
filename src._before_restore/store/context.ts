import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ContextRole = "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";

type ContextState = {
  orgId: string;
  projectId: string;
  envId: string;
  role: ContextRole;
  recent: Array<{ orgId: string; projectId: string; envId: string; ts: number }>;
  setContext: (ctx: { orgId: string; projectId: string; envId: string; role?: ContextRole }) => void;
};

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      orgId: "org-1",
      projectId: "proj-1",
      envId: "env-prod",
      role: "OWNER",
      recent: [],
      setContext: ({ orgId, projectId, envId, role }) =>
        set((s) => ({
          orgId,
          projectId,
          envId,
          role: role ?? get().role,
          recent: [{ orgId, projectId, envId, ts: Date.now() }, ...s.recent].slice(0, 8),
        })),
    }),
    { name: "astraops_context_v1" }
  )
);

