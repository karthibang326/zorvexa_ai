import { PaymentProvider } from "./payment-provider.interface";
import { StripeProvider } from "./stripe.provider";
import { RazorpayProvider } from "./razorpay.provider";

export class PaymentProviderFactory {
  private static providers: Map<string, PaymentProvider> = new Map();

  static getProvider(name: string): PaymentProvider {
    const lowerName = name.toLowerCase();
    
    if (this.providers.has(lowerName)) {
      return this.providers.get(lowerName)!;
    }

    let provider: PaymentProvider;
    if (lowerName === "stripe") {
      provider = new StripeProvider();
    } else if (lowerName === "razorpay") {
      provider = new RazorpayProvider();
    } else {
      throw new Error(`Unsupported payment provider: ${name}`);
    }

    this.providers.set(lowerName, provider);
    return provider;
  }
}
