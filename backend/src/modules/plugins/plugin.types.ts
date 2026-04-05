export type PluginHookEvent = "onMetric" | "onIncident" | "onDeploy";

export interface AstraPlugin {
  name: string;
  init(config: Record<string, unknown>): Promise<void>;
  hooks: Partial<Record<PluginHookEvent, (data: any) => Promise<void> | void>>;
}

export type PluginScope = {
  orgId: string;
  projectId?: string;
  envId?: string;
};

