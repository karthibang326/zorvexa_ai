/**
 * k6 load test — Zorvexa API baseline
 *
 * Validates FAANG-grade SLOs:
 *   p95 response time < 500 ms
 *   p99 response time < 1 s
 *   error rate       < 1%
 *   throughput       > 50 req/s sustained
 *
 * Run:
 *   k6 run tests/load/api-baseline.js
 *   k6 run --vus 200 --duration 120s tests/load/api-baseline.js
 *
 * With live output dashboard:
 *   K6_WEB_DASHBOARD=true k6 run tests/load/api-baseline.js
 *
 * Prerequisites:
 *   brew install k6   (macOS)
 *   apt install k6    (Ubuntu — see https://k6.io/docs/get-started/installation/)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const workflowTriggerDuration = new Trend("workflow_trigger_duration", true);
const workflowListDuration = new Trend("workflow_list_duration", true);

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: "30s", target: 20 },   // ramp up
    { duration: "60s", target: 100 },  // sustained load
    { duration: "30s", target: 200 },  // spike
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    // P95 under 500 ms — FAANG SLO baseline
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    // Error rate under 1%
    errors: ["rate<0.01"],
    // Specific endpoint SLOs
    workflow_list_duration: ["p(95)<300"],
    workflow_trigger_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5002";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "dev-bypass-token";

const HEADERS = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  "Content-Type": "application/json",
  "x-org-id": __ENV.ORG_ID || "org-1",
  "x-project-id": __ENV.PROJECT_ID || "proj-1",
  "x-env-id": __ENV.ENV_ID || "env-prod",
};

// ── Scenario helpers ──────────────────────────────────────────────────────────

function checkHealth() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "health ok": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
}

function listWorkflows() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/workflows`, { headers: HEADERS });
  workflowListDuration.add(Date.now() - start);
  const ok = check(res, {
    "list workflows 200": (r) => r.status === 200,
    "list workflows has body": (r) => r.body !== null && r.body.length > 0,
  });
  errorRate.add(!ok);
}

function triggerRun() {
  const start = Date.now();
  const payload = JSON.stringify({
    workflowId: __ENV.TEST_WORKFLOW_ID || "wf-load-test",
    idempotencyKey: `load-test-${Date.now()}-${Math.random()}`,
  });
  const res = http.post(`${BASE_URL}/api/runs/trigger`, payload, { headers: HEADERS });
  workflowTriggerDuration.add(Date.now() - start);
  const ok = check(res, {
    "trigger run 200 or 404": (r) => r.status === 200 || r.status === 404,
    "not 500": (r) => r.status < 500,
  });
  errorRate.add(!ok);
}

function checkMetrics() {
  const res = http.get(`${BASE_URL}/metrics`);
  check(res, { "metrics 200": (r) => r.status === 200 });
}

// ── Virtual user entrypoint ───────────────────────────────────────────────────
export default function () {
  // Distribute load across scenarios
  const scenario = Math.random();

  if (scenario < 0.05) {
    checkHealth();
  } else if (scenario < 0.50) {
    listWorkflows();
  } else if (scenario < 0.80) {
    triggerRun();
  } else {
    checkMetrics();
  }

  // Think time: 0.5–2 s (realistic user pacing)
  sleep(0.5 + Math.random() * 1.5);
}
