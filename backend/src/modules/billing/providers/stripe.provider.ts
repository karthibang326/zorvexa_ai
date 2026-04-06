import Stripe from "stripe";
import { PaymentProvider, CheckoutSessionInput, CheckoutSessionOutput } from "./payment-provider.interface";
import { NormalizedEvent } from "./normalized-event.interface";
import { logger } from "../../../lib/logger";

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia" as any, 
    });
  }

  getName() {
    return "stripe";
  }

  async createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionOutput> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: this.getPriceId(input.planId),
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.email,
      metadata: { orgId: input.orgId, planId: input.planId },
    });

    return {
      id: session.id,
      url: session.url!,
      provider: "stripe",
    };
  }

  async constructEvent(rawBody: string, signature: string): Promise<NormalizedEvent> {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    const obj = event.data.object as any;
    
    switch (event.type) {
      case "checkout.session.completed":
        return {
          id: event.id,
          type: "checkout.completed",
          orgId: obj.metadata?.orgId || "",
          planId: obj.metadata?.planId || "STARTER",
          status: "active",
          stripeCustomerId: obj.customer,
          metadata: obj.metadata
        };
      case "invoice.paid":
        return {
          id: event.id,
          type: "invoice.paid",
          orgId: obj.metadata?.tenantId || "",
          planId: obj.metadata?.plan || "STARTER",
          status: "paid",
          amount: obj.amount_paid / 100,
          metadata: obj.metadata
        };
      default:
        throw new Error(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private getPriceId(planId: string): string {
    if (planId === "GROWTH") return process.env.STRIPE_PRICE_GROWTH || "";
    if (planId === "ENTERPRISE") return process.env.STRIPE_PRICE_ENTERPRISE || "";
    return process.env.STRIPE_PRICE_STARTER || "";
  }
}
