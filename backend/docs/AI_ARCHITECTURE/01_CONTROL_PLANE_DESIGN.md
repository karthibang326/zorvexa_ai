# Zorvexa AI: Autonomous Control Plane Architecture

## 1. Multi-Stage Execution Control
Zorvexa implements a FAANG-grade 3-stage execution control system to safely transition AI-driven actions from "suggestion-only" to "controlled autonomous" execution.

### Stage 1: SAFE MODE (Default)
- **Behavior:** AI generates suggestions only; no automated execution allowed.
- **Goal:** Observation and human validation.
- **Fail-Safe:** System defaults to SAFE on any configuration error.

### Stage 2: APPROVAL MODE
- **Behavior:** AI suggests actions which require explicit human operator approval before hitting the infrastructure.
- **Validation:** Every action is checked against the deterministic Policy Engine before being presented for approval.

### Stage 3: AUTONOMOUS MODE (Highly Restricted)
- **Behavior:** AI triggers low-risk actions (e.g., scaling replicas up to 30) autonomously.
- **Risk Fence:** High-risk actions (e.g., deletions, node restarts) automatically fallback to APPROVAL MODE.

## 2. Policy Engine (Deterministic Safe-Mode)
Regardless of the AI model's prediction, the **Policy Engine** enforces hard boundaries:
- **Max Replicas:** Capped at 30 replicas per deployment.
- **Protected Namespaces:** Automation is forbidden in `kube-system`, `kube-public`, and `kube-node-lease`.
- **Budget Limits:** Every action is costs-checked against the tenant's monthly budget.

## 3. Idempotent Execution Queue (BullMQ)
All infrastructure actions are processed via Redis/BullMQ:
- **Idempotency:** Action-based jobId hashing ensures an AI prediction never executes twice.
- **Resilience:** 5-attempt retry logic with exponential backoff (2s start).
- **Auditability:** Every step (Suggestion -> Policy -> Approval -> Execution) is durably logged in Postgres.

## 4. Kill Switch
A global circuit breaker exists at the API level. Turning off the AI Control flag status instantly freezes all queue ingestion and halts in-flight execution workers before they commit changes to Kubernetes.
