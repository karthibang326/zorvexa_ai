import { create } from "zustand";

export type RunStepStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
export type RunStatus = "RUNNING" | "SUCCESS" | "FAILED" | "RETRYING" | "QUEUED";

export interface RunStepLog {
  id: string;
  runId: string;
  stepName: string;
  stepIndex: number;
  status: RunStepStatus;
  message?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface RunItem {
  id: string;
  workflowId: string;
  workflowVersion: string | number;
  status: RunStatus;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
  steps?: RunStepLog[];
}

export interface WorkflowItem {
  id: string;
  name: string;
  version: string | number;
  nodes: unknown[];
  edges: unknown[];
}

interface OrchestrationState {
  workflows: Record<string, WorkflowItem>;
  runs: RunItem[];
  activeRun: RunItem | null;
  activeWorkflowId: string | null;
  loading: {
    workflows: boolean;
    runs: boolean;
    save: boolean;
    deploy: boolean;
    trigger: boolean;
  };
  setWorkflow: (wf: WorkflowItem) => void;
  setRuns: (runs: RunItem[]) => void;
  upsertRun: (run: RunItem) => void;
  setActiveRun: (run: RunItem | null) => void;
  setActiveWorkflowId: (id: string | null) => void;
  setLoading: (key: keyof OrchestrationState["loading"], value: boolean) => void;
  applyRunEvent: (runId: string, evt: Record<string, unknown>) => void;
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  workflows: {},
  runs: [],
  activeRun: null,
  activeWorkflowId: null,
  loading: {
    workflows: false,
    runs: false,
    save: false,
    deploy: false,
    trigger: false,
  },
  setWorkflow: (wf) =>
    set((s) => ({
      workflows: { ...s.workflows, [wf.id]: wf },
    })),
  setRuns: (runs) => set({ runs }),
  upsertRun: (run) =>
    set((s) => {
      const idx = s.runs.findIndex((r) => r.id === run.id);
      if (idx === -1) return { runs: [run, ...s.runs] };
      const next = [...s.runs];
      next[idx] = { ...next[idx], ...run };
      return { runs: next };
    }),
  setActiveRun: (run) => set({ activeRun: run }),
  setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),
  setLoading: (key, value) =>
    set((s) => ({
      loading: { ...s.loading, [key]: value },
    })),
  applyRunEvent: (runId, evt) =>
    set((s) => {
      const mutate = (r: RunItem): RunItem => {
        if (r.id !== runId) return r;
        const t = String(evt.type || "");
        const stepId = String(evt.stepId ?? "");
        const stepName = String(evt.stepName ?? (stepId || "step"));
        const baseSteps = Array.isArray(r.steps) ? [...r.steps] : [];
        if (t === "step.started" || t === "step_started") {
          const idx = baseSteps.findIndex((x) => x.id === stepId);
          const next = {
            id: stepId || `s-${Date.now()}`,
            runId,
            stepName,
            stepIndex: idx >= 0 ? baseSteps[idx].stepIndex : baseSteps.length,
            status: "RUNNING" as const,
            message: "step started",
          };
          if (idx >= 0) baseSteps[idx] = { ...baseSteps[idx], ...next };
          else baseSteps.push(next);
          return { ...r, status: "RUNNING", steps: baseSteps };
        }
        if (t === "step.completed" || t === "step_completed") {
          const idx = baseSteps.findIndex((x) => x.id === stepId);
          const next = {
            id: stepId || `s-${Date.now()}`,
            runId,
            stepName,
            stepIndex: idx >= 0 ? baseSteps[idx].stepIndex : baseSteps.length,
            status: "SUCCESS" as const,
            message: String(evt.message ?? "step completed"),
          };
          if (idx >= 0) baseSteps[idx] = { ...baseSteps[idx], ...next };
          else baseSteps.push(next);
          return { ...r, steps: baseSteps };
        }
        if (t === "step.failed" || t === "step_failed") {
          const idx = baseSteps.findIndex((x) => x.id === stepId);
          const next = {
            id: stepId || `s-${Date.now()}`,
            runId,
            stepName,
            stepIndex: idx >= 0 ? baseSteps[idx].stepIndex : baseSteps.length,
            status: "FAILED" as const,
            message: String(evt.message ?? "step failed"),
          };
          if (idx >= 0) baseSteps[idx] = { ...baseSteps[idx], ...next };
          else baseSteps.push(next);
          return { ...r, status: "FAILED", steps: baseSteps, errorMessage: String(evt.message ?? "") };
        }
        if (t === "run.completed") return { ...r, status: "SUCCESS" };
        if (t === "run.failed" || t === "run_failed") return { ...r, status: "FAILED", errorMessage: String(evt.message ?? "") };
        return r;
      };
      return {
        runs: s.runs.map(mutate),
        activeRun: s.activeRun ? mutate(s.activeRun) : null,
      };
    }),
}));

