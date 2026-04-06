import Stripe from "stripe";
import { env } from "../../../config/env";
import { logger } from "../../../lib/logger";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" as any })
  : null;

export const stripeService = {
  async getOrCreateCustomer(tenantId: string, email: string, name: string) {
    if (!stripe) throw new Error("Stripe not configured");

    // Search for existing
    const customers = await stripe.customers.search({
      query: `metadata['tenantId']:'${tenantId}'`,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    return await stripe.customers.create({
      email,
      name,
      metadata: { tenantId }
    });
  },

  async createCheckoutSession(input: {
    customerId: string;
    tenantId: string;
    priceId: string;
    plan: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (!stripe) throw new Error("Stripe not configured");

    return await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { tenantId: input.tenantId, plan: input.plan }
    });
  },

  async createInvoiceItem(customerId: string, amount: number, description: string, metadata: any) {
    if (!stripe) throw new Error("Stripe not configured");

    return await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount * 100), // convert to cents
      currency: "usd",
      description,
      metadata
    });
  },

  async getLatestInvoice(subscriptionId: string) {
    if (!stripe) throw new Error("Stripe not configured");
    
    // Stripe invoices are automatically generated at period end or when we call finalize
    const invoices = await stripe.invoices.list({ subscription: subscriptionId, limit: 1 });
    return invoices.data[0];
  },

  constructEvent(rawBody: any, signature: string) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe webhook not configured");
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  }
};
