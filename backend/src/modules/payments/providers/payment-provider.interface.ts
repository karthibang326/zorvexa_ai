export interface CheckoutSessionInput {
  orgId: string;
  planId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  amount: number; // Tax-inclusive total amount
  metadata?: Record<string, any>;
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
