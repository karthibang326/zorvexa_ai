import { z } from "zod";

export const CreateCheckoutSchema = z.object({
  provider: z.enum(["stripe", "razorpay"]).optional(),
  priceId: z.string().min(1).optional(),
  plan: z.enum(["starter", "growth", "enterprise"]).optional(),
  tenantId: z.string().min(1).optional(),
  customerEmail: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const BillingWebhookSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
});
