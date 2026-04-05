import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Building2,
  FlaskConical,
  MapPin,
  ScrollText,
  Siren,
  Sparkles,
  Globe2,
  Server,
  Shield,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  isNew?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/** Zorvexa — canonical shell navigation (desktop-first). */
export const NAVIGATION_CONFIG: NavGroup[] = [
  {
    group: "Platform",
    items: [
      {
        id: "hybrid-control",
        label: "AI Control Plane",
        icon: Globe2,
        description: "Decision-centric view — health, AI actions, activity, cost",
      },
      {
        id: "ai-learning",
        label: "Learning",
        icon: Brain,
        description: "AI memory — historical decisions, confidence, outcomes",
      },
      {
        id: "astra-ops-pipeline",
        label: "Autonomous Loop",
        icon: Activity,
        description: "Ingest → decide → approve → execute pipeline",
      },
      {
        id: "ai-simulation",
        label: "Simulation",
        icon: FlaskConical,
        description: "Preview AI changes before production impact",
      },
      {
        id: "workload-location",
        label: "Workloads",
        icon: MapPin,
        description: "Placement, topology, and runtime targets",
      },
      { id: "incidents", label: "Incidents", icon: Siren, description: "Detected and resolved events" },
      {
        id: "optimization",
        label: "Optimization",
        icon: Sparkles,
        description: "Latency, cost, and capacity outcomes",
      },
      {
        id: "infrastructure",
        label: "Infrastructure",
        icon: Server,
        description: "Clusters, nodes, and dependency health",
      },
      {
        id: "governance",
        label: "Governance",
        icon: Shield,
        description: "Policy, risk, and compliance posture",
      },
    ],
  },
  {
    group: "Administration",
    items: [
      {
        id: "tenant-console",
        label: "Tenant console",
        icon: Building2,
        description: "Org billing, members, and workspace admin",
      },
      {
        id: "audit",
        label: "Audit logs",
        icon: ScrollText,
        description: "Who and what changed — human and AI actors",
      },
    ],
  },
];
