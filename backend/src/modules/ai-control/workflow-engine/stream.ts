type WorkflowStreamEvent = {
  workflowId: string;
  runId: string;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
};

const subs = new Set<(ev: WorkflowStreamEvent) => void>();
const history: WorkflowStreamEvent[] = [];

export function emitWorkflowStream(event: Omit<WorkflowStreamEvent, "ts">) {
  const next: WorkflowStreamEvent = { ...event, ts: new Date().toISOString() };
  history.push(next);
  if (history.length > 600) history.splice(0, history.length - 600);
  for (const s of subs) s(next);
}

export function subscribeWorkflowStream(handler: (ev: WorkflowStreamEvent) => void) {
  subs.add(handler);
  return () => subs.delete(handler);
}

export function getWorkflowStreamHistory(workflowId?: string) {
  if (!workflowId) return history.slice(-120);
  return history.filter((h) => h.workflowId === workflowId).slice(-120);
}
