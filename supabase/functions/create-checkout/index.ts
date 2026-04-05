import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeProPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");

const stripe = new Stripe(stripeSecretKey ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 204, // 204 No Content for preflight
      headers: corsHeaders 
    });
  }

  try {
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY is NOT set in Supabase environment.");
      throw new Error("Billing system check failed: Missing STRIPE_SECRET_KEY");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header in request.");
      throw new Error("Unauthorized request.");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
       console.error("Auth session verification failed:", authError?.message);
       throw new Error("Authentication failed. Please sign in again.");
    }

    const { planId } = await req.json();
    console.log(`[Checkout] User: ${user.id}, Plan: ${planId}`);

    const priceId = planId === "pro" ? stripeProPriceId : null;
    if (!priceId) {
      console.error(`Price ID not found for plan: ${planId}`);
      throw new Error("Configuration error: Invalid plan or missing Price ID.");
    }

    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError && subError.code !== "PGRST116") {
       console.error("Error fetching subscription:", subError.message);
       throw new Error("Database error while retrieving customer profile.");
    }

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      console.log(`Creating new Stripe customer for user: ${user.id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabaseClient
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/billing/success`,
      cancel_url: `${req.headers.get("origin")}/billing/cancel`,
      metadata: { user_id: user.id },
    });

    console.log(`[Success] Checkout ID: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "An unexpected backend error occurred.";
    console.error(`[Edge Function Error]: ${errorMsg}`);
    
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


