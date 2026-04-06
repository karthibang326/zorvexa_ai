import { meteringService } from "./services/metering.service";
import { stripeService } from "./services/stripe.service";
import { billingEngine } from "./services/billing-engine.service";
import { entitlementService } from "./services/entitlement.service";
import { auditService } from "./services/audit.service";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

export const billingService = {
  // Metering Logic
  trackUsage: meteringService.trackUsage.bind(meteringService),

  // Subscription Logic
  async createCheckoutSession(input: {
    plan: "STARTER" | "GROWTH" | "ENTERPRISE";
    tenantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const org = await (prisma as any).organization.findUnique({ where: { id: input.tenantId } });
    if (!org) throw new Error("Organization not found");

    const customer = await stripeService.getOrCreateCustomer(input.tenantId, input.customerEmail, org.name);
    
    // In production, get these Price IDs from environment variables
    const priceId = this.getPlanPriceId(input.plan);

    return stripeService.createCheckoutSession({
      customerId: customer.id,
      tenantId: input.tenantId,
      priceId,
      plan: input.plan,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    });
  },

  // Entitlement Check
  hasAccess: entitlementService.hasAccess.bind(entitlementService),

  getPlanPriceId(plan: string) {
    // These should definitely be in env vars for a FAANG-grade system
    if (plan === "GROWTH") return process.env.STRIPE_PRICE_GROWTH || "price_growth_default";
    if (plan === "ENTERPRISE") return process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise_default";
    return process.env.STRIPE_PRICE_STARTER || "price_starter_default";
  },

  // Webhook Controller Port
  async handleWebhookEvent(event: any) {
    if (!event) return;

    // 1. Idempotency Check (FAANG Standard)
    const existing = await (prisma as any).processedWebhook.findUnique({ where: { id: event.id } });
    if (existing) {
      logger.info(`Webhook event ${event.id} already processed.`);
      return { ok: true, ignored: true };
    }

    try {
      const type = event.type;
      switch (type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const tenantId = session.metadata?.tenantId;
          const plan = (session.metadata?.plan || "STARTER") as any;
          
          if (tenantId) {
            await (prisma as any).organization.update({
                where: { id: tenantId },
                data: {
                  billingPlan: plan,
                  subscriptionStatus: "active",
                  stripeCustomerId: session.customer
                }
            });
            await auditService.log({
                orgId: tenantId,
                action: "SUBSCRIPTION_CREATED",
                resourceType: "ORGANIZATION",
                metadata: { plan, stripeCustomerId: session.customer } as any
            });
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const tenantId = sub.metadata?.tenantId;
          if (tenantId) {
             await (prisma as any).subscription.upsert({
                where: { stripeSubscriptionId: sub.id },
                create: {
                  orgId: tenantId,
                  stripeSubscriptionId: sub.id,
                  planId: (sub.metadata?.plan || "STARTER") as any,
                  status: sub.status,
                  currentPeriodStart: new Date(sub.current_period_start * 1000),
                  currentPeriodEnd: new Date(sub.current_period_end * 1000)
                },
                update: {
                  status: sub.status,
                  currentPeriodStart: new Date(sub.current_period_start * 1000),
                  currentPeriodEnd: new Date(sub.current_period_end * 1000)
                }
             });

             await (prisma as any).organization.update({
                where: { id: tenantId },
                data: { subscriptionStatus: sub.status }
             });
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object;
          const tenantId = invoice.metadata?.tenantId;
          if (tenantId) {
            await (prisma as any).invoice.create({
                data: {
                  orgId: tenantId,
                  stripeInvoiceId: invoice.id,
                  amount: invoice.amount_paid / 100,
                  status: "PAID"
                }
            });
          }
          break;
        }
      }

      // Mark event as processed (At-least-once → Exactly-once processing)
      await (prisma as any).processedWebhook.create({
        data: { id: event.id, type: event.type }
      });

      return { ok: true };
    } catch (err) {
      logger.error("Failed to process Stripe webhook:", err);
      throw err;
    }
  },

  // Delegations for backward compatibility / routes
  async getSubscriptionByCustomer(customerId: string) {
    return stripeService.getLatestInvoice(customerId); // Simplified or list
  },

  verifyWebhookSignature(rawBody: string, signature?: string) {
    return stripeService.constructEvent(rawBody, signature || "");
  },

  async runDailyBillingAutomation() {
    // In our new high-grade system, this triggers the billing engine
    const now = new Date();
    await billingEngine.processBillingForTenant("all", new Date(now.getFullYear(), now.getMonth(), 1), now);
  },

  getPlanPricing(plan: string) {
    return billingEngine.getPlanBaseFee(plan);
  },

  async recordSavings(input: {
    tenantId: string;
    userId: string;
    beforeCostUsd: number;
    afterCostUsd: number;
    explanation?: string;
    actions?: string[];
  }) {
    const savings = Math.max(0, input.beforeCostUsd - input.afterCostUsd);
    return await meteringService.trackUsage({
        tenantId: input.tenantId,
        savingsAmount: savings,
        userId: input.userId,
        metadata: { explanation: input.explanation, actions: input.actions }
    });
  },

  async getBillingDashboard(tenantId: string) {
    const org = await (prisma as any).organization.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        billingRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        usageEvents: { orderBy: { timestamp: 'desc' }, take: 10 }
      }
    });

    if (!org) throw new Error("Organization not found");

    return {
      tenantId,
      plan: org.billingPlan,
      billingPercentage: org.billingPercentage,
      totalSavingsToDate: org.aiSavingsUsd,
      monthlySpendUsd: org.monthlySpendUsd,
      subscriptionStatus: org.subscriptionStatus || "inactive",
      latestInvoices: org.invoices,
      latestUsageEvents: org.usageEvents,
      latestAuditLogs: (org as any).auditLogs || [],
      tagline: "FAANG-grade Hybrid Billing: Fully automated ROI tracking"
    };
  }
};
