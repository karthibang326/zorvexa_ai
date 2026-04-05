import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { env } from "./config/env";
import { workflowRoutes } from "./modules/workflow/workflow.routes";
import { runRoutes } from "./modules/run/run.routes";
import { aiCopilotRoutes } from "./modules/ai-copilot/ai.routes";
import { aiOpsLearningRoutes } from "./modules/ai-ops-learning/ai-ops-learning.routes";
import { aiOpsLearningService } from "./modules/ai-ops-learning/ai-ops-learning.service";
import { selfHealingRoutes } from "./modules/self-healing/self-healing.routes";
import { cloudRoutes } from "./modules/cloud/cloud.routes";
import { finopsRoutes } from "./modules/finops/finops.routes";
import { infraGeneratorRoutes } from "./modules/infra-generator/infra-generator.routes";
import { deploymentRoutes } from "./modules/deployment/deployment.routes";
import { deploymentsRoutes } from "./modules/deployments/deployments.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { chaosRoutes } from "./modules/chaos/chaos.routes";
import { incidentRoutes } from "./modules/ai-sre-agent/incident.routes";
import { predictorRoutes } from "./modules/predictor/predictor.routes";
import { scalingRoutes } from "./modules/scaling/scaling.routes";
import { optimizerRoutes } from "./modules/optimizer/optimizer.routes";
import { aiOptimizerRoutes } from "./modules/ai-optimizer/ai-optimizer.routes";
import { aiCeoRoutes } from "./modules/ai-ceo/ai-ceo.routes";
import { autonomousRoutes } from "./modules/autonomous/autonomous.routes";
import { aiCfoRoutes } from "./modules/ai-cfo/ai-cfo.routes";
import { costRoutes } from "./modules/cost/cost.routes";
import { aiGovernanceRoutes } from "./modules/ai-governance/ai-governance.routes";
import { contextRoutes } from "./modules/context/context.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { tenantRoutes } from "./modules/tenant/tenant.routes";
import { organizationRoutes } from "./modules/organization/organization.routes";
import { pluginRoutes } from "./modules/plugins/plugin.routes";
import { environmentPolicyRoutes } from "./modules/environment-policy/environment-policy.routes";
import { securityRoutes } from "./modules/security/security.routes";
import { realtimeRoutes } from "./modules/realtime/realtime.routes";
import { sreSystemRoutes } from "./modules/sre-system/sre-system.routes";
import { astraRoutes } from "./modules/astra/astra.routes";
import { uialRoutes } from "./modules/uial/uial.routes";
import { onpremAgentRoutes } from "./modules/onprem-agent/agent.routes";
import { hybridBrainRoutes } from "./modules/hybrid-brain/hybrid-brain.routes";
import { telemetryRoutes } from "./modules/telemetry/telemetry.routes";
import { failoverRoutes } from "./modules/hybrid-failover/failover.routes";
import { astraOpsRoutes } from "./modules/astra-ops/astra-ops.routes";
import { aiOrchestratorRoutes } from "./modules/ai-orchestrator/ai-orchestrator.routes";
import { aiOrchestratorService } from "./modules/ai-orchestrator/ai-orchestrator.service";
import { k8sAiLoopService } from "./modules/autonomous/k8s-ai-loop.service";
import { startControlLoop, stopControlLoop } from "./core/astra-ops/loop/control-loop.service";
import { billingService } from "./modules/billing/billing.service";
import { metricsText, incRequest } from "./lib/metrics";
import { startRunWorker } from "./workers/run.worker";
import { startDeploymentWorker } from "./workers/deployment.worker";
import { startWorkflowWorker } from "./workers/workflow-worker";
import { startAstraAiWorker } from "./workers/astra-ai.worker";
import { startAstraExecutorWorker } from "./workers/astra-executor.worker";
import { closeQueueResources } from "./lib/queue";
import { prisma } from "./lib/prisma";
import { ensureDevBootstrapTenant } from "./lib/dev-bootstrap-tenant";
import { logError, logInfo } from "./lib/logger";
import { assertProductionReadiness } from "./lib/production-readiness";
import { BRAND } from "./shared/branding";
import { contextMiddleware } from "./middleware/context";
import { WSServer } from "./websocket";
import { startAiStreamPipeline, stopAiStreamPipeline } from "./modules/ai-stream/ai-stream.service";

export function buildServer() {
  const app = Fastify({
    logger: true,
    trustProxy: env.TRUST_PROXY === "true",
  });
  const allowedOrigins = env.CORS_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean);

  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    // Per-user rate limiting: use authenticated user ID when available, fall back to IP.
    keyGenerator: (request) => {
      const authUser = (request as any).authUser as { id?: string } | undefined;
      return authUser?.id ?? request.ip;
    },
  });
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    const isLocalDevOrigin =
      !!origin &&
      env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    if (origin && (allowedOrigins.includes(origin) || isLocalDevOrigin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
    }
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, x-org-id, x-project-id, x-env-id"
    );
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
  });

  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.addHook("onRequest", async (request) => {
    incRequest();
    request.log.info({ traceId: request.id, method: request.method, url: request.url }, "request_start");
  });

  app.addHook("preHandler", contextMiddleware);

  app.get("/health", async () => ({
    ok: true,
    service: BRAND.name,
    env: env.NODE_ENV,
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, service: BRAND.name, database: "ok" as const };
    } catch {
      return reply.code(503).send({ ok: false, service: BRAND.name, database: "error" as const });
    }
  });
  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return metricsText();
  });

  app.register(workflowRoutes, { prefix: "/api/workflows" });
  app.register(runRoutes, { prefix: "/api/runs" });
  app.register(aiCopilotRoutes, { prefix: "/api/ai" });
  app.register(aiOpsLearningRoutes, { prefix: "/api/ai/ops" });
  app.register(contextRoutes, { prefix: "/api/context" });
  app.register(auditRoutes, { prefix: "/api/audit" });
  app.register(tenantRoutes, { prefix: "/api/tenant" });
  app.register(organizationRoutes, { prefix: "/api/org" });
  app.register(environmentPolicyRoutes, { prefix: "/api/environment-policy" });
  app.register(securityRoutes, { prefix: "/api/security" });
  app.register(realtimeRoutes, { prefix: "/api/realtime" });
  app.register(selfHealingRoutes, { prefix: "/api/self-healing" });
  app.register(cloudRoutes, { prefix: "/api/cloud" });
  app.register(finopsRoutes, { prefix: "/api/finops" });
  app.register(infraGeneratorRoutes, { prefix: "/api/infra" });
  app.register(deploymentRoutes, { prefix: "/api/deploy" });
  app.register(deploymentsRoutes, { prefix: "/api/deployments" });
  app.register(chaosRoutes, { prefix: "/api/chaos" });
  app.register(incidentRoutes, { prefix: "/api/incident" });
  app.register(predictorRoutes, { prefix: "/api/predict" });
  app.register(scalingRoutes, { prefix: "/api/scale" });
  app.register(optimizerRoutes, { prefix: "/api/optimizer" });
  app.register(aiOptimizerRoutes, { prefix: "/api/optimize" });
  app.register(aiCeoRoutes, { prefix: "/api/ai-ceo" });
  app.register(aiCfoRoutes, { prefix: "/api/ai-cfo" });
  app.register(aiGovernanceRoutes, { prefix: "/api/ai-governance" });
  app.register(autonomousRoutes, { prefix: "/api/autonomous" });
  app.register(sreSystemRoutes, { prefix: "/api/sre-system" });
  app.register(astraRoutes, { prefix: "/api/astra" });
  // ─── ASTRAOPS Hybrid Cloud Modules ────────────────────────────────────────
  app.register(uialRoutes,        { prefix: "/api/uial" });
  app.register(onpremAgentRoutes, { prefix: "/api/onprem-agents" });
  app.register(hybridBrainRoutes, { prefix: "/api/hybrid-brain" });
  app.register(telemetryRoutes,   { prefix: "/api/telemetry" });
  app.register(failoverRoutes,    { prefix: "/api/failover" });
  app.register(astraOpsRoutes, { prefix: "/api/astra-ops" });
  app.register(aiOrchestratorRoutes, { prefix: "/api/ai-orchestrator" });
  app.register(pluginRoutes, { prefix: "/api/marketplace/plugins" });
  app.register(costRoutes, { prefix: "/api/cost" });
  app.register(billingRoutes, { prefix: "/api/billing" });

  return app;
}

async function bootstrap() {
  assertProductionReadiness();
  await ensureDevBootstrapTenant();
  const app = buildServer();
  startRunWorker();
  startDeploymentWorker();
  startWorkflowWorker();
  startAstraAiWorker();
  startAstraExecutorWorker();
  aiOrchestratorService.start(6000);
  billingService.startDailyBillingAutomation();
  if (env.AI_OPS_LOOP_START_ON_BOOT === "true") {
    aiOpsLearningService
      .startContinuousLoop({
        intervalMs: 8000,
        provider: "aws",
        scope: { orgId: "org-1", projectId: "proj-1", envId: "env-prod" },
      })
      .catch((e) => {
        logError("ai_ops_learning_loop_failed", { message: e instanceof Error ? e.message : String(e) });
      });
  } else {
    logInfo("ai_ops_learning_loop_skipped", { reason: "AI_OPS_LOOP_START_ON_BOOT=false" });
  }
  if (process.env.AUTONOMOUS_K8S_ENABLED !== "false") {
    k8sAiLoopService.start(Number(process.env.AUTONOMOUS_K8S_INTERVAL_MS ?? 12000));
  }
  startControlLoop(env.ASTRA_CONTROL_LOOP_INTERVAL_MS, {
    orgId: "org-1",
    projectId: "proj-1",
    envId: "env-prod",
  });

  const shutdown = async () => {
    logInfo("graceful_shutdown_start");
    stopAiStreamPipeline();
    await app.close();
    await closeQueueResources();
    aiOrchestratorService.stop();
    billingService.stopDailyBillingAutomation();
    aiOpsLearningService.stopContinuousLoop();
    k8sAiLoopService.stop();
    stopControlLoop();
    await prisma.$disconnect();
    logInfo("graceful_shutdown_done");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    WSServer.initialize(app.server);
    startAiStreamPipeline();
    logInfo(`${BRAND.name} backend started`, { port: env.PORT, tagline: BRAND.tagline });
    if (env.NODE_ENV === "development") {
      const stripeCheckoutReady = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_GROWTH);
      logInfo("billing_stripe_checkout_env", { ready: stripeCheckoutReady });
    }
  } catch (e) {
    logError("server_bootstrap_failed", { message: e instanceof Error ? e.message : String(e) });
    process.exit(1);
  }
}

if (require.main === module) {
  void bootstrap();
}

