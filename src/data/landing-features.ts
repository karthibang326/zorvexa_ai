import type { LucideIcon } from "lucide-react";
import { Brain, Cloud, Coins, Scale, Shield, Siren } from "lucide-react";

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  benefit: string;
  /** Shown on the dedicated /features page and optional expanded layouts */
  highlights: readonly string[];
};

export const LANDING_FEATURES: readonly LandingFeature[] = [
  {
    icon: Scale,
    title: "Autonomous Control Plane",
    benefit: "Operate one system of record for AI mode, safety, and execution — not a dozen dashboards.",
    highlights: [
      "Unified observe → decide → act workflows with clear ownership",
      "Policy bundles and approval gates per environment and team",
      "Live posture across Kubernetes, serverless, and managed services",
    ],
  },
  {
    icon: Siren,
    title: "AI Incident Resolution",
    benefit: "Contain and remediate before escalation — with blast-radius and rollback built in.",
    highlights: [
      "Correlates metrics, logs, traces, and cost anomalies in one narrative",
      "Suggested runbooks with blast-radius and rollback checkpoints",
      "Automated containment paths with optional human-in-the-loop",
    ],
  },
  {
    icon: Coins,
    title: "Cost Optimization Engine",
    benefit: "Turn waste into savings your CFO can recognize, continuously, without ticket queues.",
    highlights: [
      "Continuous rightsizing, commitment, and reservation intelligence",
      "Unit economics and chargeback-ready breakdowns by team or product",
      "Recommendations linked to executable change — not static reports",
    ],
  },
  {
    icon: Cloud,
    title: "Multi-cloud Governance",
    benefit: "Same policies and evidence across AWS, GCP, and Azure — no siloed runbooks.",
    highlights: [
      "One policy model across major clouds and Kubernetes estates",
      "Consistent tagging, ownership, and cost allocation metadata",
      "Drift detection and compliance snapshots across accounts",
    ],
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    benefit: "Prove who acted, why, and under which policy — audit-ready by default.",
    highlights: [
      "Immutable audit trail for every autonomous and manual action",
      "Scoped execution roles tied to org, project, and environment",
      "Exportable evidence packs for SOC 2 and internal risk reviews",
    ],
  },
  {
    icon: Brain,
    title: "AI Explainability",
    benefit: "Every decision shows signals, alternatives, and confidence — trust at machine speed.",
    highlights: [
      "Signal attribution and confidence scores on each recommendation",
      "Alternatives considered with explicit rejection rationale",
      "Transparent “why now” context for operators and leadership",
    ],
  },
];
