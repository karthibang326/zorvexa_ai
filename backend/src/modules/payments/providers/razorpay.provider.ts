import { PaymentProvider, CheckoutSessionInput, CheckoutSessionOutput } from "./payment-provider.interface";
import { NormalizedEvent } from "./normalized-event.interface";
import { createRazorpayOrder } from "../razorpay.client";

export class RazorpayProvider implements PaymentProvider {
  getName() {
    return "razorpay";
  }

  async createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionOutput> {
    const plan = input.planId.toLowerCase() as "starter" | "growth" | "enterprise";
    
    // Convert to Paise (Razorpay unit)
    // In a production app, the Tax Engine would use the regional currency (INR) directly.
    const amountPaise = Math.round(input.amount * 100); 

    const result = await createRazorpayOrder({
      plan,
      tenantId: input.orgId,
      amountPaise,
      // Merge compliance metadata into Razorpay notes
      notes: {
        ...input.metadata,
        customerEmail: input.customerEmail
      } as any
    });

    if (!result.ok) {
      throw new Error(`Razorpay order creation failed: ${result.reason}`);
    }

    return {
      id: result.orderId,
      url: `/billing/razorpay-checkout?orderId=${result.orderId}&amount=${result.amount}&keyId=${result.keyId}`,
      provider: "razorpay",
    };
  }

  async constructEvent(rawBody: string, signature: string): Promise<NormalizedEvent> {
    // Signature validation for Razorpay (simplified placeholder)
    const event = JSON.parse(rawBody); 
    const obj = event.payload?.payment?.entity || event.payload?.order?.entity;

    return {
      id: event.id || `rzp_${Date.now()}`,
      type: "checkout.completed", 
      orgId: obj?.notes?.tenantId || "",
      planId: obj?.notes?.plan || "STARTER",
      status: "active",
      metadata: obj?.notes
    };
  }
}
