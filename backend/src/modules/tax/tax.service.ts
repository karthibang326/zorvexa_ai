import { isValidGSTIN } from "./gst.validator";

export interface TaxInput {
  amount: number;
  country: string;
  customerType: "B2C" | "B2B";
  taxId?: string;
}

export interface TaxOutput {
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  taxType: "GST" | "VAT" | "NONE";
}

export class TaxService {
  /**
   * Deterministic tax calculation for global and regional compliance.
   * No AI influence - strictly rule-based.
   */
  calculateTax(input: TaxInput): TaxOutput {
    let taxRate = 0;
    let taxType: "GST" | "VAT" | "NONE" = "NONE";

    // Indian Region Specifics (GST)
    if (input.country === "IN") {
      taxType = "GST";

      // B2B Reverse Charge Logic
      if (input.customerType === "B2B" && input.taxId && isValidGSTIN(input.taxId)) {
        taxRate = 0; // Reverse charge applies for registered GST entities
      } else {
        taxRate = 0.18; // Standard 18% GST for B2C/unregistered
      }
    } 
    // Global VAT (placeholder - Stripe Tax handles this automatically if enabled)
    else if (["GB", "DE", "FR", "ES", "IT"].includes(input.country)) {
      taxType = "VAT";
      taxRate = 0; // Assume 0 here as we use Stripe's automatic_tax for Global
    }

    const taxAmount = Number((input.amount * taxRate).toFixed(2));
    const totalAmount = Number((input.amount + taxAmount).toFixed(2));

    return {
      taxRate,
      taxAmount,
      totalAmount,
      taxType,
    };
  }
}
