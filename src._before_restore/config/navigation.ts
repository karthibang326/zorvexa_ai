import {
  Rocket, Workflow, Activity,
  BarChart2, Gauge,
  DollarSign, Sparkles, Building2,
  Shield, FileSearch,
  MessageSquare,
  Server, Plug, Settings, CreditCard, Siren, FlaskConical,
  Globe2, MapPin, ArrowRightLeft, HeartPulse,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  description: string;
  badge?: string;
  isNew?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

// ─── Canonical navigation ─────────────────────────────────────────────────────
// 6 groups, max 3 items each.
// Grouped by user intent, not backend component.
// Removed: Events, Failures, Live Logs, Schedules, Templates (inside Workflows), Webhooks→Integrations.
// Merged: Runs + Failures + Logs → "Runs" with internal tabs.

export const NAVIGATION_CONFIG: NavGroup[] = [
  {
    group: "Operate",
    items: [
      { id: "deployments", label: "Deployments",  icon: Rocket,    description: "Deploy and manage services"            },
      { id: "workflows",   label: "Workflows",    icon: Workflow,  description: "Orchestrate automated pipelines", badge: "10" },
      { id: "runs",        label: "Runs",         icon: Activity,  description: "Execution history, logs, traces"        },
    ],
  },
  {
    group: "Observe",
    items: [
      { id: "monitoring",   label: "Monitoring",   icon: BarChart2, description: "Live metrics and alerts"    },
      { id: "performance",  label: "Performance",  icon: Gauge,     description: "Latency, throughput, SLOs"  },
      { id: "incidents",    label: "Incidents",    icon: Siren,     description: "AI incident response lifecycle" },
      { id: "chaos",        label: "Chaos",        icon: FlaskConical, description: "Failure injection experiments" },
    ],
  },
  {
    group: "Optimize",
    items: [
      { id: "cost", label: "Cost", icon: DollarSign, description: "Cloud spend analysis and optimization" },
      { id: "optimization", label: "AI Optimize", icon: Sparkles, description: "System-wide AI optimization control plane" },
      { id: "organization", label: "Organization", icon: Building2, description: "Global AI control and org-level visibility" },
    ],
  },
  {
    group: "Security",
    items: [
      { id: "security", label: "Security",   icon: Shield,     description: "Threat detection and policy"  },
      { id: "audit",    label: "Audit Logs", icon: FileSearch, description: "Compliance and change history" },
    ],
  },
  {
    group: "AI Control",
    items: [
      { id: "chat",   label: "AI Copilot", icon: MessageSquare, description: "Natural language control plane" },
    ],
  },
  {
    group: "ASTRAOPS Hybrid",
    items: [
      { id: "hybrid-control",   label: "Control Plane",     icon: Globe2,         description: "Unified cloud + on-prem command center", badge: "NEW", isNew: true },
      { id: "workload-location",label: "Workload Placement", icon: MapPin,         description: "AI placement intelligence across all infra", isNew: true },
      { id: "failover",         label: "Failover",           icon: ArrowRightLeft, description: "Autonomous cross-environment failover",  isNew: true },
      { id: "infra-health",     label: "Infra Health",       icon: HeartPulse,     description: "Servers, clusters, agents, networks",    isNew: true },
    ],
  },
  {
    group: "Platform",
    items: [
      { id: "infrastructure", label: "Infrastructure", icon: Server,   description: "Clusters, nodes, compute"      },
      { id: "integrations",   label: "Integrations",   icon: Plug,     description: "Webhooks, events, connectors"  },
      { id: "billing",        label: "Billing",        icon: CreditCard, description: "Plans, usage, and invoices"   },
      { id: "settings",       label: "Settings",       icon: Settings, description: "Workspace and account config"  },
    ],
  },
];
