import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionPlan = "free" | "starter" | "growth" | "enterprise";
export type SubscriptionStatus = "active" | "trialing" | "canceled" | "incomplete" | "past_due" | "unpaid" | "inactive";

export interface Subscription {
  plan_id: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        // Using the backend's tenant billing endpoint which pulls from PostgreSQL via Prisma
        const { data } = await api.get("/tenant/billing");
        
        setSubscription({
          plan_id: (data.plan?.toLowerCase() || "free") as SubscriptionPlan,
          status: (data.status?.toLowerCase() || "active") as SubscriptionStatus,
          current_period_end: data.currentPeriodEnd || null,
          cancel_at_period_end: Boolean(data.cancelAtPeriodEnd),
        });
      } catch (err) {
        console.error("Error fetching subscription from backend:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch subscription"));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Note: Real-time updates for subscriptions would now come through 
    // the backend's WebSocket or regular polling rather than Supabase.
  }, [user]);

  return { subscription, loading, error };
};
