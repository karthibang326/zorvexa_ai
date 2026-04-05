import Stripe from "stripe";
import { env } from "../../config/env";
import { createRazorpayOrder } from "./razorpay.client";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : null;

export const billingService = {
  usageStore: new Map<string, { aiDecisions: number; aiActions: number; telemetryEvents: number; lastUpdatedAt: string }>(),
  planStore: new Map<string, "starter" | "growth" | "enterprise">(),
  clusterStore: new Map<string, number>(),
  tenantBillingStore: new Map<
    string,
    {
      customerEmail?: string;
      customerId?: string;
      subscriptionId?: string;
      subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "inactive";
      latestPaymentStatus: "paid" | "failed" | "pending" | "unknown";
      invoices: Array<{
        id: string;
        createdAt: string;
        plan: "starter" | "growth" | "enterprise";
        cloudSpendUsd: number;
        savingsUsd: number;
        platformFeeUsd: number;
        baseFeeUsd: number;
        feePercentage: number;
        totalDueUsd: number;
        status: "open" | "paid" | "void";
      }>;
    }
  >(),
  savingsLedger: new Map<
    string,
    Array<{
      id: string;
      userId: string;
      ts: string;
      plan: "starter" | "growth" | "enterprise";
      beforeCostUsd: number;
      afterCostUsd: number;
      savingsUsd: number;
      platformFeeUsd: number;
      netSavingsUsd: number;
      explanation: string;
      actions: string[];
      charged: boolean;
    }>
  >(),
  billingLoopTimer: null as NodeJS.Timeout | null,

  getPlanPricing(plan: "starter" | "growth" | "enterprise") {
    if (plan === "enterprise") return { percentage: 0.15, baseFeeUsd: 799 };
    if (plan === "growth") return { percentage: 0.2, baseFeeUsd: 199 };
    return { percentage: 0.25, baseFeeUsd: 49 };
  },

  estimateValuePricing(input: {
    cloudSpendUsd: number;
    savingsUsd: number;
    plan?: "starter" | "growth" | "enterprise";
  }) {
    const plan = input.plan ?? "starter";
    const pricing = this.getPlanPricing(plan);
    const platformFee = Number((input.savingsUsd * pricing.percentage + pricing.baseFeeUsd).toFixed(2));
    const netSavings = Number((input.savingsUsd - platformFee).toFixed(2));
    const savingsRatePct = input.cloudSpendUsd > 0 ? Number(((input.savingsUsd / input.cloudSpendUsd) * 100).toFixed(2)) : 0;
    return {
      plan,
      cloudSpendUsd: Number(input.cloudSpendUsd.toFixed(2)),
      savingsUsd: Number(input.savingsUsd.toFixed(2)),
      savingsRatePct,
      feePercentage: pricing.percentage,
      baseFeeUsd: pricing.baseFeeUsd,
      platformFeeUsd: platformFee,
      netSavingsUsd: netSavings,
      valueMessage: "Only pay when you save",
    };
  },

  recordSavings(input: {
    tenantId: string;
    userId: string;
    beforeCostUsd: number;
    afterCostUsd: number;
    plan?: "starter" | "growth" | "enterprise";
    explanation?: string;
    actions?: string[];
  }) {
    const plan = input.plan ?? (this.planStore.get(input.tenantId) ?? "starter");
    const normalizedBefore = Math.max(0, Number(input.beforeCostUsd || 0));
    const normalizedAfter = Math.max(0, Number(input.afterCostUsd || 0));
    const rawSavings = normalizedBefore - normalizedAfter;
    const savingsUsd = rawSavings > 0 ? Number(rawSavings.toFixed(2)) : 0;
    // Edge case guardrail: no savings or negative impact => no charge.
    const value = this.estimateValuePricing({
      cloudSpendUsd: normalizedBefore,
      savingsUsd,
      plan,
    });
    const platformFeeUsd = savingsUsd > 0 ? value.platformFeeUsd : 0;
    const netSavingsUsd = savingsUsd > 0 ? Number((savingsUsd - platformFeeUsd).toFixed(2)) : 0;
    const entry = {
      id: `sav_${Date.now()}`,
      userId: input.userId,
      ts: new Date().toISOString(),
      plan,
      beforeCostUsd: normalizedBefore,
      afterCostUsd: normalizedAfter,
      savingsUsd,
      platformFeeUsd,
      netSavingsUsd,
      explanation:
        input.explanation ??
        (savingsUsd > 0
          ? "AI reduced cost by rightsizing workloads and removing idle resources."
          : "No measurable savings or negative impact; no charge applied."),
      actions: input.actions ?? [],
      charged: savingsUsd > 0,
    };
    const current = this.savingsLedger.get(input.tenantId) ?? [];
    this.savingsLedger.set(input.tenantId, [entry, ...current].slice(0, 200));
    return entry;
  },

  recordUsage(input: { tenantId: string; aiDecisions?: number; aiActions?: number; telemetryEvents?: number }) {
    const cur = this.usageStore.get(input.tenantId) ?? { aiDecisions: 0, aiActions: 0, telemetryEvents: 0, lastUpdatedAt: new Date().toISOString() };
    const next = {
      aiDecisions: cur.aiDecisions + (input.aiDecisions ?? 0),
      aiActions: cur.aiActions + (input.aiActions ?? 0),
      telemetryEvents: cur.telemetryEvents + (input.telemetryEvents ?? 0),
      lastUpdatedAt: new Date().toISOString(),
    };
    this.usageStore.set(input.tenantId, next);
    return next;
  },

  getUsageSummary(tenantId: string) {
    const u = this.usageStore.get(tenantId) ?? { aiDecisions: 0, aiActions: 0, telemetryEvents: 0, lastUpdatedAt: new Date().toISOString() };
    const units = u.aiDecisions + u.aiActions * 2 + Math.round(u.telemetryEvents / 100);
    const plan = this.planStore.get(tenantId) ?? "starter";
    const pricing = this.getPlanPricing(plan);
    const sampleSavings = Number((units * 0.18).toFixed(2));
    const valueBilling = this.estimateValuePricing({
      cloudSpendUsd: Number((sampleSavings * 10).toFixed(2)),
      savingsUsd: sampleSavings,
      plan,
    });
    return {
      tenantId,
      plan,
      usage: u,
      billableUnits: units,
      estimatedUsd: Number((units * 0.015).toFixed(2)),
      pricingModel: {
        type: "value-based",
        feePercentage: pricing.percentage,
        baseFeeUsd: pricing.baseFeeUsd,
        feeFormula: "fee = savings * percentage + base_fee",
      },
      valueBilling,
      providers: ["stripe", "razorpay"],
    };
  },

  setPlan(input: { tenantId: string; plan: "starter" | "growth" | "enterprise" }) {
    this.planStore.set(input.tenantId, input.plan);
    return { tenantId: input.tenantId, plan: input.plan };
  },

  getPlan(tenantId: string) {
    const plan = this.planStore.get(tenantId) ?? "starter";
    const clusterLimit = plan === "starter" ? 1 : plan === "growth" ? 25 : 1000;
    const clusterCount = this.clusterStore.get(tenantId) ?? 0;
    const pricing = this.getPlanPricing(plan);
    return {
      tenantId,
      plan,
      clusterLimit,
      clusterCount,
      canProvisionCluster: clusterCount < clusterLimit,
      feePercentage: pricing.percentage,
      baseFeeUsd: pricing.baseFeeUsd,
    };
  },

  reserveCluster(input: { tenantId: string }) {
    const plan = this.getPlan(input.tenantId);
    if (!plan.canProvisionCluster) {
      return { ok: false, ...plan };
    }
    const nextCount = (this.clusterStore.get(input.tenantId) ?? 0) + 1;
    this.clusterStore.set(input.tenantId, nextCount);
    return {
      ok: true,
      ...this.getPlan(input.tenantId),
    };
  },

  async createCheckoutSession(input: {
    provider?: "stripe" | "razorpay";
    priceId?: string;
    plan?: "starter" | "growth" | "enterprise";
    tenantId?: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const provider = input.provider ?? "stripe";
    if (provider === "razorpay") {
      const plan = input.plan ?? "growth";
      const rz = await createRazorpayOrder({ plan, tenantId: input.tenantId });
      if (!rz.ok) {
        return {
          id: "razorpay_order_fallback",
          url: input.successUrl,
          mode: "subscription" as const,
          provider,
          razorpayError: rz.reason,
        };
      }
      return {
        id: rz.orderId,
        orderId: rz.orderId,
        keyId: rz.keyId,
        amount: rz.amount,
        currency: rz.currency,
        receipt: rz.receipt,
        url: input.successUrl,
        mode: "order" as const,
        provider,
      };
    }
    const plan = input.plan ?? "growth";
    const resolvedPriceId =
      input.priceId ??
      (plan === "starter"
        ? env.STRIPE_PRICE_STARTER
        : plan === "growth"
        ? env.STRIPE_PRICE_GROWTH
        : env.STRIPE_PRICE_ENTERPRISE);
    if (!stripe || !resolvedPriceId) {
      const dummyAllowed =
        env.NODE_ENV === "development" && env.BILLING_DUMMY_CHECKOUT === "true";
      if (dummyAllowed) {
        return {
          id: `checkout_dummy_${Date.now()}`,
          url: input.successUrl,
          mode: "subscription" as const,
          provider,
          configured: true as const,
          simulated: true as const,
        };
      }
      return {
        id: "checkout_not_configured",
        url: "",
        mode: "subscription" as const,
        provider,
        configured: false as const,
        hint: !stripe
          ? "Set STRIPE_SECRET_KEY in backend/.env and restart the API (port 5002)."
          : `Set STRIPE_PRICE_${plan === "starter" ? "STARTER" : plan === "growth" ? "GROWTH" : "ENTERPRISE"} in backend/.env (Stripe Price id e.g. price_xxx), then restart the API.`,
      };
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.customerEmail,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        tenantId: input.tenantId ?? "",
        plan,
      },
    });
    return {
      id: session.id,
      url: session.url ?? "",
      mode: session.mode,
      provider,
      configured: true as const,
    };
  },

  generateUsageInvoice(input: {
    tenantId: string;
    cloudSpendUsd: number;
    savingsUsd: number;
    plan?: "starter" | "growth" | "enterprise";
  }) {
    const plan = input.plan ?? (this.planStore.get(input.tenantId) ?? "starter");
    const estimate = this.estimateValuePricing({
      cloudSpendUsd: input.cloudSpendUsd,
      savingsUsd: input.savingsUsd,
      plan,
    });
    const invoice = {
      id: `inv_${Date.now()}`,
      createdAt: new Date().toISOString(),
      plan,
      cloudSpendUsd: estimate.cloudSpendUsd,
      savingsUsd: estimate.savingsUsd,
      platformFeeUsd: estimate.platformFeeUsd,
      baseFeeUsd: estimate.baseFeeUsd,
      feePercentage: estimate.feePercentage,
      totalDueUsd: estimate.savingsUsd > 0 ? estimate.platformFeeUsd : 0,
      status: "open" as const,
    };
    const current = this.tenantBillingStore.get(input.tenantId) ?? {
      subscriptionStatus: "inactive" as const,
      latestPaymentStatus: "unknown" as const,
      invoices: [],
    };
    current.invoices = [invoice, ...(current.invoices ?? [])].slice(0, 24);
    this.tenantBillingStore.set(input.tenantId, current);
    if (invoice.totalDueUsd > 0) {
      void this.sendSavingsUsageToStripe({
        tenantId: input.tenantId,
        savingsUsd: estimate.savingsUsd,
      });
    }
    return invoice;
  },

  async sendSavingsUsageToStripe(input: { tenantId: string; savingsUsd: number }) {
    if (!stripe) return { mode: "stub", sent: false };
    const billing = this.tenantBillingStore.get(input.tenantId);
    const subscriptionId = billing?.subscriptionId;
    if (!subscriptionId) return { mode: "missing_subscription", sent: false };
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) return { mode: "missing_subscription_item", sent: false };
    // Metered billing signal: usage quantity is normalized in cents of realized savings.
    await (stripe as any).subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity: Math.max(0, Math.round(input.savingsUsd * 100)),
      timestamp: "now",
      action: "increment",
    });
    return { mode: "sent", sent: true };
  },

  getBillingDashboard(tenantId: string) {
    const plan = this.planStore.get(tenantId) ?? "starter";
    const billing = this.tenantBillingStore.get(tenantId) ?? {
      subscriptionStatus: "inactive" as const,
      latestPaymentStatus: "unknown" as const,
      invoices: [],
    };
    const usage = this.getUsageSummary(tenantId);
    const valueBilling = usage.valueBilling;
    const savingsEntries = this.savingsLedger.get(tenantId) ?? [];
    const aiSavingsUsd = Number(savingsEntries.reduce((sum, s) => sum + s.savingsUsd, 0).toFixed(2));
    const platformFeeUsd = Number(savingsEntries.reduce((sum, s) => sum + s.platformFeeUsd, 0).toFixed(2));
    const netSavingsUsd = Number(savingsEntries.reduce((sum, s) => sum + s.netSavingsUsd, 0).toFixed(2));
    return {
      tenantId,
      plan,
      monthlyFeeUsd: valueBilling.baseFeeUsd,
      aiSavingsUsd,
      platformFeeUsd,
      netSavingsUsd,
      feePercentage: valueBilling.feePercentage,
      subscriptionStatus: billing.subscriptionStatus,
      latestPaymentStatus: billing.latestPaymentStatus,
      invoices: billing.invoices ?? [],
      savingsEntries: savingsEntries.slice(0, 10),
      tagline: "Only pay when you save",
    };
  },

  handleWebhookEvent(event: Stripe.Event | null, fallbackType?: string) {
    const type = event?.type ?? fallbackType ?? "unknown";
    if (type === "checkout.session.completed") {
      const session = (event as any)?.data?.object as Stripe.Checkout.Session | undefined;
      const tenantId = String(session?.metadata?.tenantId ?? "org-1");
      const plan = (String(session?.metadata?.plan ?? "growth").toLowerCase() as "starter" | "growth" | "enterprise");
      this.planStore.set(tenantId, plan);
      const current = this.tenantBillingStore.get(tenantId) ?? {
        subscriptionStatus: "inactive" as const,
        latestPaymentStatus: "unknown" as const,
        invoices: [],
      };
      current.customerEmail = session?.customer_details?.email ?? current.customerEmail;
      current.customerId = typeof session?.customer === "string" ? session.customer : current.customerId;
      current.subscriptionId = typeof session?.subscription === "string" ? session.subscription : current.subscriptionId;
      current.subscriptionStatus = "active";
      current.latestPaymentStatus = "paid";
      this.tenantBillingStore.set(tenantId, current);
      return { ok: true, type, tenantId };
    }
    if (type === "invoice.payment_succeeded") {
      const invoice = (event as any)?.data?.object as Stripe.Invoice | undefined;
      const tenantId = String((invoice?.metadata as any)?.tenantId ?? "org-1");
      const current = this.tenantBillingStore.get(tenantId) ?? {
        subscriptionStatus: "inactive" as const,
        latestPaymentStatus: "unknown" as const,
        invoices: [],
      };
      current.latestPaymentStatus = "paid";
      current.subscriptionStatus = "active";
      this.tenantBillingStore.set(tenantId, current);
      return { ok: true, type, tenantId };
    }
    if (type === "invoice.payment_failed") {
      const invoice = (event as any)?.data?.object as Stripe.Invoice | undefined;
      const tenantId = String((invoice?.metadata as any)?.tenantId ?? "org-1");
      const current = this.tenantBillingStore.get(tenantId) ?? {
        subscriptionStatus: "inactive" as const,
        latestPaymentStatus: "unknown" as const,
        invoices: [],
      };
      current.latestPaymentStatus = "failed";
      current.subscriptionStatus = "past_due";
      this.tenantBillingStore.set(tenantId, current);
      return { ok: true, type, tenantId };
    }
    if (type === "customer.subscription.updated") {
      const sub = (event as any)?.data?.object as Stripe.Subscription | undefined;
      const tenantId = String((sub?.metadata as any)?.tenantId ?? "org-1");
      const current = this.tenantBillingStore.get(tenantId) ?? {
        subscriptionStatus: "inactive" as const,
        latestPaymentStatus: "unknown" as const,
        invoices: [],
      };
      current.subscriptionId = sub?.id ?? current.subscriptionId;
      current.subscriptionStatus = (sub?.status as any) ?? current.subscriptionStatus;
      this.tenantBillingStore.set(tenantId, current);
      return { ok: true, type, tenantId };
    }
    return { ok: true, type, ignored: true };
  },

  async getSubscriptionByCustomer(customerId: string) {
    if (!stripe) return { customerId, status: "inactive", subscriptions: [] as any[] };
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10, status: "all" });
    return {
      customerId,
      status: subs.data[0]?.status ?? "inactive",
      subscriptions: subs.data.map((s) => ({
        id: s.id,
        status: s.status,
        currentPeriodEnd: s.items.data[0]?.current_period_end ?? null,
      })),
    };
  },

  verifyWebhookSignature(rawBody: string, signature?: string) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !signature) return null;
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  },

  runDailyBillingCycle() {
    const tenantIds = new Set<string>([
      ...this.planStore.keys(),
      ...this.usageStore.keys(),
      ...this.tenantBillingStore.keys(),
      ...this.savingsLedger.keys(),
    ]);
    if (tenantIds.size === 0) tenantIds.add("org-1");
    for (const tenantId of tenantIds) {
      const recent = (this.savingsLedger.get(tenantId) ?? []).slice(0, 20);
      const totalBefore = recent.reduce((sum, r) => sum + r.beforeCostUsd, 0);
      const totalAfter = recent.reduce((sum, r) => sum + r.afterCostUsd, 0);
      const cloudSpendUsd = totalBefore > 0 ? totalBefore : 5000;
      const savingsUsd = Math.max(0, Number((cloudSpendUsd - (totalAfter > 0 ? totalAfter : cloudSpendUsd * 0.88)).toFixed(2)));
      this.generateUsageInvoice({
        tenantId,
        cloudSpendUsd,
        savingsUsd,
      });
    }
  },

  startDailyBillingAutomation() {
    if (this.billingLoopTimer) return;
    const intervalMs = 24 * 60 * 60 * 1000;
    this.billingLoopTimer = setInterval(() => this.runDailyBillingCycle(), intervalMs);
  },

  stopDailyBillingAutomation() {
    if (!this.billingLoopTimer) return;
    clearInterval(this.billingLoopTimer);
    this.billingLoopTimer = null;
  },
};
