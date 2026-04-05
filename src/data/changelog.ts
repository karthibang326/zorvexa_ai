export type ChangelogFilter = "all" | "features" | "improvements" | "fixes";

export type ImpactKind = "performance" | "cost" | "stability" | "security";

export interface ChangelogImpact {
  kind: ImpactKind;
  /** e.g. "+40%", "-18%" — omit for Stability / Security when not numeric */
  value?: string;
}

export interface ChangelogLine {
  /** One line: "Context — Outcome" */
  text: string;
  impact?: ChangelogImpact;
}

export interface ChangelogRelease {
  version: string;
  /** e.g. JULY 24, 2026 */
  dateLabel: string;
  headline: string;
  /** Shown when "View details" is expanded */
  detail: string;
  new: ChangelogLine[];
  improvements: ChangelogLine[];
  fixes: ChangelogLine[];
}

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "v2.1.0",
    dateLabel: "JULY 24, 2026",
    headline: "Multi-Cloud Governance & Fleet Management",
    detail:
      "This release unifies visibility and policy across AWS, GCP, and Azure. Fleet View gives operators a single pane for inventory, drift, and spend — with governance rules that apply consistently before changes hit production.",
    new: [
      {
        text: "Fleet View — Global dashboard to manage all cloud resources in one place",
        impact: { kind: "cost", value: "-12%" },
      },
      {
        text: "Policy Bundles — Ship governance as versioned, reusable packages across accounts",
        impact: { kind: "security" },
      },
    ],
    improvements: [
      {
        text: "AI Latency — Reduced decision response time by 40%",
        impact: { kind: "performance", value: "+40%" },
      },
      {
        text: "Cost Graphs — Clearer attribution from service → team → budget owner",
        impact: { kind: "cost", value: "-8%" },
      },
    ],
    fixes: [
      {
        text: "K8s Secrets — Fixed RBAC inheritance issue in multi-tenant clusters",
        impact: { kind: "stability" },
      },
      {
        text: "Azure AD Sync — Resolved token refresh edge case during peak SSO traffic",
        impact: { kind: "stability" },
      },
    ],
  },
  {
    version: "v2.0.4",
    dateLabel: "JUNE 18, 2026",
    headline: "Enhanced Security & Audit Logging",
    detail:
      "Enterprise teams asked for provable control: who did what, when, and with which approval. This patch deepens audit coverage, tightens SSO session handling, and improves reliability for large Postgres fleets.",
    new: [
      {
        text: "Audit Timeline — Exportable trail of AI actions, approvals, and rollbacks",
        impact: { kind: "security" },
      },
    ],
    improvements: [
      {
        text: "Dark UI — Higher contrast tokens and improved mobile breakpoints",
        impact: { kind: "stability" },
      },
      {
        text: "DB Pools — Tuned connection pooling for high-throughput Postgres workloads",
        impact: { kind: "performance", value: "+22%" },
      },
    ],
    fixes: [
      {
        text: "Webhooks — Fixed duplicate delivery on slow retry paths",
        impact: { kind: "stability" },
      },
    ],
  },
  {
    version: "v2.0.0",
    dateLabel: "MAY 02, 2026",
    headline: "Autonomous Ops Control Plane",
    detail:
      "v2 introduces the unified control plane for autonomous remediation: safer defaults, clearer blast-radius controls, and a single status model so teams know when AI is active, partial, or paused.",
    new: [
      {
        text: "AI Control Center — One surface for mode, safety, and simulation",
        impact: { kind: "security" },
      },
      {
        text: "Simulation Mode — Preview latency, cost, and risk before execution",
        impact: { kind: "cost", value: "-18%" },
      },
    ],
    improvements: [
      {
        text: "Incident Router — Faster correlation across metrics, logs, and deployments",
        impact: { kind: "performance", value: "+35%" },
      },
    ],
    fixes: [
      {
        text: "GCP Billing API — Handled paginated export edge cases without dropped rows",
        impact: { kind: "stability" },
      },
    ],
  },
  {
    version: "v1.9.2",
    dateLabel: "MAR 14, 2026",
    headline: "Cost Intelligence & Chargeback",
    detail:
      "Finance-ready views: showback and chargeback with guardrails so engineering leads see spend drivers without waiting for a monthly spreadsheet.",
    new: [
      {
        text: "Chargeback Rules — Map spend to teams and cost centers automatically",
        impact: { kind: "cost", value: "-15%" },
      },
    ],
    improvements: [
      {
        text: "Forecast Model — Tighter confidence bands using seasonality hints",
        impact: { kind: "performance" },
      },
    ],
    fixes: [
      {
        text: "CSV Export — Fixed UTF-8 BOM handling for Excel on Windows",
        impact: { kind: "stability" },
      },
    ],
  },
];
