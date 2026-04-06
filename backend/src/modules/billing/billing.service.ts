import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { PaymentProviderFactory } from "./providers/payment-provider.factory";
import { meteringService } from "./services/metering.service";
import { billingEngine } from "./services/billing-engine.service";
import { entitlementService } from "./services/entitlement.service";
import { auditService } from "./services/audit.service";
import Stripe from "stripe"; // Only for typing below

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
    if (!org) throw new Error(`Organization not found for ID: ${input.tenantId}`);

    // Regional Routing Optimization
    const preferredProvider = org.country === "IN" ? "razorpay" : (org.billingProvider || "stripe");
    const provider = PaymentProviderFactory.getProvider(preferredProvider);
    
    try {
      return await provider.createCheckout({
        orgId: input.tenantId,
        planId: input.plan.toLowerCase() as any, // Standardize to lowercase for Zod/Provider alignment
        email: input.customerEmail,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        currency: org.preferredCurrency
      });
    } catch (err) {
      // Fallback Strategy
      if (preferredProvider === "stripe" && org.country === "IN") {
         logger.warn(`Stripe checkout failed, falling back to Razorpay for org ${org.id}`);
         return await PaymentProviderFactory.getProvider("razorpay").createCheckout({
           orgId: input.tenantId,
           planId: input.plan,
           email: input.customerEmail,
           successUrl: input.successUrl,
           cancelUrl: input.cancelUrl
         });
      }
      throw err;
    }
  },

  // Entitlement Check
  hasAccess: entitlementService.hasAccess.bind(entitlementService),

  // Webhook Controller (Provider Agnostic)
  async handleWebhook(providerName: string, rawBody: string, signature: string) {
    const provider = PaymentProviderFactory.getProvider(providerName);
    const event = await provider.constructEvent(rawBody, signature);

    if (!event) return;

    // 1. Idempotency Check (FAANG Standard)
    const existing = await (prisma as any).processedWebhook.findUnique({ where: { id: event.id } });
    if (existing) {
      logger.info(`Webhook event ${event.id} already processed.`);
      return { ok: true, ignored: true };
    }

    try {
      switch (event.type) {
        case "checkout.completed": {
          if (event.orgId) {
            await (prisma as any).organization.update({
                where: { id: event.orgId },
                data: {
                  billingPlan: event.planId as any,
                  subscriptionStatus: "active",
                  stripeCustomerId: event.stripeCustomerId,
                  billingProvider: providerName
                }
            });
            await (prisma as any).auditLog.create({
              data: {
                orgId: event.orgId,
                action: "SUBSCRIPTION_CREATED",
                resourceType: "ORGANIZATION",
                metadata: { plan: event.planId, provider: providerName } as any
              }
            });
          }
          break;
        }
        case "invoice.paid": {
          if (event.orgId) {
            await (prisma as any).invoice.create({
                data: {
                  orgId: event.orgId,
                  stripeInvoiceId: event.id,
                  amount: (event as any).amount || 0,
                  status: "PAID"
                }
            });
          }
          break;
        }
      }

      await (prisma as any).processedWebhook.create({
        data: { id: event.id, type: event.type }
      });

      return { ok: true };
    } catch (err: any) {
      logger.error(`Failed to process ${providerName} webhook:`, err);
      throw err;
    }
  },

  async runDailyBillingAutomation() {
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
  billingIntervalId: null,

  startDailyBillingAutomation() {
    if (this.billingIntervalId) return;
    logger.info("Starting daily billing automation loop...");
    this.billingIntervalId = setInterval(() => {
      this.runDailyBillingAutomation().catch(err => logger.error("Daily billing automation failed:", err));
    }, 24 * 60 * 60 * 1000); // 24 hours
  },

  stopDailyBillingAutomation() {
    if (this.billingIntervalId) {
      clearInterval(this.billingIntervalId);
      this.billingIntervalId = null;
      logger.info("Stopped daily billing automation loop.");
    }
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
