export type DemoEvent = {
  id: string;
  channel: "ai_actions" | "incidents" | "logs";
  title: string;
  detail: string;
  ts: number;
};

const KEY = "astraops_demo_mode";

export function isDemoModeEnabled() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoModeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export function getDemoQueries() {
  return ["optimize cost", "fix latency", "explain decisions"];
}

export function getDemoCopilotReply(query: string) {
  const q = query.toLowerCase();
  if (q.includes("optimize cost")) {
    return "AI Optimization complete: shifted analytics jobs to lower-cost capacity and reduced projected spend by 14%.";
  }
  if (q.includes("fix latency")) {
    return "Latency mitigation executed: auto-scaled api-gateway and adjusted routing policy. p95 improved from 210ms to 138ms.";
  }
  return "Decision explainability: failover was triggered due to elevated packet loss and confidence 93% from telemetry + anomaly model.";
}

export function getDemoEvents(): DemoEvent[] {
  const now = Date.now();
  return [
    { id: "d1", channel: "ai_actions", title: "scale_up", detail: "Scaled API tier +2 replicas", ts: now - 120000 },
    { id: "d2", channel: "logs", title: "cost.optimize", detail: "Moved batch workload to cheaper region", ts: now - 90000 },
    { id: "d3", channel: "incidents", title: "incident.resolved", detail: "Auto-resolved latency incident", ts: now - 60000 },
  ];
}

