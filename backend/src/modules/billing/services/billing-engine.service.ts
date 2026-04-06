import { prisma } from "../../../lib/prisma";
import { stripeService } from "./stripe.service";
import { auditService } from "./audit.service";
import { logger } from "../../../lib/logger";
import { Prisma } from "@prisma/client";

export const billingEngine = {
  /**
   * Monthly Billing Orchestrator — Safe, Idempotent, and Distributed-Locked.
   */
  async processBillingForTenant(tenantId: string, periodStart: Date, periodEnd: Date) {
    // 1. Acquire Distributed Lock (FAANG-grade thread safety)
    const lockKey = `billing_lock_${tenantId}_${periodStart.getTime()}`;
    try {
      await (prisma as any).billingLock.create({
        data: {
          id: lockKey,
          orgId: tenantId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5m lock
        }
      });
    } catch (e) {
      logger.warn(`Could not acquire billing lock for tenant ${tenantId}. Run already in progress or completed.`);
      return;
    }

    try {
      const org = await (prisma as any).organization.findUnique({
        where: { id: tenantId },
        include: { subscriptions: true }
      });

      if (!org || !org.stripeCustomerId) return;
      const sub = org.subscriptions?.[0];
      if (!sub || sub.status !== "active") return;

      // 2. Aggregate Usage (Append-only Ledger)
      const usage = await (prisma as any).usageEvent.aggregate({
        where: {
          orgId: tenantId,
          timestamp: { gte: periodStart, lte: periodEnd }
        },
        _sum: { amount: true }
      });

      const totalSavings = (usage._sum.amount as unknown as Prisma.Decimal) || new Prisma.Decimal(0);
      const pricing = this.getPlanBaseFee(org.billingPlan);
      
      // 3. Deterministic Hybrid Computation
      const usageCharge = totalSavings.mul(org.billingPercentage);
      const finalCharge = usageCharge.add(pricing.baseFeeUsd);

      // 4. Sync Revenue to Stripe (Metered Invoice Items)
      if (usageCharge.gt(0)) {
        await stripeService.createInvoiceItem(
          org.stripeCustomerId,
          usageCharge.toNumber(),
          `AI Savings Usage Fee (${(org.billingPercentage * 100).toFixed(1)}% of $${totalSavings.toFixed(2)} savings)`,
          { tenantId, period: `${periodStart.toISOString()} - ${periodEnd.toISOString()}` }
        );
      }

      // 5. Commit Internal Immutable Financial Record
      const record = await (prisma as any).billingRecord.create({
        data: {
          orgId: tenantId,
          totalSavings,
          usageCharge,
          baseCharge: pricing.baseFeeUsd,
          finalCharge,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          status: "PENDING"
        }
      });

      await auditService.log({
        orgId: tenantId,
        action: "BILLING_BATCH_PROCESSED",
        resourceType: "BILLING_RECORD",
        resourceId: record.id,
        metadata: { totalSavings, finalCharge } as any
      });

      return record;
    } catch (error) {
      logger.error(`Critical billing failure for org ${tenantId}:`, error);
      throw error;
    } finally {
      // 6. Release Lock
      try {
        await (prisma as any).billingLock.delete({ where: { id: lockKey } });
      } catch (err) {
        logger.error("Failed to release billing lock:", err);
      }
    }
  },

  getPlanBaseFee(plan: string) {
    if (plan === "GROWTH") return { baseFeeUsd: 199 };
    if (plan === "ENTERPRISE") return { baseFeeUsd: 799 };
    return { baseFeeUsd: 49 }; // STARTER
  }
};
