import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "For individual builders and early-stage teams.",
    cta: "Start Free",
    features: ["Up to 5 workflows", "Basic observability", "Email support"],
  },
  {
    name: "Pro",
    price: "$49/mo",
    description: "For fast-moving platform teams that need full automation.",
    cta: "Upgrade to Pro",
    highlighted: true,
    features: ["Unlimited workflows", "AI optimization engine", "Self-healing automation"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations running mission-critical workloads.",
    cta: "Contact Sales",
    features: ["Multi-cloud + SRE controls", "Advanced governance", "Dedicated support"],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mb-14 flex items-center justify-between">
          <Link to="/">
            <AstraOpsLogo size={22} wordmarkClassName="text-[20px] text-white" />
          </Link>
          <Link to="/auth/login" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10">
            Sign in
          </Link>
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-300">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Simple, transparent plans</h1>
          <p className="mt-4 text-base text-slate-300">
            Choose the plan that matches your cloud maturity. Upgrade any time as your automation footprint grows.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative rounded-2xl border p-6 transition duration-200 hover:scale-[1.015] ${
                tier.highlighted
                  ? "border-blue-400/50 bg-gradient-to-b from-blue-500/20 to-indigo-500/10 shadow-[0_20px_60px_rgba(37,99,235,0.25)]"
                  : "border-white/10 bg-[#111827]/85 hover:border-white/20"
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
                className={`mt-8 h-11 w-full rounded-xl text-sm font-semibold transition duration-200 ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:brightness-110"
                    : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                }`}
              >
                {tier.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
