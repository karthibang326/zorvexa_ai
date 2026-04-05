import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    note: "per month",
    features: ["Up to 20 workflows", "Basic AI insights", "Community support"],
  },
  {
    name: "Pro",
    price: "$199",
    note: "per month",
    featured: true,
    features: ["Unlimited workflows", "Autonomous remediation", "Cost optimization engine"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "annual contract",
    features: ["Dedicated control plane", "Advanced compliance", "White-glove onboarding"],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-300">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Plans that scale with your platform
          </h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border p-6 ${
                tier.featured
                  ? "border-blue-400/40 bg-gradient-to-b from-blue-500/15 to-indigo-500/10 shadow-[0_16px_50px_rgba(37,99,235,0.25)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{tier.price}</p>
              <p className="mt-1 text-sm text-slate-300">{tier.note}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 text-blue-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-7 w-full ${
                  tier.featured
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white hover:brightness-110"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {tier.name === "Enterprise" ? "Contact Sales" : "Start Free"}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
