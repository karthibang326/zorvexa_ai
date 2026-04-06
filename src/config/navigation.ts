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
  CreditCard,
  LayoutDashboard,
  Zap,
  Play,
  Rocket,
  Search,
  HeartPulse,
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
    group: "Intelligence",
    items: [
      {
        id: "overview",
        label: "Control Tower",
        icon: LayoutDashboard,
        description: "Real-time AI Mission Control — health & OODA loop",
      },
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
    ],
  },
  {
    group: "Automation",
    items: [
      {
        id: "workflows",
        label: "Workflows",
        icon: Zap,
        description: "DAG Execution Studio — design & deploy",
      },
      {
        id: "runs",
        label: "Runs",
        icon: Play,
        description: "Live execution stream and historical logs",
      },
      {
        id: "deployments",
        label: "Deployments",
        icon: Rocket,
        description: "Rollouts, rollbacks, and environment state",
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        id: "incidents",
        label: "Incidents",
        icon: Siren,
        description: "Detected and resolved events",
        badge: "0",
      },
      {
        id: "optimization",
        label: "FinOps",
        icon: Sparkles,
        description: "Cost monitoring and AI rightsizing",
      },
      {
        id: "infrastructure",
        label: "Infrastructure",
        icon: Server,
        description: "Clusters, nodes, and cloud targets",
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
        id: "billing",
        label: "Billing & ROI",
        icon: CreditCard,
        description: "Cloud savings, plan management, and invoices",
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
