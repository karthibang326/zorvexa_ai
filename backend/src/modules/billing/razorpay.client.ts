import { env } from "../../config/env";

export type RazorpayOrderOk = {
  ok: true;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt: string;
};

export type RazorpayOrderFail = { ok: false; reason: string };

export type RazorpayOrderResult = RazorpayOrderOk | RazorpayOrderFail;

/** INR amounts in paise — anchors for Checkout; override with amountPaise for custom SKUs. */
function defaultAmountPaise(plan: "starter" | "growth" | "enterprise"): number {
  if (plan === "enterprise") return 79_900;
  if (plan === "growth") return 19_900;
  return 4_900;
}

/**
 * Creates a Razorpay Order (server-side). Client completes payment with Checkout using keyId + orderId.
 * @see https://razorpay.com/docs/api/orders/create/
 */
export async function createRazorpayOrder(input: {
  plan: "starter" | "growth" | "enterprise";
  tenantId?: string;
  amountPaise?: number;
}): Promise<RazorpayOrderResult> {
  const keyId = env.RAZORPAY_KEY_ID.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET.trim();
  if (!keyId || !keySecret) {
    return { ok: false, reason: "missing_credentials" };
  }

  const amount = input.amountPaise ?? defaultAmountPaise(input.plan);
  const receipt = `astra_${Date.now().toString(36)}_${(input.tenantId ?? "tenant").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`.slice(0, 40);

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt,
      notes: { tenantId: input.tenantId ?? "", plan: input.plan },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `http_${res.status}: ${text.slice(0, 500)}` };
  }

  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    ok: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    receipt,
  };
}
