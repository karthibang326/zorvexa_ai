type AICfoMode = "on" | "off";

export type AICfoState = {
  mode: AICfoMode;
  autoOptimize: boolean;
  autoScaleIdle: boolean;
  forecasting: boolean;
  maxOptimizationsPerHour: number;
  approvalMode: boolean;
  rollbackEnabled: boolean;
  lastUpdatedAt: string;
};

type AICfoEvent = {
  type: string;
  ts: string;
  payload: Record<string, unknown>;
};

const subscribers = new Set<(event: AICfoEvent) => void>();

let state: AICfoState = {
  mode: "off",
  autoOptimize: false,
  autoScaleIdle: false,
  forecasting: true,
  maxOptimizationsPerHour: 8,
  approvalMode: true,
  rollbackEnabled: true,
  lastUpdatedAt: new Date().toISOString(),
};

const emit = (event: AICfoEvent) => {
  for (const s of subscribers) s(event);
};

export const aiCfoService = {
  subscribe(handler: (event: AICfoEvent) => void) {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  },
  getState() {
    return state;
  },
  enable() {
    state = {
      ...state,
      mode: "on",
      autoOptimize: true,
      autoScaleIdle: true,
      forecasting: true,
      lastUpdatedAt: new Date().toISOString(),
    };
    emit({ type: "ai_cfo_enabled", ts: new Date().toISOString(), payload: state as unknown as Record<string, unknown> });
    return state;
  },
  disable() {
    state = {
      ...state,
      mode: "off",
      autoOptimize: false,
      autoScaleIdle: false,
      lastUpdatedAt: new Date().toISOString(),
    };
    emit({ type: "ai_cfo_disabled", ts: new Date().toISOString(), payload: state as unknown as Record<string, unknown> });
    return state;
  },
  emitUpdate(type: string, payload: Record<string, unknown>) {
    emit({ type, ts: new Date().toISOString(), payload });
  },
};

