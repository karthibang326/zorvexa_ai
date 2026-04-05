# Backend completion — what you must provide

Use this as the handoff list for **production** or **staging** Zorvexa. Defaults in repo are safe for local demo (simulation on).

**Multi-cloud routing and live matrix:** see [MULTI_CLOUD.md](./MULTI_CLOUD.md) (`MULTI_CLOUD_RESOURCE_MAP_JSON`, per-provider execution).

## Production checklist (API process)

| Setting | Production value |
|---------|------------------|
| `NODE_ENV` | `production` |
| `AUTH_DEV_BYPASS` | `false` |
| `JWT_SECRET` | Strong random string (32+ characters, not the dev default) |
| `AI_OPS_LOOP_START_ON_BOOT` | Usually `false` — run the ops loop from **one** worker/cron, not every API replica |
| `PRODUCTION_STRICT` | Optional `true` — process **exits** on boot if auth/JWT rules are violated |
| `SIMULATION_MODE` | `false` only when live cloud/K8s credentials and approvals are intentional |
| Health | **Liveness:** `GET /health` (process up). **Readiness:** `GET /ready` (PostgreSQL `SELECT 1`) |
| Deploy hooks | `CLOUD_DEPLOY_WEBHOOK_URL` (+ optional bearer) when `SIMULATION_MODE=false` triggers real `deployWorkflow` POSTs |
| Metrics | Optional `OPS_METRICS_URL` (+ bearer) — shared JSON for **ops loop** and **adapter `getMetrics`**. Per-provider natives when OPS URL unset: **AWS** CloudWatch (`AWS_LIVE_ADAPTER_METRICS` + dimensions); **GCP** Monitoring (`GCP_LIVE_ADAPTER_METRICS` + `GCP_MONITORING_FILTER` + project); **Azure** Monitor (`AZURE_LIVE_ADAPTER_METRICS` + `AZURE_METRICS_RESOURCE_ID` + metric name) |

## Always (any environment)

| Item | Purpose |
|------|---------|
| `DATABASE_URL` | PostgreSQL for Prisma (orgs, learning, audit, etc.) |
| `JWT_SECRET` | Auth signing (non-dev) |
| `REDIS_URL` | Queues / optional AI stream (if enabled) |

## Live AI mutations (Kubernetes / EKS / GKE / AKS)

| Item | Purpose |
|------|---------|
| `SIMULATION_MODE=false` | Allows real executor paths |
| Valid **kubeconfig** (or in-cluster `ServiceAccount`) | `@kubernetes/client-node` |
| `AI_K8S_LIVE_EXECUTION=true` | AI loop patches Deployments / rollout restart |
| `AI_CLOUD_LIVE_EXECUTION=true` | Unified execution uses cloud adapters when provider is AWS/GCP/Azure |
| `CLOUD_ADAPTER_LIVE_K8S=true` | Adapters call the **same** K8s API for scale/restart |
| `ASTRA_K8S_NAMESPACE`, `ASTRA_K8S_DEPLOYMENT` | Default target (or pass `namespace` / `deploymentName` per call) |
| Optional guard flags | `AI_K8S_ALLOW_RESTART`, `AI_K8S_ALLOW_SCALE_DOWN`, `AI_K8S_HIGH_RISK_APPROVED`, etc. |

## Live AWS ECS (no Kubernetes)

| Item | Purpose |
|------|---------|
| `SIMULATION_MODE=false` | Required |
| `AWS_ECS_LIVE_EXECUTION=true` | Prefer ECS over K8s bridge for AWS adapter |
| `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE` | Default ECS target |
| `AWS_REGION` | ECS API region |
| IAM / credentials | `ecs:UpdateService` on the service (e.g. access keys, OIDC role, instance profile) |

Per-request overrides: `clusterName`, `deploymentName` or `serviceName` in `cloudService.execute` params.

## Billing

| Item | Purpose |
|------|---------|
| Stripe | `STRIPE_SECRET_KEY`, price IDs, webhook secret for subscriptions |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Orders API + client Checkout |

## AI / Copilot

| Item | Purpose |
|------|---------|
| `OPENAI_API_KEY` | Optional; rule-based paths work without it |

## Ops loop & adapter metrics (optional)

| Item | Purpose |
|------|---------|
| `OPS_METRICS_URL` | GET JSON used by the **continuous ops loop** and by **cloud adapters** `getMetrics` (first source when URL is set) |
| `OPS_METRICS_BEARER_TOKEN` | Optional `Authorization: Bearer …` for that URL |
| `OPS_METRICS_TIMEOUT_MS` | Fetch timeout (default 8000) |

JSON shape: per-provider `providers.aws` / `providers.gcp` / `providers.azure`, or top-level `aws`/`gcp`/`azure` objects, or a single object with `cpu`, `memory`, `cost` (numbers or numeric strings). See [INTEGRATION_TESTING.md](./INTEGRATION_TESTING.md).

### Native adapter CPU (optional, after OPS URL)

| Item | Purpose |
|------|---------|
| **GCP** | `GCP_LIVE_ADAPTER_METRICS=true`, `GCP_MONITORING_FILTER` (single metric type), `GCP_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT`, Application Default Credentials |
| **Azure** | `AZURE_LIVE_ADAPTER_METRICS=true`, `AZURE_METRICS_RESOURCE_ID` (full ARM id), `AZURE_METRICS_NAME` (default `Percentage CPU`), optional `AZURE_METRICS_NAMESPACE`, `DefaultAzureCredential` |

GCP/Azure paths return **live** `cpu` from the latest datapoint; `memory` / `cost` stay placeholder until you extend or use `OPS_METRICS_URL`.

---

## Still simulated or stubbed (by design)

- **Cloud `deployWorkflow`** on all three adapters — returns `*_WORKFLOW_SIMULATED` with `details.simulated: true` unless `CLOUD_DEPLOY_WEBHOOK_URL` is set and `SIMULATION_MODE=false`. Replace with your CI/CD webhook or pipeline SDK.
- **Adapter `getMetrics`** — priority: `OPS_METRICS_URL` → native **CloudWatch** (AWS) / **Cloud Monitoring** (GCP) / **Azure Monitor** (Azure) when the flags above are set → otherwise **simulated** defaults.
- **AWS `scaleDeployment`** — when `AWS_ECS_LIVE_EXECUTION=true` and ECS targets are set, **ECS `UpdateService`** is attempted **before** the K8s-backed scale path.
- **Native GCP/Azure non-K8s APIs** — scale/restart go through **K8s bridge** when `CLOUD_ADAPTER_LIVE_K8S=true`; there is no separate GCE VMSS API in this repo yet.
- **Full image rollback** — approximated as rolling restart / ECS force deploy until pipeline APIs are wired.

---

## Quick “go live” presets

**EKS/GKE/AKS workload**

```env
SIMULATION_MODE=false
AI_K8S_LIVE_EXECUTION=true
AI_CLOUD_LIVE_EXECUTION=true
CLOUD_ADAPTER_LIVE_K8S=true
ASTRA_K8S_NAMESPACE=your-ns
ASTRA_K8S_DEPLOYMENT=your-deploy
```

**ECS Fargate/EC2 service**

```env
SIMULATION_MODE=false
AI_CLOUD_LIVE_EXECUTION=true
AWS_ECS_LIVE_EXECUTION=true
AWS_ECS_CLUSTER=your-cluster
AWS_ECS_SERVICE=your-service
AWS_REGION=us-east-1
```

Do **not** set `CLOUD_ADAPTER_LIVE_K8S` unless the same kubeconfig should also drive adapter calls.
