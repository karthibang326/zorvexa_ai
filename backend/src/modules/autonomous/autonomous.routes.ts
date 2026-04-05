import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../../lib/auth";
import { autonomousEngine, type ExecutionMode } from "./autonomous-engine.service";
import { hybridAutonomyService } from "./hybrid-autonomy.service";
import { k8sAiLoopService } from "./k8s-ai-loop.service";

const ToggleSchema = z.object({
  enabled: z.boolean(),
  executionMode: z.enum(["manual", "assist", "auto_execute"]).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  maxActionsPerHour: z.number().int().positive().optional(),
  manualOverride: z.boolean().optional(),
  rollbackEnabled: z.boolean().optional(),
});

const LoopRunSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure"]).default("aws"),
  deploymentName: z.string().min(1),
  namespace: z.string().optional(),
  historicalMetrics: z.array(
    z.object({
      ts: z.string(),
      cpu: z.number().optional(),
      memory: z.number().optional(),
      traffic: z.number().optional(),
      errors: z.number().optional(),
    })
  ),
});

const HybridAutonomySchema = z.object({
  runId: z.string().min(1).optional(),
  workload: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    dataLocality: z.enum(["onprem-only", "cloud-ok", "region-restricted"]),
    compliance: z.array(z.enum(["GDPR", "HIPAA", "PCI-DSS", "SOC2", "INTERNAL"])).default([]),
    latencySensitive: z.boolean().default(false),
    burstable: z.boolean().default(true),
    cpuRequest: z.number().positive(),
    memoryRequest: z.number().positive(),
    priorityClass: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  }),
  currentProvider: z.enum(["aws", "azure", "gcp", "baremetal", "vmware", "k8s-onprem"]).optional(),
  currentEnvironment: z.enum(["cloud", "onprem", "hybrid"]).optional(),
  clusterId: z.string().optional(),
  namespace: z.string().optional(),
  deploymentName: z.string().optional(),
  replicas: z.number().int().min(1).max(200).optional(),
});

const K8sLoopStartSchema = z.object({
  intervalMs: z.number().int().min(5000).max(120000).optional(),
  dryRun: z.boolean().optional(),
});

const K8sLoopDryRunSchema = z.object({
  dryRun: z.boolean(),
});

const K8sApprovalSchema = z.object({
  approvalId: z.string().min(1),
});

export async function autonomousRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/mode", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = ToggleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const current = autonomousEngine.getMode();
    const next = autonomousEngine.setMode({
      enabled: parsed.data.enabled,
      executionMode: (parsed.data.executionMode ?? current.executionMode) as ExecutionMode,
      approvalMode: parsed.data.manualOverride ?? current.approvalMode,
      maxActionsPerHour: parsed.data.maxActionsPerHour ?? current.maxActionsPerHour,
      rollbackEnabled: parsed.data.rollbackEnabled ?? current.rollbackEnabled,
    });
    return {
      enabled: next.enabled,
      executionMode: next.executionMode,
      confidenceThreshold: parsed.data.confidenceThreshold ?? 0.7,
      maxActionsPerHour: next.maxActionsPerHour,
      manualOverride: next.approvalMode,
      rollbackEnabled: next.rollbackEnabled,
    };
  });

  app.get("/mode", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async () => {
    const current = autonomousEngine.getMode();
    return {
      enabled: current.enabled,
      executionMode: current.executionMode,
      confidenceThreshold: 0.7,
      maxActionsPerHour: current.maxActionsPerHour,
      manualOverride: current.approvalMode,
      rollbackEnabled: current.rollbackEnabled,
    };
  });

  app.post("/loop/run", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = LoopRunSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    autonomousEngine.ingestSignal("metrics", {
      provider: parsed.data.provider,
      deploymentName: parsed.data.deploymentName,
      namespace: parsed.data.namespace,
      points: parsed.data.historicalMetrics.length,
    });
    return autonomousEngine.runControlLoop(parsed.data);
  });

  app.post("/hybrid/run", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = HybridAutonomySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const out = await hybridAutonomyService.run(parsed.data as any);
    return reply.send(out);
  });

  app.get("/hybrid/stream", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();
    const runId = typeof (request.query as any)?.runId === "string" ? String((request.query as any).runId) : undefined;
    const write = (ev: Record<string, unknown>) => {
      reply.raw.write(`event: ${String(ev.type ?? "update")}\n`);
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    };
    write({ type: "hybrid_stream_ready", ts: Date.now(), runId });
    const unsub = hybridAutonomyService.subscribe((ev) => {
      if (runId && ev.runId !== runId) return;
      write(ev as any);
    });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    request.raw.on("close", () => {
      clearInterval(hb);
      unsub();
    });
    return reply;
  });

  app.get("/stream", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();
    const write = (payload: Record<string, unknown>) => {
      reply.raw.write(`event: ${String(payload.type ?? "update")}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    write({ type: "autonomous_stream_ready", ts: Date.now() });
    const hb = setInterval(() => write({ type: "heartbeat", ts: Date.now() }), 15000);
    const unsub = autonomousEngine.subscribe((ev) => write(ev as any));
    request.raw.on("close", () => {
      clearInterval(hb);
      unsub();
    });
    return reply;
  });

  app.get("/actions/history", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async (request) => {
    const limit = Number((request.query as any)?.limit ?? 100);
    return { items: autonomousEngine.getActions(limit) };
  });

  app.get("/telemetry", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async () => {
    return autonomousEngine.getTelemetry();
  });

  app.post("/k8s/run", { preHandler: requireRole(["owner", "admin", "operator"]) }, async () => {
    return k8sAiLoopService.runOnce();
  });

  app.post("/k8s/start", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = K8sLoopStartSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    if (typeof parsed.data.dryRun === "boolean") k8sAiLoopService.setDryRun(parsed.data.dryRun);
    return k8sAiLoopService.start(parsed.data.intervalMs);
  });

  app.post("/k8s/stop", { preHandler: requireRole(["owner", "admin", "operator"]) }, async () => {
    return k8sAiLoopService.stop();
  });

  app.post("/k8s/dry-run", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = K8sLoopDryRunSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return k8sAiLoopService.setDryRun(parsed.data.dryRun);
  });

  app.get("/k8s/status", { preHandler: requireRole(["owner", "admin", "operator", "viewer"]) }, async () => {
    return k8sAiLoopService.getStatus();
  });

  app.post("/k8s/approve", { preHandler: requireRole(["owner", "admin", "operator"]) }, async (request, reply) => {
    const parsed = K8sApprovalSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const out = k8sAiLoopService.approveHighRiskAction(parsed.data.approvalId);
    if (!out.ok) return reply.code(404).send(out);
    return out;
  });
}

