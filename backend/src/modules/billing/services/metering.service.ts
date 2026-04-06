import { prisma } from "../../../lib/prisma";
import { auditService } from "./audit.service";
import { logger } from "../../../lib/logger";

export const meteringService = {
  /**
   * Tracks an AI-generated saving event.
   * Write-heavy optimized, append-only ledger.
   */
  async trackUsage(input: {
    tenantId: string;
    savingsAmount: number;
    resourceId?: string;
    userId?: string;
    metadata?: any;
    timestamp?: Date;
  }) {
    if (input.savingsAmount < 0) {
      throw new Error("Savings amount cannot be negative");
    }

    try {
      const event = await (prisma as any).usageEvent.create({
        data: {
          orgId: input.tenantId,
          amount: input.savingsAmount,
          resourceId: input.resourceId,
          timestamp: input.timestamp || new Date(),
          metadata: input.metadata || {}
        }
      });

      // Update organization total savings (atomic increment)
      await (prisma as any).organization.update({
        where: { id: input.tenantId },
        data: {
          aiSavingsUsd: { increment: input.savingsAmount }
        }
      });

      // Immuntable audit trail
      await auditService.log({
        orgId: input.tenantId,
        userId: input.userId,
        action: "USAGE_TRACKED",
        resourceType: "USAGE_EVENT",
        resourceId: event.id,
        metadata: {
          amount: input.savingsAmount,
          resourceId: input.resourceId
        }
      });

      return event;
    } catch (error) {
      logger.error("Failed to track usage:", { error, input });
      throw error;
    }
  }
};
