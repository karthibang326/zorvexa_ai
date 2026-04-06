import { api } from "./api";
import { RunItem } from "@/store/orchestration";

export async function triggerRun(payload: {
  workflowId: string;
  version?: number;
  idempotencyKey: string;
}): Promise<RunItem> {
  const { data } = await api.post("/runs/trigger", payload);
  return data as RunItem;
}

export async function listRuns(): Promise<RunItem[]> {
  const { data } = await api.get("/runs");
  return (data?.items ?? []) as RunItem[];
}

export async function getRun(id: string): Promise<RunItem> {
  const { data } = await api.get(`/runs/${encodeURIComponent(id)}`);
  return data as RunItem;
}

export async function retryRun(id: string): Promise<RunItem> {
  const { data } = await api.post(`/runs/${encodeURIComponent(id)}/retry`, {});
  return data as RunItem;
}

export function streamRun(
  runId: string,
  onEvent: (evt: Record<string, unknown>) => void
): () => void {
  const base =
    import.meta.env.VITE_WORKFLOWS_API_URL?.replace(/\/$/, "") ?? "";
  const es = new EventSource(`${base}/api/runs/${encodeURIComponent(runId)}/stream`);
  es.addEventListener("update", (e) => {
    try {
      onEvent(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore parse errors
    }
  });
  return () => es.close();
}

