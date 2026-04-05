import { useMemo } from "react";
import { toast } from "sonner";
import { useOrchestrationStore } from "@/store/orchestration";
import {
  createWorkflow,
  deployWorkflowById,
  fetchWorkflow,
  postWorkflowAiOptimize,
  postWorkflowExecuteById,
  postWorkflowSimulateById,
  revertWorkflowVersion,
  saveWorkflow,
  type WorkflowAiMode,
  type WorkflowExecutionContext,
} from "@/lib/workflows";

function debounce<T extends (...args: any[]) => Promise<any>>(fn: T, waitMs: number) {
  let timer: number | undefined;
  return (...args: Parameters<T>) =>
    new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        try {
          const out = await fn(...args);
          resolve(out);
        } catch (e) {
          reject(e);
        }
      }, waitMs);
    });
}

export function useWorkflow() {
  const setWorkflow = useOrchestrationStore((s) => s.setWorkflow);
  const setLoading = useOrchestrationStore((s) => s.setLoading);

  const debouncedSave = useMemo(
    () =>
      debounce(async (id: string, nodes: unknown[], edges: unknown[]) => {
        return saveWorkflow(id, { nodes, edges });
      }, 400),
    []
  );

  async function loadWorkflow(id: string) {
    setLoading("workflows", true);
    try {
      const wf = await fetchWorkflow(id);
      setWorkflow(wf as any);
      return wf;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load workflow");
      throw e;
    } finally {
      setLoading("workflows", false);
    }
  }

  async function createDefaultWorkflow() {
    setLoading("workflows", true);
    try {
      const wf = await createWorkflow({
        name: "New Workflow",
        type: "agent",
        nodes: [],
        edges: [],
      });
      return wf;
    } finally {
      setLoading("workflows", false);
    }
  }

  async function save(id: string, nodes: unknown[], edges: unknown[]) {
    setLoading("save", true);
    try {
      const saved = await debouncedSave(id, nodes, edges);
      toast.success("Workflow saved");
      return saved;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save workflow");
      throw e;
    } finally {
      setLoading("save", false);
    }
  }

  async function revert(id: string, version: number) {
    setLoading("save", true);
    try {
      const old = await revertWorkflowVersion(id, version);
      toast.success("Workflow reverted");
      return old;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revert workflow");
      throw e;
    } finally {
      setLoading("save", false);
    }
  }

  async function deploy(id: string, payload: { namespace: string; strategy: "canary" | "rolling"; rolloutName?: string }) {
    setLoading("deploy", true);
    try {
      const out = await deployWorkflowById(id, payload);
      toast.success("Deployment started");
      return out;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deploy workflow");
      throw e;
    } finally {
      setLoading("deploy", false);
    }
  }

  async function executeAi(id: string, mode: WorkflowAiMode, context: WorkflowExecutionContext) {
    setLoading("run", true);
    try {
      const out = await postWorkflowExecuteById({ workflowId: id, mode, context });
      toast.success(`Run ${out.status.toLowerCase()}`);
      return out as any;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI execution failed");
      throw e;
    } finally {
      setLoading("run", false);
    }
  }

  async function simulateAi(id: string, mode: WorkflowAiMode, context: WorkflowExecutionContext) {
    setLoading("run", true);
    try {
      const out = await postWorkflowSimulateById({ workflowId: id, mode, context });
      toast.success("Simulation ready");
      return out;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
      throw e;
    } finally {
      setLoading("run", false);
    }
  }

  async function optimizeAi(id: string) {
    setLoading("run", true);
    try {
      const out = await postWorkflowAiOptimize({ workflowId: id });
      toast.success("AI optimization suggestions ready");
      return out;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Optimization failed");
      throw e;
    } finally {
      setLoading("run", false);
    }
  }

  return { loadWorkflow, createDefaultWorkflow, save, revert, deploy, executeAi, simulateAi, optimizeAi };
}

