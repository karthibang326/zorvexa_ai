import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { TaxService } from "../tax/tax.service";
import { PaymentService } from "../payments/payment.service";
import { ledgerService } from "./ledger.service";
import { getUserRegion } from "../../utils/region.util";

export class BillingService {
  private taxService = new TaxService();
  private paymentService = new PaymentService();

  /**
   * Orchestrates the creation of a checkout session.
   * Handles region detection, deterministic tax calculation, and ledger recording.
   */
  async createCheckoutSession(input: {
    plan: "STARTER" | "GROWTH" | "ENTERPRISE";
    tenantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    gstId?: string;
    req?: any; // For region detection
  }) {
    const org = await (prisma as any).organization.findUnique({ where: { id: input.tenantId } });
    if (!org) throw new Error(`Organization not found: ${input.tenantId}`);

    const country = input.req ? getUserRegion(input.req) : (org.country || "IN");
    const basePrice = this.getPlanBasePrice(input.plan);

    // 1. Deterministic Tax Calculation
    const taxResult = this.taxService.calculateTax({
      amount: basePrice,
      country: country,
      customerType: input.gstId ? "B2B" : "B2C",
      taxId: input.gstId
    });

    // 2. Region-Based Provider Routing
    const providerName = country === "IN" ? "razorpay" : "stripe";

    // 3. Record Intent in Ledger (Audit Trail)
    const auditEntry = await ledgerService.recordEvent({
      orgId: input.tenantId,
      action: "CHECKOUT_INITIATED",
      category: "FINANCIAL",
      amount: taxResult.totalAmount,
      metadata: {
        plan: input.plan,
        subtotal: basePrice,
        taxAmount: taxResult.taxAmount,
        taxType: taxResult.taxType,
        provider: providerName,
        country
      }
    });

    // 4. Create Provider Session
    const session = await this.paymentService.createCheckout({
      planId: input.plan,
      orgId: input.tenantId,
      customerEmail: input.customerEmail,
      amount: taxResult.totalAmount, // Tax-inclusive
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: {
        auditLogId: auditEntry?.id,
        taxType: taxResult.taxType,
        taxRate: taxResult.taxRate
      }
    }, providerName);

    return session;
  }

  /**
   * Handles webhooks from any provider, normalizing them for system-wide state updates.
   */
  async handleWebhook(providerName: string, rawBody: string, signature: string) {
    const event = await this.paymentService.verifyWebhook(providerName, rawBody, signature);
    if (!event) return { ok: false, reason: "Invalid signature" };

    // Idempotency: skip if already processed
    const existing = await (prisma as any).processedWebhook.findUnique({ where: { id: event.id } });
    if (existing) return { ok: true, ignored: true };

    try {
      if (event.type === "checkout.completed") {
        await (prisma as any).organization.update({
          where: { id: event.orgId },
          data: {
            billingPlan: event.planId.toUpperCase() as any,
            subscriptionStatus: "active",
            stripeCustomerId: event.stripeCustomerId,
            billingProvider: providerName
          }
        });

        await ledgerService.recordEvent({
          orgId: event.orgId,
          action: "SUBSCRIPTION_CREATED",
          category: "SUBSCRIPTION",
          metadata: { plan: event.planId, provider: providerName, eventId: event.id }
        });
      } else if (event.type === "invoice.paid") {
        await (prisma as any).invoice.create({
          data: {
            orgId: event.orgId,
            stripeInvoiceId: event.id,
            amount: (event as any).amount || 0,
            status: "PAID"
          }
        });

        await ledgerService.recordEvent({
          orgId: event.orgId,
          action: "INVOICE_PAID",
          category: "FINANCIAL",
          amount: (event as any).amount,
          metadata: { eventId: event.id, provider: providerName }
        });
      }

      await (prisma as any).processedWebhook.create({
        data: { id: event.id, type: event.type }
      });

      return { ok: true };
    } catch (err: any) {
      logger.error(`Webhook processing failed [${providerName}]:`, err as any);
      throw err;
    }
  }

  async getBillingDashboard(tenantId: string) {
    const org = await (prisma as any).organization.findUnique({
      where: { id: tenantId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        auditLogs: { orderBy: { timestamp: 'desc' }, take: 10 }
      }
    });

    if (!org) throw new Error("Organization not found");

    return {
      tenantId,
      plan: org.billingPlan,
      subscriptionStatus: org.subscriptionStatus || "inactive",
      invoices: org.invoices,
      auditLogs: (org as any).auditLogs || [],
      tagline: "Zorvexa AI: Production-grade Billing Infrastructure"
    };
  }

  async getSubscriptionByCustomer(customerId: string) {
    // In a poly-provider setup, we check both Stripe (global) and internal DB (Razorpay)
    const org = await (prisma as any).organization.findFirst({
        where: { stripeCustomerId: customerId }
    });
    if (!org) throw new Error("Subscription not found for customer");
    return {
        id: org.id,
        plan: org.billingPlan,
        status: org.subscriptionStatus,
        provider: org.billingProvider
    };
  }

  async recordSavings(input: {
    tenantId: string;
    userId: string;
    beforeCostUsd: number;
    afterCostUsd: number;
    explanation?: string;
    actions?: string[];
  }) {
    const savingsAmount = Math.max(0, input.beforeCostUsd - input.afterCostUsd);
    
    // We record this in the SavingsEntry table (ROI tracking)
    const entry = await (prisma as any).savingsEntry.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        amountUsd: savingsAmount,
        metadata: {
           explanation: input.explanation,
           actions: input.actions
        } as any
      }
    });

    // Also record in financial ledger for auditability
    await ledgerService.recordEvent({
      orgId: input.tenantId,
      action: "SAVINGS_RECORDED",
      category: "SYSTEM",
      amount: savingsAmount,
      metadata: { entryId: entry.id, userId: input.userId }
    });

    return entry;
  }

  getPlanPricing(plan: string) {
    const base = this.getPlanBasePrice(plan);
    return {
        id: plan.toUpperCase(),
        basePrice: base,
        currency: "USD"
    };
  }

  async runDailyBillingAutomation() {
    logger.info("Running daily billing automation placeholder...");
    // Future implementation for recursive billing checks
  }

  private getPlanBasePrice(plan: string): number {
    const prices: Record<string, number> = {
      STARTER: 49,
      GROWTH: 199,
      ENTERPRISE: 799
    };
    return prices[plan.toUpperCase()] || 49;
  }
}

export const billingService = new BillingService();
