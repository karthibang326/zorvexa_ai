import React from "react";

export function getTabStandardMeta(tab: string): { title: string; subtitle: string; right: React.ReactNode | null; bottom: React.ReactNode } {
  const map: Record<string, { title: string; subtitle: string }> = {
    workflows: { title: "Workflows", subtitle: "Durable orchestration with controlled AI execution." },
    deployments: { title: "Deployments", subtitle: "Self-driving release decisions with business-safe automation." },
    incidents: { title: "Incidents", subtitle: "Severity-led timeline and guided response." },
    performance: { title: "Performance", subtitle: "Focused anomaly monitoring with clean visual hierarchy." },
    cost: { title: "Cost", subtitle: "Savings-first cost intelligence and optimization." },
    optimization: { title: "AI Optimize", subtitle: "Actionable recommendations with no visual clutter." },
    organization: { title: "Organization", subtitle: "Global operations and safety posture." },
    security: { title: "Security", subtitle: "Threat posture with prioritized remediation context." },
    audit: { title: "Audit Logs", subtitle: "Readable change history and anomaly highlights." },
    chat: { title: "AI Copilot", subtitle: "Readable copilot workspace with consistent context." },
    infrastructure: { title: "Infrastructure", subtitle: "Cluster health and platform resources." },
    integrations: { title: "Integrations", subtitle: "Connector lifecycle in a plugin-style list." },
    billing: { title: "Billing", subtitle: "Plan, usage, and payment clarity." },
    settings: { title: "Settings", subtitle: "Structured, tab-oriented platform configuration." },
  };
  const selected = map[tab] ?? { title: "AstraOps", subtitle: "Unified platform experience." };
  return {
    ...selected,
    right: null,
    bottom: <p className="text-sm text-muted-foreground">Streamed logs, run traces, and decision records.</p>,
  };
}
