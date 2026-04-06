import React, { useState } from "react";
import { Zap, Loader2 } from "lucide-react";

interface UpgradeButtonProps {
  plan: string;
  tenantId: string;
  customerEmail: string;
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({ plan, tenantId, customerEmail }) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "GROWTH", // Default upgrade target for the "Pro" button
          tenantId,
          customerEmail,
          successUrl: window.location.origin + "/billing?success=true",
          cancelUrl: window.location.origin + "/billing?canceled=true",
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      if (session.provider === "stripe") {
        // Stripe: Redirect to hosted checkout
        window.location.href = session.url;
      } else if (session.provider === "razorpay") {
        // Razorpay: Redirect to a specialized checkout route or handle modal
        // For this orchestration demo, we navigate to the checkout URL provided by the engine
        window.location.href = session.url;
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
      alert("Billing service temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (plan === "GROWTH" || plan === "ENTERPRISE") {
    return (
      <button className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-700">
        Manage Subscription
      </button>
    );
  }

  return (
    <button 
      onClick={handleUpgrade}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Zap className="w-4 h-4 fill-white" />
      )}
      Upgrade to Pro
    </button>
  );
};
