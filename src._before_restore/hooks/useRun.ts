import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getRun, listRuns, retryRun, streamRun, triggerRun } from "@/lib/runs";
import { useOrchestrationStore } from "@/store/orchestration";

let runsCache: { ts: number; items: ReturnType<typeof useOrchestrationStore.getState>["runs"] } | null = null;
const RUNS_CACHE_TTL_MS = 5000;

export function useRun() {
  const runs = useOrchestrationStore((s) => s.runs);
  const activeRun = useOrchestrationStore((s) => s.activeRun);
  const setRuns = useOrchestrationStore((s) => s.setRuns);
  const setActiveRun = useOrchestrationStore((s) => s.setActiveRun);
  const setLoading = useOrchestrationStore((s) => s.setLoading);
  const upsertRun = useOrchestrationStore((s) => s.upsertRun);
  const applyRunEvent = useOrchestrationStore((s) => s.applyRunEvent);
  const unsubRef = useRef<(() => void) | null>(null);

  async function refreshRuns() {
    if (runsCache && Date.now() - runsCache.ts < RUNS_CACHE_TTL_MS) {
      setRuns(runsCache.items);
      return runsCache.items;
    }
    setLoading("runs", true);
    try {
      const items = await listRuns();
      runsCache = { ts: Date.now(), items };
      setRuns(items);
      return items;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch runs");
      throw e;
    } finally {
      setLoading("runs", false);
    }
  }

  async function openRun(id: string) {
    const run = await getRun(id);
    setActiveRun(run);
    upsertRun(run);
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = streamRun(id, (evt) => {
      applyRunEvent(id, evt);
      const type = String(evt.type ?? "");
      if (type.startsWith("step.") || type.startsWith("step_") || type === "run.failed" || type === "run_failed") {
        void getRun(id)
          .then((fresh) => {
            setActiveRun(fresh);
            upsertRun(fresh);
          })
          .catch(() => {
            // ignore polling refresh failures while stream continues
          });
      }
    });
    return run;
  }

  async function trigger(payload: { workflowId: string; version?: number }) {
    setLoading("trigger", true);
    try {
      const run = await triggerRun({
        ...payload,
        idempotencyKey: `${payload.workflowId}:${payload.version ?? "latest"}:${Date.now()}`,
      });
      upsertRun(run);
      toast.success("Run triggered");
      return run;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger run");
      throw e;
    } finally {
      setLoading("trigger", false);
    }
  }

  async function retry(id: string) {
    setLoading("trigger", true);
    try {
      const run = await retryRun(id);
      upsertRun(run);
      toast.success("Retry queued");
      return run;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retry run");
      throw e;
    } finally {
      setLoading("trigger", false);
    }
  }

  useEffect(() => () => {
    if (unsubRef.current) unsubRef.current();
  }, []);

  return { runs, activeRun, refreshRuns, openRun, trigger, retry };
}

