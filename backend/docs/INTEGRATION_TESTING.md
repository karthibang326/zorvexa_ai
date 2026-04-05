# Integration testing checklist

Use this when validating **live** paths after setting `SIMULATION_MODE=false` and the flags in [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md).

## 1. Health

- `GET /health` — process up.
- `GET /ready` — PostgreSQL reachable.

## 2. Shared metrics (`OPS_METRICS_URL`)

Point `OPS_METRICS_URL` at a service that returns JSON. The backend **GET**s the URL (optional `OPS_METRICS_BEARER_TOKEN`) and maps slices to each cloud adapter.

**Per-provider:**

```json
{
  "providers": {
    "aws": { "cpu": 72.5, "memory": 61, "cost": 120 },
    "gcp": { "cpu": 40, "memory": 55, "cost": 80 },
    "azure": { "cpu": 50, "memory": 48, "cost": 90 }
  }
}
```

**Top-level keys:**

```json
{
  "aws": { "cpu": 30, "memory": 40, "cost": 70 }
}
```

**Single workload (same numbers for all providers if only root object):**

```json
{ "cpu": 65, "memory": 58, "cost": 100 }
```

Aliases accepted: `cpu_pct`, `mem`, `memory_pct`, `cost_index`, `costIndex`, `CPU`, `Memory`.

After wiring, call your API that surfaces adapter metrics (or the ops loop status) and confirm `source: "live"` where applicable.

## 3. GCP Cloud Monitoring (adapter `getMetrics`)

With `GCP_LIVE_ADAPTER_METRICS=true`, a non-empty `GCP_MONITORING_FILTER`, and project id from `GCP_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT`:

- Use a filter that selects **one** `metric.type` (and optional resource labels). Example for GKE request utilization:

  `metric.type = "kubernetes.io/container/cpu/request_utilization" AND resource.labels.container_name = "my-container"`

- Credentials: workload identity, `gcloud auth application-default login`, or `GOOGLE_APPLICATION_CREDENTIALS`.

Values in the **0–1** range are treated as ratios and scaled to **0–100%**.

## 4. Azure Monitor (adapter `getMetrics`)

With `AZURE_LIVE_ADAPTER_METRICS=true` and full `AZURE_METRICS_RESOURCE_ID` (e.g. VM or other metrics-enabled resource):

- Default `AZURE_METRICS_NAME=Percentage CPU` suits `Microsoft.Compute/virtualMachines`.
- For other resources, set `AZURE_METRICS_NAME` and, if required, `AZURE_METRICS_NAMESPACE` per [Azure metric definitions](https://learn.microsoft.com/azure/azure-monitor/essentials/metrics-supported).

Use `DefaultAzureCredential` (managed identity, Azure CLI, env vars, etc.).

## 5. Deploy webhook

With `SIMULATION_MODE=false` and `CLOUD_DEPLOY_WEBHOOK_URL` set, `deployWorkflow` should POST to your endpoint; without the URL, responses stay simulated.

## 6. AWS scale order (ECS then K8s)

With `AWS_ECS_LIVE_EXECUTION=true`, `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE`, `AWS_REGION`, and valid IAM:

- `scaleDeployment` for AWS should hit **ECS `UpdateService`** first when ECS targets apply.
- If ECS is not used or fails, the **K8s-backed** path still applies when `CLOUD_ADAPTER_LIVE_K8S=true` and kubeconfig targets are valid.

## 7. Automated tests

From `backend/`:

```bash
npm test
npx tsc --noEmit
```
