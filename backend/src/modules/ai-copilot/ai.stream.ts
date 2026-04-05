import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function publishWorkflowAiEvent(workflowId: string, payload: Record<string, unknown>) {
  emitter.emit(`wf:${workflowId}`, payload);
}

export function publishAssistantEvent(payload: Record<string, unknown>) {
  emitter.emit("assistant:global", payload);
}

export function attachWorkflowAiStream(
  workflowId: string,
  onMessage: (payload: Record<string, unknown>) => void
) {
  const key = `wf:${workflowId}`;
  const handler = (payload: Record<string, unknown>) => onMessage(payload);
  emitter.on(key, handler);
  return () => emitter.off(key, handler);
}

export function attachAssistantStream(onMessage: (payload: Record<string, unknown>) => void) {
  const key = "assistant:global";
  const handler = (payload: Record<string, unknown>) => onMessage(payload);
  emitter.on(key, handler);
  return () => emitter.off(key, handler);
}

