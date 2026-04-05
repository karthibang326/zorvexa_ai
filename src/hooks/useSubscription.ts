import { useState, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionPlan = "starter" | "pro" | "enterprise";
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

    if (!isSupabaseConfigured) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const { data, error: subError } = await supabase
          .from("subscriptions")
          .select("plan_id, status, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .single();

        if (subError) throw subError;
        setSubscription(data as Subscription);
      } catch (err) {
        console.error("Error fetching subscription:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch subscription"));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Subscribe to changes
    const channel = supabase
      .channel("subscription_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setSubscription(payload.new as Subscription);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { subscription, loading, error };
};
