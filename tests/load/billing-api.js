/**
 * k6 load test — Billing API
 *
 * Billing endpoints have stricter SLOs (financial data, Stripe calls):
 *   p95 < 800 ms (external Stripe latency included in mocked mode)
 *   error rate < 0.5%
 *
 * Run:
 *   k6 run tests/load/billing-api.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const billingDuration = new Trend("billing_duration", true);
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "20s", target: 10 },
    { duration: "60s", target: 50 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800", "p(99)<2000"],
    billing_duration: ["p(95)<800"],
    errors: ["rate<0.005"],
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

export default function () {
  // GET subscription plan
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/billing/plan`, { headers: HEADERS });
  billingDuration.add(Date.now() - start);

  const ok = check(res, {
    "billing plan 200": (r) => r.status === 200,
    "not 500": (r) => r.status < 500,
  });
  errorRate.add(!ok);

  sleep(1 + Math.random());
}
