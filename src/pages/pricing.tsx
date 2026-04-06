import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { createCheckout, estimateValuePricing, type ValuePlan } from "@/lib/billing";
import { useAuth } from "@/hooks/useAuth";
import { useContextStore } from "@/store/context";
import { toast } from "sonner";

const tiers = [
  {
    name: "Starter",
    price: "$49 base + 25% of savings",
    description: "For early teams that want immediate value-based automation.",
    cta: "Try Demo (No Setup)",
    features: ["15-25% savings share model", "Cost Intelligence dashboard", "Email support"],
  },
  {
    name: "Growth",
    price: "$199 base + 20% of savings",
    description: "For scaling teams optimizing cloud efficiency every day.",
    cta: "Upgrade to Pro",
    highlighted: true,
    features: ["AI-driven cost optimization", "Savings-based pricing transparency", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    description: "For global organizations with high spend and strict controls.",
    cta: "Contact Sales",
    features: ["Dedicated success architect", "Advanced governance and controls", "SSO/SAML + custom security review", "Private deployment options"],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { orgId } = useContextStore();
  const navigate = useNavigate();
  const [cloudSpendUsd, setCloudSpendUsd] = useState(50000);
  const [savingsRate, setSavingsRate] = useState(18);
  const [plan, setPlan] = useState<ValuePlan>("growth");
  const [platformFeeUsd, setPlatformFeeUsd] = useState(0);
  const [netSavingsUsd, setNetSavingsUsd] = useState(0);
  const [gstId, setGstId] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState<ValuePlan | null>(null);

  const savingsUsd = useMemo(() => Number(((cloudSpendUsd * savingsRate) / 100).toFixed(2)), [cloudSpendUsd, savingsRate]);

  useEffect(() => {
    const run = async () => {
      try {
        const out = await estimateValuePricing({ cloudSpendUsd, savingsUsd, plan });
        setPlatformFeeUsd(out.platformFeeUsd);
        setNetSavingsUsd(out.netSavingsUsd);
      } catch {
        const pct = plan === "enterprise" ? 0.15 : plan === "growth" ? 0.2 : 0.25;
        const base = plan === "enterprise" ? 799 : plan === "growth" ? 199 : 49;
        const fee = Number((savingsUsd * pct + base).toFixed(2));
        setPlatformFeeUsd(fee);
        setNetSavingsUsd(Number((savingsUsd - fee).toFixed(2)));
      }
    };
    void run();
  }, [cloudSpendUsd, savingsUsd, plan]);

  const handlePlanCheckout = async (tierName: string) => {
    const normalized = tierName.toLowerCase();
    if (normalized === "enterprise") {
      window.location.href = "mailto:sales@zorvexa.com?subject=Zorvexa%20Enterprise%20pricing";
      return;
    }

    const selectedPlan: ValuePlan = normalized as ValuePlan;
    if (!user?.email) {
      toast.info("Sign in to continue to checkout");
      navigate("/auth");
      return;
    }

    try {
      setCheckoutBusy(selectedPlan);
      const session = await createCheckout({
        customerEmail: user.email,
        tenantId: orgId,
        plan: selectedPlan,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
        gstId: gstId.trim() || undefined
      });
      
      if (session.url?.startsWith("http")) {
        window.location.href = session.url;
        return;
      }
      
      if (session.configured === false) {
        toast.error(session.hint ?? "Payments are not configured on the server yet.");
        return;
      }
      
      toast.error("Checkout initialization failed. Please try again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to open checkout");
    } finally {
      setCheckoutBusy(null);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-300">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Only pay when you save</h1>
          <p className="mt-4 text-base text-slate-300">
            Zorvexa aligns to outcomes: we earn when your cloud savings increase.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-5xl grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-widest text-emerald-200">Savings Range</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">18-30%</p>
          </div>
          <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-widest text-blue-200">AI Decisions Monthly</p>
            <p className="mt-1 text-2xl font-semibold text-blue-100">1.2M+</p>
          </div>
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-widest text-violet-200">Credibility</p>
            <p className="mt-1 text-sm font-medium text-violet-100">Built with SRE principles inspired by Google and Meta infrastructure systems</p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-center text-[11px] uppercase tracking-widest text-white/55">How It Works</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              { title: "1. Connect", desc: "Connect AWS, GCP, or Azure in minutes." },
              { title: "2. Observe", desc: "Zorvexa measures spend before optimization." },
              { title: "3. Optimize", desc: "AI executes safe cost actions automatically." },
              { title: "4. Bill by Value", desc: "You pay a share only when savings are real." },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-white/10 bg-[#0f172a] p-3">
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="mt-1 text-xs text-slate-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-blue-400/25 bg-gradient-to-b from-blue-500/10 to-indigo-500/5 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-200">
              Cloud spend (monthly)
              <input
                type="number"
                min={0}
                value={cloudSpendUsd}
                onChange={(e) => setCloudSpendUsd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-[#0f172a] px-3 text-white"
              />
            </label>
            <label className="text-sm text-slate-200">
              Expected savings %
              <input
                type="number"
                min={0}
                max={80}
                value={savingsRate}
                onChange={(e) => setSavingsRate(Math.max(0, Math.min(80, Number(e.target.value) || 0)))}
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-[#0f172a] px-3 text-white"
              />
            </label>
            <label className="text-sm text-slate-200">
              Plan
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as ValuePlan)}
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-[#0f172a] px-3 text-white"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="text-sm text-slate-200">
              GSTIN (Optional - India B2B)
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={gstId}
                onChange={(e) => setGstId(e.target.value.toUpperCase())}
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-[#0f172a] px-3 text-white placeholder:text-slate-600 focus:border-blue-400 focus:outline-none transition-colors"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-widest text-white/50">AI Saved</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">${Math.round(savingsUsd).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-widest text-white/50">Platform Fee</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">${Math.round(platformFeeUsd).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-widest text-white/50">Net Savings</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-300">${Math.round(netSavingsUsd).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5 text-sm text-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200/90">Secure payments (Stripe Checkout)</p>
          <p className="mt-2 text-slate-300">
            Upgrades open <strong className="text-emerald-100">Stripe-hosted Checkout</strong> (PCI handled by Stripe). Configure the API:{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">POST /api/billing/create-checkout</code>. After changing{" "}
            <code className="text-slate-300">backend/.env</code>, <strong>restart the process on port 5002</strong> (an old API will ignore new keys).
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
            <li>
              <code className="text-slate-300">STRIPE_SECRET_KEY</code> + <code className="text-slate-300">STRIPE_PRICE_GROWTH</code> (<code className="text-slate-300">price_…</code>) in{" "}
              <code className="text-slate-300">backend/.env</code> — see <code className="text-slate-300">docs/STRIPE_PAYMENT_SETUP.md</code>
            </li>
            <li>
              <code className="text-slate-300">SUPABASE_URL</code> on the backend = same as <code className="text-slate-300">VITE_SUPABASE_URL</code> (Bearer token for checkout)
            </li>
            <li>
              Webhook: <code className="text-slate-300">/api/billing/webhook</code> + <code className="text-slate-300">STRIPE_WEBHOOK_SECRET</code>
            </li>
            <li className="text-slate-500">
              Optional dev-only fake redirect (not secure): <code className="text-slate-400">BILLING_DUMMY_CHECKOUT=true</code> — default is <strong>off</strong>.
            </li>
          </ul>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative rounded-2xl border p-6 transition duration-200 hover:scale-[1.015] ${tier.highlighted
                  ? "border-blue-400/50 bg-gradient-to-b from-blue-500/20 to-indigo-500/10 shadow-[0_20px_60px_rgba(37,99,235,0.25)] hover:shadow-[0_24px_70px_rgba(37,99,235,0.35)]"
                  : "border-white/10 bg-[#111827]/85 hover:border-white/20 hover:bg-[#111827]"
                }`}
            >
              {tier.highlighted ? (
                <span className="absolute right-4 top-4 rounded-full border border-blue-300/40 bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-200">
                  Most Popular
                </span>
              ) : null}
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{tier.price}</p>
              <p className="mt-2 text-sm text-slate-300">{tier.description}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 text-blue-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void handlePlanCheckout(tier.name)}
                disabled={checkoutBusy !== null}
                className={`mt-8 h-11 w-full rounded-xl text-sm font-semibold transition duration-200 ${tier.highlighted
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:brightness-110"
                    : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                  } disabled:opacity-70`}
              >
                {checkoutBusy && tier.name === "Growth" ? "Opening checkout…" : tier.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
