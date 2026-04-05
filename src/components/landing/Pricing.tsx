import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const signupHref = "/auth?signup=1";

const tiers = [
  {
    name: "Starter",
    price: "From $49",
    suffix: "+ savings share",
    note: "For teams validating autonomous savings",
    cta: "Try Demo (No Setup)",
    href: "/dashboard?demo=1",
    featured: false,
    features: ["Simulation & cost intelligence", "Savings-based fee — pay as you save", "Email support"],
  },
  {
    name: "Growth",
    price: "From $199",
    suffix: "+ savings share",
    note: "Most popular — full autonomous loop",
    cta: "Start with Growth",
    href: signupHref,
    featured: true,
    features: [
      "Autonomous remediation & scaling",
      "Incident playbooks & governance packs",
      "Priority support & success check-ins",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    suffix: "outcome-based",
    note: "Global scale, compliance, SSO",
    cta: "Talk to sales",
    href: "mailto:sales@zorvexa.com?subject=Enterprise%20%E2%80%94%20Zorvexa",
    featured: false,
    features: ["Dedicated architect", "VPC / isolated tenancy options", "SLA & security review"],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Only pay when Zorvexa delivers value
          </h2>
          <p className="mt-4 text-sm text-slate-400 sm:text-base">
            Outcome-based plans — base platform fee plus aligned savings share when we reduce spend and toil.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] px-4 py-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/90">Automation</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">~70%</p>
            <p className="mt-1 text-[11px] text-emerald-200/70">of routine ops</p>
          </div>
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] px-4 py-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200/90">Savings band</p>
            <p className="mt-1 text-2xl font-semibold text-blue-100">15–30%</p>
            <p className="mt-1 text-[11px] text-blue-200/70">typical cloud reduction</p>
          </div>
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] px-4 py-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200/90">Model</p>
            <p className="mt-1 text-sm font-medium text-violet-100">Base + share</p>
            <p className="mt-1 text-[11px] text-violet-200/70">of realized savings</p>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.featured
                  ? "border-indigo-400/35 bg-gradient-to-b from-indigo-500/[0.12] to-blue-600/[0.06] shadow-[0_20px_60px_rgba(79,70,229,0.2)] ring-1 ring-indigo-400/20"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {tier.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Best value
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <div className="mt-4 flex flex-wrap items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-white">{tier.price}</span>
                <span className="text-sm text-slate-400">{tier.suffix}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{tier.note}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-8 w-full rounded-xl ${
                  tier.featured
                    ? "bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-white hover:brightness-110"
                    : "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                }`}
                variant={tier.featured ? "default" : "outline"}
              >
                {tier.href.startsWith("mailto:") ? (
                  <a href={tier.href} className="inline-flex w-full items-center justify-center">
                    {tier.cta}
                  </a>
                ) : (
                  <Link to={tier.href}>{tier.cta}</Link>
                )}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
