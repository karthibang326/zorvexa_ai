# Multi-cloud operations

AstraOps routes autonomous actions **per workload** to AWS, GCP, Azure, or Kubernetes using a single execution pipeline (`executeUnifiedAiDecision` + cloud adapters).

## How routing works

1. **Metrics / simulation** attach a `provider` on `MetricSnapshot` (see `metrics-simulator.ts`).
2. **`providerForResourceName(resource)`** (`multi-cloud/ai-target-provider.ts`) picks the control plane for a named workload:
   - Built-in demo map: `payments-api` → AWS, `checkout-edge` → GCP, `inventory-svc` → Azure, `auth-gateway` → K8s.
   - **Override without code changes:** set env **`MULTI_CLOUD_RESOURCE_MAP_JSON`** to a JSON object, e.g.  
     `{"my-api":"aws","analytics-worker":"gcp","batch-jobs":"azure","platform-core":"kubernetes"}`  
     Keys are resource names; values must be `aws`, `gcp`, `azure`, or `kubernetes`.
3. **`ASTRA_DEFAULT_AI_PROVIDER`** — if set to one of those four, it **overrides** the metric’s provider for `resolveAiTargetProvider` (global steering for tests or single-cloud mode).

## Live execution matrix

| Provider   | Typical live path | Env / setup |
|------------|-------------------|-------------|
| **kubernetes** | K8s API (`AI_K8S_LIVE_EXECUTION`, kubeconfig) | Same as EKS/GKE/AKS API access |
| **aws**        | **ECS** first if `AWS_ECS_LIVE_EXECUTION` + cluster/service; else **K8s bridge** if `CLOUD_ADAPTER_LIVE_K8S`; else simulated | See `BACKEND_REQUIREMENTS.md` |
| **gcp**        | **K8s bridge** when `CLOUD_ADAPTER_LIVE_K8S`; else simulated | GKE kubeconfig |
| **azure**      | **K8s bridge** when `CLOUD_ADAPTER_LIVE_K8S`; else simulated | AKS kubeconfig |

**One kubeconfig, three “cloud” labels:** Many teams run EKS + GKE + AKS with **separate** clusters. Configure **per-request** `namespace` and `deploymentName` (and credentials via `KUBECONFIG` context switching or multiple API processes). The adapter label (aws/gcp/azure) selects **which adapter** runs; with `CLOUD_ADAPTER_LIVE_K8S=true` all three call the **same** Kubernetes client — so use **separate backend instances or contexts** per real cloud if clusters differ.

## API: ops learning

`POST .../execute`, autonomous loop, and continuous loop accept **`provider`: `aws` | `gcp` | `azure` | `kubernetes`** so you can pin a loop to one plane while the UI shows multi-cloud status.

## Dashboard: `/api/cloud/status`

`getMultiCloudControlPlaneStatus()` reports **credential presence** (not a full auth probe). AWS row includes ECS target hints when `AWS_ECS_*` + region are set.

## Security

See `multi-cloud/multi-cloud-security.ts` — no cloud secrets in AI payloads; use IAM / Workload Identity / Managed Identity / kubeconfig SA.
