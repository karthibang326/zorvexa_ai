# AstraOps Platform - Detailed Application Documentation

## 1) Overview

AstraOps is a full-stack platform for workflow orchestration, AI-assisted operations, self-healing automation, FinOps governance, multi-cloud execution, and infrastructure generation.

At a high level, the application provides:

- Workflow lifecycle management (create, save version, revert, deploy)
- Workflow run orchestration with queue-backed DAG execution
- Real-time run visibility over SSE
- AI Copilot features (analyze workflows, generate DAGs, detect anomalies)
- Autonomous self-healing loop (detect, analyze, decide, act, verify)
- Multi-cloud abstraction layer (AWS/GCP/Azure adapters)
- FinOps engine (cost collection, anomaly detection, prediction, optimization, enforcement)
- Natural-language infrastructure generator (Terraform + Kubernetes + Helm)

The system is implemented as:

- Frontend: React + TypeScript + Vite + Zustand + Axios
- Backend: Fastify + TypeScript + Prisma + BullMQ + Redis + PostgreSQL

---

## 2) Repository Layout

### Frontend

- `src/components/dashboard/...` - UI modules (workflow builder, execution/runs, deployments, AI workspace)
- `src/lib/api.ts` - centralized Axios client with auth/error/retry interceptors
- `src/lib/workflows.ts`, `src/lib/runs.ts` - API clients
- `src/hooks/useWorkflow.ts`, `src/hooks/useRun.ts` - action hooks for workflow/run flows
- `src/store/orchestration.ts` - Zustand store (runs/workflows/active run/loading + SSE event application)

### Backend

- `backend/src/server.ts` - Fastify bootstrap, plugins, routes registration
- `backend/src/modules/workflow/` - workflow APIs + service + DAG validation + repository
- `backend/src/modules/run/` - run trigger/list/get/retry + SSE stream
- `backend/src/workers/run.worker.ts` - BullMQ DAG execution worker
- `backend/src/modules/deployment/` - workflow deployment + deployment status/stop endpoints
- `backend/src/modules/ai-copilot/` - AI analyze/generate/anomaly + workflow AI stream
- `backend/src/modules/self-healing/` - closed-loop autonomous remediation
- `backend/src/modules/cloud/` - multi-cloud adapters + execute/metrics/optimize APIs
- `backend/src/modules/finops/` - cost pipeline + anomaly + forecast + optimization + enforcement + SSE
- `backend/src/modules/infra-generator/` - NL -> infra planner/generator/validator/deployer + templates
- `backend/prisma/schema.prisma` - relational schema (workflow/run/deploy/AI/self-healing/cost/infra generation)

---

## 3) Core Runtime Architecture

## 3.1 Request/Execution Plane

1. UI sends command to backend API
2. Backend validates payload using Zod
3. Service layer applies domain logic and persists state via Prisma
4. For runs: enqueue job in BullMQ
5. Worker executes DAG step-by-step (layered topological execution)
6. Step and run status events are published to SSE streams
7. UI updates live state via EventSource and store reducers

## 3.2 Control Plane Extensions

- AI Copilot consumes workflow/metrics context and returns structured outputs
- Self-healing consumes failures/anomalies and performs autonomous actions
- Cloud module normalizes AWS/GCP/Azure operations behind one interface
- FinOps evaluates spend and can enforce budget controls
- Infra generator creates infrastructure artifacts and optionally deploys them

---

## 4) Frontend Integration Details

## 4.1 API Layer

`src/lib/api.ts` provides:

- `baseURL` resolution:
  - `VITE_WORKFLOWS_API_URL + /api` when configured
  - fallback `http://localhost:8080/api`
- Authorization header injection from `localStorage.quantumops_jwt`
- Centralized error wrapping with `ApiClientError`
- Automatic retry for retryable status codes (408/409/425/429/5xx)

## 4.2 Workflow Builder

Workflow Builder supports:

- Save workflow:
  - POST `/api/workflows/:id/save`
  - Sends `nodes` + `edges`
  - Updates version + last saved timestamp
- Revert workflow:
  - POST `/api/workflows/:id/revert` with version
  - Reloads graph state from selected version
- Deploy workflow:
  - POST `/api/workflows/:id/deploy`
  - Payload includes `namespace`, `strategy`, optional `rolloutName`
  - Polls deployment status via `/api/deploy/:id/status`

## 4.3 Runs / Execution View

- Trigger run:
  - POST `/api/runs/trigger`
- List runs:
  - GET `/api/runs`
- Run detail:
  - GET `/api/runs/:id`
- Real-time stream:
  - GET `/api/runs/:id/stream` (EventSource)
- Store applies `step_started`, `step_completed`, `step_failed`, `run_failed` updates and refreshes active run snapshot

---

## 5) Backend Module Deep Dive

## 5.1 Workflow Module

Responsibilities:

- Create workflow + initial version
- Save new versions with `nodes`/`edges` persistence
- Revert to previous version
- DAG validation (node references + cycle detection)

Reliability hardening:

- Returns canonical workflow graph shape for frontend (`nodes`, `edges`, `version`)
- Handles validation errors with explicit HTTP statuses
- Triggers async AI analysis on save (best effort)

## 5.2 Deployment Module

Responsibilities:

- Validate workflow existence before deployment
- Create deployment records
- Kubernetes deployment creation (or fallback behavior)
- Status + stop endpoints:
  - GET `/api/deploy/:id/status`
  - POST `/api/deploy/:id/stop`

## 5.3 Run Module + Worker

Run API:

- Trigger: creates run record, enqueues BullMQ job
- Retry: creates retry run, re-enqueues
- List/Get: query persisted run + step logs

Worker:

- Reads workflow version graph
- Executes DAG in topological layers
- Writes step logs for RUNNING/SUCCESS/FAILED
- Publishes SSE events for each step + run terminal states
- Applies retry-aware failure state updates

---

## 6) AI Copilot

Endpoints:

- POST `/api/ai/analyze`
- POST `/api/ai/generate`
- POST `/api/ai/anomaly`
- GET `/api/ai/workflows/:id/stream`

Implementation properties:

- OpenAI-compatible `callLLM()` with timeout + retries + fallback behavior
- Structured JSON parsing guardrails
- Best-effort persistence to `AIInsight`
- AI events can be streamed for workflow editing scenarios

---

## 7) Self-Healing Engine

Closed-loop flow:

1. Detect anomaly signals (metrics/failure patterns)
2. Analyze using AI anomaly context
3. Decide action via rules + AI hints
4. Act via Kubernetes/cloud adapters
5. Verify resolution

APIs:

- POST `/api/self-healing/trigger`
- GET `/api/self-healing/events`
- GET `/api/self-healing/events?stream=1` (SSE)

Safety controls:

- Max actions per hour
- Manual vs auto approval mode
- Rollback behavior when primary action fails

Persistence:

- `SelfHealingEvent` audit trail for DETECT/ANALYZE/DECIDE/ACT/VERIFY phases

---

## 8) Multi-Cloud Module

Design:

- Cloud abstraction interface:
  - `scaleDeployment()`
  - `restartService()`
  - `getMetrics()`
  - `deployWorkflow()`

Adapters:

- AWS adapter
- GCP adapter
- Azure adapter

APIs:

- POST `/api/cloud/execute`
- GET `/api/cloud/metrics`
- POST `/api/cloud/optimize`

Integration:

- Execution engine supports node-level cloud provider routing
- Self-healing executor can route remediation actions to provider-specific adapters

---

## 9) FinOps Engine

Capabilities:

- Collect normalized cloud cost records
- Detect spending anomalies (spike detection)
- Predict costs (moving average forecast)
- AI-assisted optimization suggestions
- Budget enforcement actions through cloud + self-healing integrations

APIs:

- GET `/api/finops/cost`
- GET `/api/finops/anomaly`
- GET `/api/finops/predict`
- POST `/api/finops/optimize`
- POST `/api/finops/enforce`
- GET `/api/finops/stream` (SSE)

Safety controls:

- Max enforcements per day
- Approval mode (manual/auto)
- Budget threshold gating

Persistence:

- `CostRecord` model

---

## 10) Infra Generator

Purpose:

- Convert natural language into infra artifacts
- Return Terraform, Kubernetes YAML, Helm bundle, and parsed plan
- Validate output and gate deployment by cost/approval/safety

Endpoint:

- POST `/api/infra/generate`

Pipeline:

1. Planner parses prompt -> infra plan (`cloud`, `services`, `scaling`, `monitoring`)
2. Generator renders templates (+ optional AI hints)
3. Validator checks Terraform/K8s/Helm + unsafe patterns
4. Cost estimate from FinOps prediction
5. Optional deploy path (dry-run + approval aware)
6. Persist generation output for improvement loop

Templates:

- Terraform EKS baseline template
- Kubernetes deployment/service/HPA template
- Helm values + deployment template

Persistence:

- `InfraGeneration` model

---

## 11) Data Model Summary (Prisma)

Primary models:

- `Workflow`
- `WorkflowVersion`
- `Deployment`
- `Run`
- `RunStepLog`
- `AIInsight`
- `SelfHealingEvent`
- `CostRecord`
- `InfraGeneration`

Notable relationships:

- Workflow -> versions, runs, deployments, AI insights
- Run -> step logs, AI insights, self-healing events

---

## 12) Observability and Reliability

Implemented:

- Structured logging for request and execution events
- Metrics endpoint `/metrics`
- Queue retries with exponential backoff
- SSE heartbeats + connection cleanup
- Input validation with Zod across modules
- Explicit HTTP error mapping (400/401/403/404/500)

Recommended operational setup:

- Run backend with Redis and Postgres
- Provision JWT secret + API keys via environment
- Monitor queue depth, failed jobs, and SSE error rates

---

## 13) Environment Variables (Key)

Core:

- `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- `RUN_MAX_ATTEMPTS`
- `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`

AI:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional)
- `OPENAI_MODEL` (optional)

Self-Healing:

- `SELF_HEAL_MAX_ACTIONS_PER_HOUR`
- `SELF_HEAL_APPROVAL_MODE` (`auto`/`manual`)

FinOps:

- `FINOPS_BUDGET_THRESHOLD_DAILY`
- `FINOPS_MAX_ENFORCEMENTS_PER_DAY`
- `FINOPS_APPROVAL_MODE` (`auto`/`manual`)

Infra Generator:

- `INFRA_APPROVAL_REQUIRED` (`true`/`false`)
- `INFRA_DRY_RUN_DEFAULT` (`true`/`false`)

---

## 14) End-to-End Critical Flow (Reference)

Workflow authoring to run completion:

1. Create workflow
2. Save workflow graph (`/api/workflows/:id/save`)
3. Deploy workflow (`/api/workflows/:id/deploy`)
4. Trigger run (`/api/runs/trigger`)
5. Observe live execution (`/api/runs/:id/stream`)

Autonomous operations loop:

1. Failure or anomaly detected
2. AI + rule analysis
3. Action execution (k8s/cloud)
4. Verification + event stream/audit persistence

---

## 15) Current Production Readiness Snapshot

Verified in repository:

- Backend build passes
- Backend tests pass
- Frontend build passes
- Frontend tests pass
- Core save/revert/deploy/trigger/SSE pathways are integrated end-to-end

