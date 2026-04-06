import { prisma } from "../lib/prisma";
import { billingEngine } from "../modules/billing/services/billing-engine.service";
import { auditService } from "../modules/billing/services/audit.service";
import { logger } from "../lib/logger";

/**
 * PRODUCTION-GRADE MONTHLY BILLING CRON
 * Scans all active organizations and runs the idempotent billing engine.
 * Run this on the 1st of every month at midnight.
 */
export async function runMonthlyBillingJob() {
  logger.info("Initializing Monthly Billing Cycle...");

  const orgs = await (prisma as any).organization.findMany({
    where: { subscriptionStatus: "active" }
  });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  logger.info(`Processing ${orgs.length} organizations from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  for (const org of orgs) {
    try {
      await billingEngine.processBillingForTenant(org.id, periodStart, periodEnd);
      logger.info(`Successfully processed billing for tenant: ${org.name} (${org.id})`);
    } catch (err) {
      logger.error(`Critical: FAILED billing for tenant ${org.name} (${org.id})`, err);
      await auditService.log({
        orgId: org.id,
        action: "BILLING_CRON_TENANT_FAILURE",
        resourceType: "BILLING_RECORD",
        metadata: { error: (err as any).message } as any
      });
    }
  }

  logger.info("Monthly Billing Cycle Completed.");
}

// If run directly via CLI (e.g. node dist/jobs/billing-cron.js)
if (require.main === module) {
  runMonthlyBillingJob()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("Cron Job Fatal Error:", err);
      process.exit(1);
    });
}
