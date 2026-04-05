import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import workflowRoutes from "./routes/workflows.fastify";
import { bootstrapWorkflowWorker } from "./workers/workflow.worker";

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? "1 minute",
  });

  app.addHook("onRequest", async (req) => {
    req.log.info({ url: req.url, method: req.method }, "incoming_request");
  });

  await app.register(workflowRoutes, { prefix: "/api/workflows" });

  app.get("/health", async () => ({ status: "OK", service: "quantumops-fastify" }));

  bootstrapWorkflowWorker();

  const port = Number(process.env.FASTIFY_PORT ?? 8081);
  const host = process.env.FASTIFY_HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}

bootstrap().catch((err) => {
  app.log.error(err, "fastify_bootstrap_failed");
  process.exit(1);
});

