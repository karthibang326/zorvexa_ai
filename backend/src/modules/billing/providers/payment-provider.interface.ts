export interface CheckoutSessionInput {
  orgId: string;
  planId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
}

export interface CheckoutSessionOutput {
  id: string;
  url: string;
  provider: 'stripe' | 'razorpay';
}

import { NormalizedEvent } from "./normalized-event.interface";

export interface PaymentProvider {
  createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionOutput>;
  constructEvent(rawBody: string, signature: string): Promise<NormalizedEvent>;
  getName(): string;
}
