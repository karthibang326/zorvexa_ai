import { prisma } from "../../../lib/prisma";
import { logger } from "../../../lib/logger";

export const auditService = {
  async log(input: {
    orgId: string;
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: any;
  }) {
    try {
      await (prisma as any).auditLog.create({
        data: {
          orgId: input.orgId,
          userId: input.userId,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          metadata: input.metadata || {}
        }
      });
    } catch (error) {
      // Don't let audit logging fail the primary operation, but log the failure
      logger.error("Audit log failed:", { error, input });
    }
  }
};
