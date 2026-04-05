export interface DocCodeBlock {
  label: string;
  language: "bash" | "json" | "yaml";
  code: string;
}

export interface DocMajorSection {
  id: string;
  title: string;
  emoji: string;
  nav: { id: string; label: string }[];
  /** Short intro — no long paragraphs */
  blurb: string;
  examples: DocCodeBlock[];
}

export interface DocSearchItem {
  id: string;
  title: string;
  section: string;
  href: string;
  /** Extra text for matching */
  keywords: string;
}

export const DOC_QUICKSTART = {
  title: "Get started in 5 minutes",
  steps: [
    "Connect your cloud",
    "Deploy Zorvexa agent",
    "Enable AI control plane",
  ],
  ctaLabel: "Start Quickstart →",
  ctaHref: "#getting-started",
};

export const DOC_COMMON_TASKS: { id: string; label: string; hint: string; anchor: string }[] = [
  {
    id: "task-scale",
    label: "Scale a workload automatically",
    hint: "AI & Automation · policies",
    anchor: "#ai-automation",
  },
  {
    id: "task-cost",
    label: "Reduce cloud cost",
    hint: "Getting Started · concepts",
    anchor: "#getting-started",
  },
  {
    id: "task-latency",
    label: "Fix a latency issue",
    hint: "AI & Automation · simulation",
    anchor: "#ai-automation",
  },
];

export const DOC_SECTIONS: DocMajorSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    emoji: "🚀",
    blurb: "Wire up accounts, install the agent, and ship your first autonomous change.",
    nav: [
      { id: "quickstart", label: "Quickstart" },
      { id: "installation", label: "Installation" },
      { id: "first-deployment", label: "First Deployment" },
      { id: "core-concepts", label: "Core Concepts" },
    ],
    examples: [
      {
        label: "API · register cloud connection",
        language: "bash",
        code: `curl -sS https://api.zorvexa.ai/v1/connections \\
  -H "Authorization: Bearer $ZORVEXA_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "aws",
    "accountId": "123456789012",
    "roleArn": "arn:aws:iam::123456789012:role/ZorvexaRead"
  }'`,
      },
      {
        label: "Kubernetes · agent DaemonSet",
        language: "yaml",
        code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: zorvexa-agent
  namespace: zorvexa-system
spec:
  selector:
    matchLabels:
      app: zorvexa-agent
  template:
    metadata:
      labels:
        app: zorvexa-agent
    spec:
      serviceAccountName: zorvexa-agent
      containers:
        - name: agent
          image: zorvexa/agent:2.1
          env:
            - name: ZORVEXA_CONTROL_PLANE_URL
              value: "https://control.zorvexa.ai"`,
      },
      {
        label: "AI action · approve first rollout",
        language: "json",
        code: `{
  "action": "deployment.promote",
  "target": {
    "cluster": "prod-use1",
    "namespace": "payments",
    "deployment": "api-gateway"
  },
  "mode": "autonomous",
  "safety": {
    "maxSurgePercent": 25,
    "rollbackOnError": true
  }
}`,
      },
    ],
  },
  {
    id: "api-sdk",
    title: "API & SDK",
    emoji: "⚙️",
    blurb: "Authenticate, call the Agent API, stream metrics, and react to webhooks.",
    nav: [
      { id: "authentication", label: "Authentication" },
      { id: "agent-api", label: "Agent API" },
      { id: "metrics-logs", label: "Metrics & Logs" },
      { id: "webhooks", label: "Webhooks" },
    ],
    examples: [
      {
        label: "API · OAuth-style token exchange",
        language: "bash",
        code: `curl -sS https://api.zorvexa.ai/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "'"$ZORVEXA_CLIENT_ID"'",
    "clientSecret": "'"$ZORVEXA_CLIENT_SECRET"'",
    "grantType": "client_credentials"
  }' | jq -r .accessToken`,
      },
      {
        label: "Kubernetes · metrics RBAC",
        language: "yaml",
        code: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: zorvexa-metrics-reader
rules:
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: zorvexa-metrics-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: zorvexa-metrics-reader
subjects:
  - kind: ServiceAccount
    name: zorvexa-agent
    namespace: zorvexa-system`,
      },
      {
        label: "AI action · agent task from API",
        language: "json",
        code: `{
  "task": "analyze_incident",
  "incidentId": "inc_7f3a9c",
  "context": {
    "signals": ["cpu_saturation", "p99_latency"],
    "preferredOutcome": "stabilize_then_scale"
  },
  "execution": {
    "dryRun": false,
    "notifyChannel": "slack://zorvexa-alerts"
  }
}`,
      },
    ],
  },
  {
    id: "ai-automation",
    title: "AI & Automation",
    emoji: "🧠",
    blurb: "Define how the engine scales workloads, decides incidents, and runs simulations before execution.",
    nav: [
      { id: "autoscaling-policies", label: "Auto-scaling policies" },
      { id: "ai-decision-engine", label: "AI decision engine" },
      { id: "custom-ai-prompts", label: "Custom AI prompts" },
      { id: "simulation-mode", label: "Simulation mode" },
    ],
    examples: [
      {
        label: "API · list scaling policies",
        language: "bash",
        code: `curl -sS "https://api.zorvexa.ai/v1/policies/autoscale?cluster=prod-use1" \\
  -H "Authorization: Bearer $ZORVEXA_TOKEN"`,
      },
      {
        label: "Kubernetes · autoscale policy ConfigMap",
        language: "yaml",
        code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: zorvexa-autoscale-policies
  namespace: zorvexa-system
data:
  policies.yaml: |
    policies:
      - name: api-latency-guard
        match:
          deployment: checkout-api
        triggers:
          - metric: http.server.duration.p99
            thresholdMs: 450
        actions:
          - type: horizontal_pod_autoscaler_patch
            minReplicas: 4
            maxReplicas: 40`,
      },
      {
        label: "AI action · simulation preview",
        language: "json",
        code: `{
  "simulation": true,
  "proposedAction": "patch_hpa",
  "expectedEffects": {
    "latencyMsDelta": -120,
    "monthlyCostDeltaUsd": 48,
    "riskScore": 0.12
  },
  "approval": "required_above_cost_delta_usd: 200"
}`,
      },
    ],
  },
  {
    id: "governance-security",
    title: "Governance & Security",
    emoji: "🔐",
    blurb: "RBAC, audit trails, compliance guardrails, and hardening patterns for production.",
    nav: [
      { id: "rbac", label: "RBAC" },
      { id: "audit-logs", label: "Audit logs" },
      { id: "compliance-policies", label: "Compliance policies" },
      { id: "security-best-practices", label: "Security best practices" },
    ],
    examples: [
      {
        label: "API · export audit window",
        language: "bash",
        code: `curl -sS "https://api.zorvexa.ai/v1/audit/events?from=2026-07-01&to=2026-07-24" \\
  -H "Authorization: Bearer $ZORVEXA_TOKEN" \\
  -H "Accept: application/x-ndjson"`,
      },
      {
        label: "Kubernetes · namespace policy",
        language: "yaml",
        code: `apiVersion: v1
kind: LimitRange
metadata:
  name: zorvexa-defaults
  namespace: production
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      default:
        cpu: "500m"
        memory: "512Mi"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes: ["Ingress"]`,
      },
      {
        label: "AI action · blocked by policy",
        language: "json",
        code: `{
  "decision": "deny",
  "action": "cluster.admin.delete_namespace",
  "reason": "violates_policy:production_lock",
  "policyId": "pol_prod_no_destructive",
  "auditRef": "aud_91bc2e"
}`,
      },
    ],
  },
];

function buildSearchIndex(): DocSearchItem[] {
  const items: DocSearchItem[] = [];
  for (const sec of DOC_SECTIONS) {
    items.push({
      id: `${sec.id}-section`,
      title: `${sec.emoji} ${sec.title}`,
      section: "Browse",
      href: `#${sec.id}`,
      keywords: `${sec.title} ${sec.blurb}`,
    });
    for (const n of sec.nav) {
      items.push({
        id: `${sec.id}-${n.id}`,
        title: n.label,
        section: sec.title,
        href: `#${sec.id}-${n.id}`,
        keywords: n.label,
      });
    }
  }
  for (const t of DOC_COMMON_TASKS) {
    items.push({
      id: t.id,
      title: t.label,
      section: "Common tasks",
      href: t.anchor,
      keywords: `${t.label} ${t.hint}`,
    });
  }
  items.push({
    id: "quickstart-hero",
    title: DOC_QUICKSTART.title,
    section: "Quickstart",
    href: "#quickstart",
    keywords: "quickstart 5 minutes connect deploy zorvexa agent",
  });
  return items;
}

export const DOC_SEARCH_INDEX: DocSearchItem[] = buildSearchIndex();
