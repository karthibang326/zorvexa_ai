import { EventEmitter } from "events";

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function publishSelfHealingEvent(event: Record<string, unknown>) {
  bus.emit("self-healing", event);
}

export function attachSelfHealingListener(onEvent: (event: Record<string, unknown>) => void) {
  const handler = (event: Record<string, unknown>) => onEvent(event);
  bus.on("self-healing", handler);
  return () => bus.off("self-healing", handler);
}

