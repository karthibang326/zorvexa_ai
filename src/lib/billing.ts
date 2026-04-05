import { api } from "@/lib/api";

export type ValuePlan = "starter" | "growth" | "enterprise";

export function calculateFee(savingsUsd: number, feePercentage = 0.2): number {
  const savings = Number.isFinite(savingsUsd) ? Math.max(0, savingsUsd) : 0;
  if (savings <= 0) return 0;
  return Number((savings * feePercentage).toFixed(2));
}

export type ValuePricingEstimate = {
  plan: ValuePlan;
  cloudSpendUsd: number;
  savingsUsd: number;
  savingsRatePct: number;
  feePercentage: number;
  baseFeeUsd: number;
  platformFeeUsd: number;
  netSavingsUsd: number;
  valueMessage: string;
};

export async function estimateValuePricing(input: {
  cloudSpendUsd: number;
  savingsUsd: number;
  plan: ValuePlan;
}) {
  const { data } = await api.post("/billing/value-pricing/estimate", input);
  return data as ValuePricingEstimate;
}

export type BillingDashboard = {
  tenantId: string;
  plan: ValuePlan;
  monthlyFeeUsd: number;
  aiSavingsUsd: number;
  platformFeeUsd: number;
  netSavingsUsd: number;
  feePercentage: number;
  subscriptionStatus: string;
  latestPaymentStatus: string;
  invoices: Array<{
    id: string;
    createdAt: string;
    plan: ValuePlan;
    cloudSpendUsd: number;
    savingsUsd: number;
    platformFeeUsd: number;
    totalDueUsd: number;
    status: string;
  }>;
  savingsEntries?: Array<{
    id: string;
    userId: string;
    ts: string;
    beforeCostUsd: number;
    afterCostUsd: number;
    savingsUsd: number;
    platformFeeUsd: number;
    netSavingsUsd: number;
    explanation: string;
    actions: string[];
    charged: boolean;
  }>;
  tagline: string;
};

export async function getBillingDashboard() {
  const { data } = await api.get("/billing/dashboard");
  return data as BillingDashboard;
}

export async function createCheckout(input: {
  customerEmail: string;
  plan: ValuePlan;
  successUrl: string;
  cancelUrl: string;
}) {
  const { data } = await api.post("/billing/create-checkout", {
    provider: "stripe",
    ...input,
  });
  return data as {
    id: string;
    url: string;
    mode: string;
    provider: string;
    configured?: boolean;
    hint?: string;
    simulated?: boolean;
  };
}

export async function generateInvoice(input: { cloudSpendUsd: number; savingsUsd: number; plan?: ValuePlan }) {
  const { data } = await api.post("/billing/invoice/generate", input);
  return data as { tenantId: string; invoice: { id: string; totalDueUsd: number; status: string } };
}
