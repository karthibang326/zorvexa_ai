import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

export class LedgerService {
  /**
   * Records an immutable financial event in the audit trail.
   * Ensures all billing actions are traceable and audit-ready.
   */
  async recordEvent(input: {
    orgId: string;
    action: string;
    category: "FINANCIAL" | "SUBSCRIPTION" | "SYSTEM";
    amount?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const entry = await (prisma as any).auditLog.create({
        data: {
          orgId: input.orgId,
          action: input.action,
          category: input.category,
          metadata: {
            ...(input.metadata || {}),
            amount: input.amount,
            timestamp: new Date().toISOString()
          } as any
        }
      });
      logger.info(`Ledger entry created: ${entry.id} [${input.action}]`);
      return entry;
    } catch (err) {
      logger.error(`Failed to record ledger event for org ${input.orgId}:`, err);
      // We don't throw here to avoid blocking the main flow, but we log the critical failure.
      return null;
    }
  }
}

export const ledgerService = new LedgerService();
