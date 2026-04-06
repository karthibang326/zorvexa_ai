import { PaymentProviderFactory } from "./payment-provider.factory";
import { CheckoutSessionInput, CheckoutSessionOutput } from "./providers/payment-provider.interface";

export class PaymentService {
  /**
   * Orchestrates the payment provider selection and checkout session creation.
   * Region-aware routing (India -> Razorpay, Global -> Stripe).
   */
  async createCheckout(input: CheckoutSessionInput, providerName: string): Promise<CheckoutSessionOutput> {
    const provider = PaymentProviderFactory.getProvider(providerName);
    return await provider.createCheckout(input);
  }

  /**
   * Verifies the integrity of incoming webhook events to prevent financial fraud.
   */
  async verifyWebhook(providerName: string, rawBody: string, signature: string) {
    const provider = PaymentProviderFactory.getProvider(providerName);
    return await provider.constructEvent(rawBody, signature);
  }
}
