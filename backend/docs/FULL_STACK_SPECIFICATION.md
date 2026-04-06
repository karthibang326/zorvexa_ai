# Zorvexa: Full-Stack Technical Specification

This document provides a comprehensive overview of the architecture, data flow, and technology stack for the Zorvexa AI DevOps Platform.

---

## 🏗 Frontend Architecture (Vite + React)

The frontend is a high-performance, single-page application (SPA) focused on real-time operational visibility and "AI CEO" control.

### 🔌 Technology Stack
- **Framework:** React 19 (using Vite for ultra-fast HMR).
- **Styling:** TailwindCSS + Shadcn/UI (Custom dark-mode "Astra" theme).
- **Animations:** Framer Motion for micro-interactions and smooth transitions.
- **State Management:** 
  - **Zustand:** Lightweight global state for UI persistence and navigation.
  - **React Context:** Used for complex providers like `AuthContext`, `AiStreamContext`, and `SimulationPreviewContext`.
- **Data Fetching:** Tanstack Query (React Query) for caching and asynchronous state synchronization.
- **Routing:** React Router v7 with Protected Route guards.

### 🎨 Key Dashboard Components
- **`AppSidebar` / `AppHeader`:** Global navigation and context-switching (Tenant/Org/Project).
- **`HybridControlPlaneView`:** The primary AI decision-making interface.
- **`AIExplainabilityPanel`:** A sliding panel that visualizes the AI's internal reasoning, signal processing, and alternative options considered.
- **`LifecycleActivityStream`:** A real-time SSE (Server-Sent Events) feed of AI decisions and system outputs.

---

## 🧠 Backend Architecture (Node.js + Fastify)

The backend is a multi-tenant, modular API designed for deterministic AI infrastructure control.

### 🔌 Technology Stack
- **Runtime:** Node.js 22 (TypeScript).
- **Framework:** Fastify (Chosen for its low overhead and native schema validation).
- **Database:** PostgreSQL via **Prisma ORM**.
- **Message Queue:** **BullMQ (Redis)** for asynchronous job processing, retries, and dead-letter queues.
- **Authentication:** Supabase Auth (JWT-based) with MFA support.

### 🛡️ Core Services & Modules
1. **AI Control Plane (`autonomous-engine`):**
   - Ingests telemetry metrics.
   - Evaluates historical "Memory" using a simulation-first policy.
   - Decides on actions (Scale, Restart, Rollback).
2. **Policy Engine:**
   - A deterministic gateway that enforces hard-coded limits (Max replicas, prohibited types).
   - Prevents AI hallucinations from reaching the cloud API.
3. **Execution Service:**
   - Maps high-level AI intents (JSON) to specific cloud provider SDK calls (AWS SDK, @kubernetes/client-node, GCP SDK).
   - Supports `SIMULATION` (Dry-run) and `LIVE` execution modes.
4. **Monitoring & Metrics:**
   - Exposes a `/metrics` endpoint in Prometheus format.
   - Collects telemetry via adapters for CloudWatch, Azure Monitor, and GCP Monitoring.

---

## 🔄 End-to-End Data Flow

1. **Ingest:** Infrastructure telemetry (CPU, Latency) is collected via Cloud Adapters.
2. **Analyze:** The `AutonomousEngine` processes metrics and queries the LLM for a recommended action.
3. **Verify:** The **Policy Engine** checks the proposed action against tenant budgets and risk guardrails.
4. **Approve:** If High-Risk, the action is paused in a `PendingApproval` state in Postgres. The Frontend displays a UI notification.
5. **Execute:** Once approved (or if low-risk), the job is pushed to the BullMQ **Execution Worker**.
6. **Result:** The worker calls the Cloud API and logs the final result back to the `AuditLog` table.
7. **Reflect:** The outcome (Success/Failure) is used as feedback for the AI's future decisions (RLHF feedback loop).

---

## 🚀 Environment Requirements
- **Local:** `npm run dev` (Concurrently starts Vite on 5173 and Fastify on 5003).
- **Database:** PostgreSQL (with `gen_random_uuid()` support).
- **Redis:** Required for BullMQ job processing.
- **Env Vars:** See [.env.example](file:///Users/nithya/Desktop/zorvexa_ai/zorvexa_ai/.env.example) for the full list of secrets.
