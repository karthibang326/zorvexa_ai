import { prisma } from "../../../lib/prisma";
import { auditService } from "./audit.service";
import { logger } from "../../../lib/logger";

export const invoiceService = {
  /**
   * Internal Invoice Generator for financial records.
   * Ensures data consistency between system state and Stripe invoices.
   */
  async createInvoice(input: {
    orgId: string;
    stripeInvoiceId?: string;
    amount: number;
    status: 'PAID' | 'OPEN' | 'FAILED' | 'VOID' | 'PENDING';
    metadata?: any;
  }) {
    try {
      const invoice = await (prisma as any).invoice.create({
        data: {
          orgId: input.orgId,
          stripeInvoiceId: input.stripeInvoiceId,
          amount: input.amount,
          status: input.status,
        }
      });

      await auditService.log({
        orgId: input.orgId,
        action: "INVOICE_CREATED",
        resourceType: "INVOICE",
        resourceId: invoice.id,
        metadata: { ...input.metadata, status: input.status }
      });

      return invoice;
    } catch (error) {
      logger.error("Failed to create internal invoice:", { error, input });
      throw error;
    }
  },

  async updateInvoiceStatus(stripeInvoiceId: string, status: any) {
     return await (prisma as any).invoice.update({
        where: { stripeInvoiceId },
        data: { status }
     });
  }
};
