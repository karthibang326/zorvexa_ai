import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/auth";
import { CreateCheckoutSchema } from "./billing.schemas";
import { billingService } from "./billing.service";

export async function billingRoutes(app: FastifyInstance) {
  app.post("/create-checkout", { preHandler: authenticate }, async (request, reply) => {
    const parsed = CreateCheckoutSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    try {
      const session = await billingService.createCheckoutSession(parsed.data);
      return reply.code(201).send(session);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "Failed to create checkout session" });
    }
  });

  app.post("/webhook", async (request, reply) => {
    try {
      const signature = request.headers["stripe-signature"] as string | undefined;
      const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
      const event = billingService.verifyWebhookSignature(rawBody, signature);
      const handled = billingService.handleWebhookEvent(event as any, (request.body as any)?.type);
      return reply.code(200).send({
        received: true,
        mode: event ? "verified" : "passthrough",
        type: event?.type ?? (request.body as any)?.type ?? "unknown",
        handled,
      });
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Invalid webhook" });
    }
  });

  app.get("/subscription", { preHandler: authenticate }, async (request, reply) => {
    const customerId = String((request.query as any)?.customerId ?? "");
    if (!customerId) return reply.code(400).send({ error: "customerId is required" });
    try {
      return await billingService.getSubscriptionByCustomer(customerId);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "Failed to load subscription" });
    }
  });

  app.post("/usage/record", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const usage = billingService.recordUsage({
      tenantId,
      aiDecisions: Number((request.body as any)?.aiDecisions ?? 0),
      aiActions: Number((request.body as any)?.aiActions ?? 0),
      telemetryEvents: Number((request.body as any)?.telemetryEvents ?? 0),
    });
    return { tenantId, usage };
  });

  app.get("/usage/summary", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    return billingService.getUsageSummary(tenantId);
  });

  app.post("/plan/set", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    const rawPlan = String((request.body as any)?.plan ?? "starter").toLowerCase();
    const plan = rawPlan === "free" ? "starter" : rawPlan === "pro" ? "growth" : rawPlan;
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    if (!["starter", "growth", "enterprise"].includes(plan)) {
      return reply.code(400).send({ error: "plan must be starter|growth|enterprise" });
    }
    return billingService.setPlan({ tenantId, plan: plan as "starter" | "growth" | "enterprise" });
  });

  app.get("/plan", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    return billingService.getPlan(tenantId);
  });

  app.post("/cluster/reserve", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const out = billingService.reserveCluster({ tenantId });
    if (!out.ok) return reply.code(402).send({ error: "Plan limit reached", details: out });
    return out;
  });

  app.post("/value-pricing/estimate", { preHandler: authenticate }, async (request, reply) => {
    const cloudSpendUsd = Number((request.body as any)?.cloudSpendUsd ?? 0);
    const savingsUsd = Number((request.body as any)?.savingsUsd ?? 0);
    const rawPlan = String((request.body as any)?.plan ?? "starter").toLowerCase();
    const plan = rawPlan === "free" ? "starter" : rawPlan === "pro" ? "growth" : rawPlan;
    if (cloudSpendUsd < 0 || savingsUsd < 0) {
      return reply.code(400).send({ error: "cloudSpendUsd and savingsUsd must be >= 0" });
    }
    if (!["starter", "growth", "enterprise"].includes(plan)) {
      return reply.code(400).send({ error: "plan must be starter|growth|enterprise" });
    }
    return billingService.estimateValuePricing({
      cloudSpendUsd,
      savingsUsd,
      plan: plan as "starter" | "growth" | "enterprise",
    });
  });

  app.post("/invoice/generate", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const cloudSpendUsd = Number((request.body as any)?.cloudSpendUsd ?? 0);
    const savingsUsd = Number((request.body as any)?.savingsUsd ?? 0);
    const rawPlan = String((request.body as any)?.plan ?? "").toLowerCase();
    const plan = rawPlan ? (rawPlan === "free" ? "starter" : rawPlan === "pro" ? "growth" : rawPlan) : undefined;
    if (cloudSpendUsd < 0 || savingsUsd < 0) {
      return reply.code(400).send({ error: "cloudSpendUsd and savingsUsd must be >= 0" });
    }
    const invoice = billingService.generateUsageInvoice({
      tenantId,
      cloudSpendUsd,
      savingsUsd,
      plan: plan as any,
    });
    return { tenantId, invoice };
  });

  app.post("/savings/record", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    const userId = String((request.body as any)?.userId ?? (request as any)?.authUser?.id ?? "system");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const beforeCostUsd = Number((request.body as any)?.beforeCostUsd ?? 0);
    const afterCostUsd = Number((request.body as any)?.afterCostUsd ?? 0);
    if (beforeCostUsd < 0 || afterCostUsd < 0) {
      return reply.code(400).send({ error: "beforeCostUsd and afterCostUsd must be >= 0" });
    }
    const rawPlan = String((request.body as any)?.plan ?? "").toLowerCase();
    const plan = rawPlan ? (rawPlan === "free" ? "starter" : rawPlan === "pro" ? "growth" : rawPlan) : undefined;
    const entry = billingService.recordSavings({
      tenantId,
      userId,
      beforeCostUsd,
      afterCostUsd,
      plan: plan as any,
      explanation: (request.body as any)?.explanation,
      actions: Array.isArray((request.body as any)?.actions) ? (request.body as any).actions.map(String) : undefined,
    });
    return { tenantId, entry };
  });

  app.post("/automation/run-daily", { preHandler: authenticate }, async () => {
    billingService.runDailyBillingCycle();
    return { ok: true };
  });

  app.get("/dashboard", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    return billingService.getBillingDashboard(tenantId);
  });
}
