import { z } from "zod";

export const CreateCheckoutSchema = z.object({
  provider: z.enum(["stripe", "razorpay"]).optional(),
  priceId: z.string().min(1).optional(),
  plan: z.string().transform(v => v.toLowerCase()).pipe(z.enum(["starter", "growth", "enterprise"])),
  tenantId: z.string().min(1),
  customerEmail: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  gstId: z.string().optional(),
});

export const BillingWebhookSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
});
