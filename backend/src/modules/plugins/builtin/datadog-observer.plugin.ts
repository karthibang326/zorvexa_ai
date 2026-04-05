import { AstraPlugin } from "../plugin.types";

const datadogObserverPlugin: AstraPlugin = {
  name: "datadog-observer",
  async init(_config: Record<string, unknown>) {
    // In production this would initialize Datadog API client.
  },
  hooks: {
    onMetric(data) {
      void data;
    },
    onIncident(data) {
      void data;
    },
  },
};

export default datadogObserverPlugin;

