# AstraOps SaaS Enterprise Readiness

## Multi-Tenancy

- Tenant scope is enforced via context headers (`x-org-id`, `x-project-id`, `x-env-id`) and middleware validation.
- AI Orchestrator responses are tenant-filtered (`/api/ai-orchestrator/state` and `/api/ai-orchestrator/stream` snapshots).
- AI decisions/actions carry tenant identity fields for isolated visibility and audit.

## Auth + RBAC

- JWT-based authentication is enforced for API endpoints.
- Supported roles: `admin`, `operator`, `viewer`, `auditor`.
- Auditor role has read-only visibility into orchestrator state/stream and audit outcomes.

## Security (Zero Trust + mTLS pattern)

- Zero-trust API model: authenticated identity + tenant context required on all scoped endpoints.
- Service-to-service hardening baseline:
  - use mTLS between microservices in cluster
  - rotate certs via cert-manager / service mesh
  - pin internal policies by namespace and service identity
- Recommended production implementation:
  - Istio/Linkerd mTLS STRICT mode
  - network policies deny-by-default
  - workload identity for cloud API calls

## Audit Logging

- Every AI decision/action is audited through `SREAction` records with:
  - reason
  - confidence
  - risk
  - simulation result
  - timestamp
- Orchestrator audit writer: `modules/ai-orchestrator/audit.service.ts`.

## Ops orchestration execution

- `POST` execute on the AI ops learning module routes restart / rollback-style actions through `executeOrchestratedInfraAction`: when `SIMULATION_MODE=false`, calls `cloudService.restartService` or `executeUnifiedAiDecision` for Kubernetes (same guardrails as the AI decision engine). Rollback is approximated as a rolling restart until CI/CD rollback APIs are wired.

## Cloud adapters (AWS / GCP / Azure)

- Default: `scaleDeployment` / `restartService` return **simulated** success with `details.simulated: true` for safe demos.
- **Live (Kubernetes-backed):** set `CLOUD_ADAPTER_LIVE_K8S=true`, `SIMULATION_MODE=false`, and configure kubeconfig for your EKS/GKE/AKS API server. Adapters then patch Deployment scale and perform rollout restarts via the same client as `AI_K8S_*` live execution. Still set `AI_CLOUD_LIVE_EXECUTION=true` where the unified AI execution path gates mutations.
- **Live (AWS ECS):** set `AWS_ECS_LIVE_EXECUTION=true`, `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE`, `SIMULATION_MODE=false`, region + IAM `ecs:UpdateService`. The AWS adapter tries ECS **before** the K8s bridge.
- **`deployWorkflow`:** when `CLOUD_DEPLOY_WEBHOOK_URL` is set and `SIMULATION_MODE=false`, the backend **POSTs** a JSON event to your URL (optional bearer). Otherwise responses remain **simulated** with `details.simulated: true`. See `docs/BACKEND_REQUIREMENTS.md` (production checklist, `/ready`, `PRODUCTION_STRICT`).

## AI Explainability

- Each decision includes:
  - reason
  - confidence
  - risk
  - simulation result
  - impact
- Control Plane UI renders explainability for operator trust.

## Billing System

- Billing supports checkout providers:
  - Stripe (live integration if key configured)
  - Razorpay Orders API when `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set; response includes `orderId` and `keyId` for Checkout.js. Falls back with `razorpayError` if keys are missing or the API errors.
- Usage metering APIs:
  - `POST /api/billing/usage/record`
  - `GET /api/billing/usage/summary`
- Usage tracks AI decisions/actions/telemetry billable units per tenant.

## Scalability

- Kubernetes-native deployment is expected for orchestrator workers and APIs.
- Multi-region target pattern:
  - active-active stateless APIs
  - regional queues/workers
  - tenant-aware data partitioning and failover
  - global ingress with latency routing

## UI Philosophy

- AI-first, read-only observer experience.
- No manual action controls in autonomous tabs.
- Decision transparency and live activity stream prioritized over controls.

