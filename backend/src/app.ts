import express from "express";
import cors from "cors";
import {
  BACKEND_ENV_PATH,
  REPO_ROOT_ENV_PATH,
  openAiConfigurationError,
} from "./config/openai";
import copilotRoutes from "./routes/copilot";

import http from "http";
import { WSServer } from "./websocket";
import agentRoutes from "./routes/agents";
import { AgentWorker } from "./services/agent.worker";
import workflowsRoutes from "./routes/workflows";
import deployRoutes from "./routes/deploy";
import runsRoutes from "./routes/runs";
import { initDb } from "./config/db";
import { renderPrometheusMetrics } from "./services/metrics";
import { startRunWorker } from "./services/run.queue";
import { BRAND } from "./shared/branding";

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Legacy express routes removed

// Special handling for Stripe Webhook raw body (MUST be before express.json())
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

app.use(cors());
app.use(express.json());

// Main Billing Routes
// app.use("/api/billing", billingRoutes); // Legacy Express usage removed

// WebSocket initialization
WSServer.initialize(server);

// Start Agent Worker
AgentWorker.start();

// Main Copilot Route
app.use("/api/copilot", copilotRoutes);

// Agents Route
app.use("/api/agents", agentRoutes);

// Workflows Routes
app.use("/api/workflows", workflowsRoutes);

// Deploy Routes
app.use("/api/deploy", deployRoutes);

// Runs Routes
app.use("/api/runs", runsRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", operational: true, engine: BRAND.name });
});

app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(renderPrometheusMetrics());
});

initDb()
  .then(() => {
    startRunWorker();
    server.listen(PORT, () => {
      console.log(`🚀 ${BRAND.name} API running on port ${PORT}`);
      console.log(`   Env: ${REPO_ROOT_ENV_PATH} then ${BACKEND_ENV_PATH}`);
      const openAiIssue = openAiConfigurationError();
      if (openAiIssue) {
        console.warn(`⚠️  ${openAiIssue}`);
      } else {
        console.log(`   OpenAI: API key loaded`);
      }
    });
  })
  .catch((e) => {
    console.error("Failed to initialize database. Set DATABASE_URL and ensure Postgres is reachable.", e);
    process.exit(1);
  });

