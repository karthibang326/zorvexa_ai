import { EventEmitter } from "events";

const stream = new EventEmitter();
stream.setMaxListeners(0);

export function publishFinopsEvent(payload: Record<string, unknown>) {
  stream.emit("finops", payload);
}

export function attachFinopsListener(onEvent: (payload: Record<string, unknown>) => void) {
  const handler = (payload: Record<string, unknown>) => onEvent(payload);
  stream.on("finops", handler);
  return () => stream.off("finops", handler);
}

