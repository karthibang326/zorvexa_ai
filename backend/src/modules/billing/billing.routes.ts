import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/auth";
import { CreateCheckoutSchema } from "./billing.schemas";
import { billingService } from "./billing.service";
import { prisma } from "../../lib/prisma";

export async function billingRoutes(app: FastifyInstance) {
  app.post("/create-checkout", { preHandler: authenticate }, async (request, reply) => {
    const parsed = CreateCheckoutSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    try {
      const session = await billingService.createCheckoutSession({
        ...(parsed.data as any),
        req: request // Pass the request for region detection
      });
      return reply.code(201).send(session);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "Failed to create checkout session" });
    }
  });

  app.post("/webhook/stripe", async (request, reply) => {
    try {
      const signature = request.headers["stripe-signature"] as string | undefined;
      const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
      await billingService.handleWebhook("stripe", rawBody, signature || "");
      return reply.code(200).send({ received: true });
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Stripe webhook failed" });
    }
  });

  app.post("/webhook/razorpay", async (request, reply) => {
    try {
      const signature = request.headers["x-razorpay-signature"] as string | undefined;
      const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
      await billingService.handleWebhook("razorpay", rawBody, signature || "");
      return reply.code(200).send({ received: true });
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Razorpay webhook failed" });
    }
  });

  // Backward compatible / legacy universal webhook
  app.post("/webhook", async (request, reply) => {
    const provider = request.headers["stripe-signature"] ? "stripe" : "razorpay";
    const signature = (request.headers["stripe-signature"] || request.headers["x-razorpay-signature"]) as string;
    const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
    await billingService.handleWebhook(provider, rawBody, signature || "");
    return { received: true, provider };
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
    const userId = String((request as any)?.authUser?.id ?? "system");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    
    const amount = Number((request.body as any)?.amount ?? (request.body as any)?.savingsUsd ?? 0);
    const out = await billingService.recordSavings({
      tenantId,
      userId,
      beforeCostUsd: amount, // Assuming direct savings reporting or calculated
      afterCostUsd: 0,
      explanation: (request.body as any)?.explanation || "Manual usage record",
    });
    return { tenantId, eventId: out.id };
  });

  app.get("/usage/summary", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    return await billingService.getBillingDashboard(tenantId);
  });

  app.post("/plan/set", { preHandler: authenticate }, async (request, reply) => {
    // In production, plan is set via Stripe. This is for manual admin/dev use.
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    const plan = String((request.body as any)?.plan ?? "starter").toLowerCase();
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    
    await (prisma as any).organization.update({
        where: { id: tenantId },
        data: { billingPlan: plan }
    });
    return { tenantId, plan };
  });

  app.get("/plan", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const org = await (prisma as any).organization.findUnique({ where: { id: tenantId } });
    const pricing = billingService.getPlanPricing(org?.billingPlan || "starter");
    return { tenantId, plan: org?.billingPlan, ...pricing };
  });

  app.post("/savings/record", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.body as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    const userId = String((request.body as any)?.userId ?? (request as any)?.authUser?.id ?? "system");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const beforeCostUsd = Number((request.body as any)?.beforeCostUsd ?? 0);
    const afterCostUsd = Number((request.body as any)?.afterCostUsd ?? 0);
    
    const entry = await billingService.recordSavings({
      tenantId,
      userId,
      beforeCostUsd,
      afterCostUsd,
      explanation: (request.body as any)?.explanation,
      actions: Array.isArray((request.body as any)?.actions) ? (request.body as any).actions.map(String) : undefined,
    });
    return { tenantId, entry };
  });

  app.post("/automation/run-daily", { preHandler: authenticate }, async () => {
    await billingService.runDailyBillingAutomation();
    return { ok: true };
  });

  app.get("/ai/insights", { preHandler: authenticate }, async (request, reply) => {
    const tenantId = String((request.query as any)?.tenantId ?? (request as any)?.scopeContext?.orgId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenantId is required" });
    const { aiAdvisorService } = await import("./services/ai-advisor.service");
    
    return {
      forecast: await aiAdvisorService.forecastUsage(tenantId),
      anomalies: await aiAdvisorService.detectAnomaly(tenantId)
    };
  });

  app.get("/ai/explain-invoice/:id", { preHandler: authenticate }, async (request, reply) => {
    const id = (request.params as any).id;
    const { aiAdvisorService } = await import("./services/ai-advisor.service");
    return {
      explanation: await aiAdvisorService.explainBillingRecord(id)
    };
  });
}
