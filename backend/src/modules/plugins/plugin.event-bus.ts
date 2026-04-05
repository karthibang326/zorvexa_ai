import { PluginHookEvent } from "./plugin.types";

type PluginHandler = (data: any) => Promise<void> | void;

const listeners: Record<PluginHookEvent, Set<PluginHandler>> = {
  onMetric: new Set<PluginHandler>(),
  onIncident: new Set<PluginHandler>(),
  onDeploy: new Set<PluginHandler>(),
};

export function subscribePluginEvent(event: PluginHookEvent, handler: PluginHandler) {
  listeners[event].add(handler);
  return () => listeners[event].delete(handler);
}

export async function emitPluginEvent(event: PluginHookEvent, data: any) {
  const handlers = Array.from(listeners[event]);
  await Promise.allSettled(handlers.map((h) => Promise.resolve(h(data))));
}

