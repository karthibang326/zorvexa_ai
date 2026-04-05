import React from "react";

export function getTabStandardMeta(tab: string): { title: string; subtitle: string; right: React.ReactNode | null; bottom: React.ReactNode } {
  const map: Record<string, { title: string; subtitle: string }> = {
    "tenant-console": {
      title: "Tenant console",
      subtitle: "Organization health, AI activity, billing, and audit — scoped to your active workspace.",
    },
    "hybrid-control": {
      title: "AI Control Plane",
      subtitle: "System health, live AI decisions, autonomous activity, and cost intelligence — in one view.",
    },
    "ai-learning": {
      title: "Learning",
      subtitle: "AI memory — accuracy, success rate, and full decision / execution history.",
    },
    "astra-ops-pipeline": {
      title: "Autonomous Loop",
      subtitle: "Ingest workload metrics, review AI decisions, approve execution — wired to /api/astra-ops.",
    },
    "ai-simulation": {
      title: "AI Simulation Mode",
      subtitle: "Preview actions, impacts, and risk before anything touches production.",
    },
    "workload-location": { title: "Workloads", subtitle: "AI placement decisions, rationale, and predicted next moves." },
    failover: { title: "Failover", subtitle: "Autonomous cross-environment failover and recovery." },
    "infra-health": { title: "Infra Health", subtitle: "Unified health for servers, clusters, agents, and networks." },
    workflows: { title: "Workflows", subtitle: "Durable orchestration with controlled AI execution." },
    deployments: {
      title: "Deployments",
      subtitle: "Fleet identity org/project/env/service/region — filters, AI priority, and live health per deployment.",
    },
    incidents: { title: "Incidents", subtitle: "Severity-led timeline and guided response." },
    performance: { title: "Performance", subtitle: "Focused anomaly monitoring with clean visual hierarchy." },
    cost: { title: "Cost Intelligence", subtitle: "AI-first spend reduction with autonomous recommendations." },
    optimization: { title: "Optimization · Cost Intelligence", subtitle: "Cost today, AI savings, and monthly forecast in one AI-driven view." },
    organization: { title: "Organization", subtitle: "Global operations and safety posture." },
    security: { title: "Security", subtitle: "Threat posture with prioritized remediation context." },
    audit: { title: "Audit Logs", subtitle: "Readable change history and anomaly highlights." },
    chat: { title: "AI Copilot", subtitle: "Readable copilot workspace with consistent context." },
    infrastructure: { title: "Infrastructure", subtitle: "Cluster health and platform resources." },
    integrations: { title: "Integrations", subtitle: "Connector lifecycle in a plugin-style list." },
    billing: { title: "Billing", subtitle: "Plan, usage, and payment clarity." },
    settings: { title: "AI Governance", subtitle: "AI is managing your infrastructure autonomously in real time." },
    governance: { title: "Governance", subtitle: "Autonomous policy, risk, and compliance intelligence." },
  };
  const selected = map[tab] ?? { title: "Zorvexa", subtitle: "Autonomous cloud intelligence." };
  return {
    ...selected,
    right: null,
    bottom: <p className="text-sm text-muted-foreground">Streamed logs, run traces, and decision records.</p>,
  };
}
