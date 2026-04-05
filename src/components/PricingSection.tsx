import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Check, X, Loader2, Zap, Shield, BarChart3,
  Bot, Globe, Clock, DollarSign, TrendingDown,
  Users, ArrowRight, Star, ChevronDown, ChevronUp,
  Activity, Lock, Headphones,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/shared/branding";

// ─── Tiers ────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "free",
    name: "Free",
    tagline: "For solo engineers & side projects",
    price_monthly: 0,
    price_annual: 0,
    badge: null,
    highlighted: false,
    cta: "Start Free",
    color: "text-muted-foreground",
    features: {
      clusters: "1 cluster",
      events: "50K events/mo",
      ai_actions: "100 AI actions/mo",
      deployments: "10 deployments/mo",
      monitoring: "Basic metrics",
      ai_copilot: false,
      ai_agents: false,
      cost_intelligence: false,
      security_scans: "Manual only",
      sso: false,
      sla: "Community",
      audit_logs: false,
      environments: "1",
      retention: "3 days",
    },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing engineering teams",
    price_monthly: 149,
    price_annual: 119,
    badge: "Most Popular",
    highlighted: true,
    cta: "Start Free Trial",
    color: "text-primary",
    features: {
      clusters: "10 clusters",
      events: "5M events/mo",
      ai_actions: "10,000 AI actions/mo",
      deployments: "Unlimited",
      monitoring: "Full SRE suite",
      ai_copilot: true,
      ai_agents: true,
      cost_intelligence: true,
      security_scans: "Automated + CVE alerts",
      sso: false,
      sla: "99.9% uptime SLA",
      audit_logs: true,
      environments: "10",
      retention: "30 days",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large orgs with complex needs",
    price_monthly: null,
    price_annual: null,
    badge: null,
    highlighted: false,
    cta: "Contact Sales",
    color: "text-foreground",
    features: {
      clusters: "Unlimited clusters",
      events: "Unlimited events",
      ai_actions: "Unlimited AI actions",
      deployments: "Unlimited",
      monitoring: "Full SRE suite + custom dashboards",
      ai_copilot: true,
      ai_agents: true,
      cost_intelligence: true,
      security_scans: "SOC2, ISO, PCI-DSS compliant",
      sso: true,
      sla: "99.99% SLA + dedicated SRE",
      audit_logs: true,
      environments: "Unlimited",
      retention: "1 year+",
    },
  },
];

// ─── Usage pricing ─────────────────────────────────────────────────────────────
const USAGE_RATES = [
  { label: "Events", unit: "per 1M events", price: "$8", icon: Activity },
  { label: "AI Actions", unit: "per action above plan", price: "$0.02", icon: Bot },
  { label: "Extra Clusters", unit: "per cluster/mo", price: "$12", icon: Globe },
  { label: "Extended Retention", unit: "per GB/mo", price: "$0.10", icon: Clock },
];

// ─── Comparison table rows ────────────────────────────────────────────────────
const COMPARE_ROWS: { label: string; icon: any; free: string | boolean; pro: string | boolean; enterprise: string | boolean }[] = [
  { label: "Clusters",           icon: Globe,      free: "1",                           pro: "10",                         enterprise: "Unlimited" },
  { label: "Events / Month",     icon: Activity,   free: "50K",                         pro: "5M",                         enterprise: "Unlimited" },
  { label: "AI Actions / Month", icon: Bot,        free: "100",                         pro: "10,000",                     enterprise: "Unlimited" },
  { label: "Deployments",        icon: Zap,        free: "10/mo",                       pro: "Unlimited",                  enterprise: "Unlimited" },
  { label: "Environments",       icon: Globe,      free: "1",                           pro: "10",                         enterprise: "Unlimited" },
  { label: "AI Copilot",         icon: Bot,        free: false,                         pro: true,                         enterprise: true },
  { label: "Autonomous Agents",  icon: Bot,        free: false,                         pro: true,                         enterprise: true },
  { label: "Cost Intelligence",  icon: DollarSign, free: false,                         pro: true,                         enterprise: true },
  { label: "SRE Monitoring",     icon: BarChart3,  free: "Basic",                       pro: "Full suite",                 enterprise: "Custom dashboards" },
  { label: "Security Scans",     icon: Shield,     free: "Manual",                      pro: "Automated + CVE alerts",     enterprise: "SOC2 / ISO / PCI-DSS" },
  { label: "SSO / SAML",         icon: Lock,       free: false,                         pro: false,                        enterprise: true },
  { label: "Audit Logs",         icon: Shield,     free: false,                         pro: true,                         enterprise: true },
  { label: "SLA",                icon: Clock,      free: "Community",                   pro: "99.9% uptime",               enterprise: "99.99% + dedicated SRE" },
  { label: "Log Retention",      icon: Activity,   free: "3 days",                      pro: "30 days",                    enterprise: "1 year+" },
  { label: "Support",            icon: Headphones, free: "Community",                   pro: "Email + Slack",              enterprise: "24×7 dedicated CSM" },
];

// ─── ROI stats ────────────────────────────────────────────────────────────────
const ROI = [
  { metric: "68%", label: "Reduction in incident MTTR", sub: "Autonomous agents resolve incidents before on-call wakes up", icon: TrendingDown },
  { metric: "4.2×", label: "Faster deployment cadence", sub: "Teams ship daily instead of weekly with AI-guided canary deploys", icon: Zap },
  { metric: "$74K", label: "Avg annual cloud savings", sub: "FinOps engine identifies and eliminates waste automatically", icon: DollarSign },
  { metric: "99.97%", label: "Platform uptime achieved", sub: "Predictive anomaly detection catches failures before they cascade", icon: Activity },
];

// ─── Cost Estimator ───────────────────────────────────────────────────────────
function CostEstimator() {
  const [events, setEvents] = useState(2);         // millions
  const [clusters, setClusters] = useState(3);
  const [aiActions, setAiActions] = useState(5000);

  // Pro plan base: $149/mo includes 5M events, 10 clusters, 10K AI actions
  const PRO_BASE = 149;
  const extraEvents = Math.max(0, events - 5) * 8;
  const extraClusters = Math.max(0, clusters - 10) * 12;
  const extraAI = Math.max(0, aiActions - 10000) * 0.02;
  const total = Math.max(PRO_BASE, PRO_BASE + extraEvents + extraClusters + extraAI);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-8 md:p-12 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary mb-3">Cost Estimator</p>
        <h3 className="text-2xl font-black tracking-tight">Estimate your monthly cost</h3>
        <p className="text-muted-foreground text-sm mt-2">Drag the sliders to model your usage. No surprises.</p>
      </div>

      <div className="space-y-8">
        {[
          { label: "Events / Month", unit: "million", value: events, setValue: setEvents, min: 0, max: 50, step: 1, display: `${events}M` },
          { label: "Clusters",       unit: "",        value: clusters, setValue: setClusters, min: 1, max: 50, step: 1, display: `${clusters}` },
          { label: "AI Actions",     unit: "",        value: aiActions, setValue: setAiActions, min: 0, max: 50000, step: 500, display: aiActions.toLocaleString() },
        ].map(({ label, value, setValue, min, max, step, display }) => (
          <div key={label} className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              <span className="text-sm font-black text-primary tabular-nums">{display}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={e => setValue(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-primary"
            />
          </div>
        ))}
      </div>

      <div className="mt-10 pt-8 border-t border-white/10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estimated Monthly Cost</p>
            <p className="text-5xl font-black tracking-tighter text-primary">${total.toFixed(0)}<span className="text-xl text-muted-foreground">/mo</span></p>
            <p className="text-[11px] text-muted-foreground mt-2">Billed on actual usage · No hidden fees</p>
          </div>
          <div className="text-right space-y-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            {extraEvents > 0 && <p>+${extraEvents.toFixed(0)} extra events</p>}
            {extraClusters > 0 && <p>+${extraClusters.toFixed(0)} extra clusters</p>}
            {extraAI > 0 && <p>+${extraAI.toFixed(0)} extra AI actions</p>}
            <p className="text-muted-foreground/40">Pro base: $149</p>
          </div>
        </div>
        <Button className="w-full mt-6 h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20"
          onClick={() => window.location.href = "/auth"}>
          Start Free Trial — Upgrade Anytime <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─── Compare row cell ─────────────────────────────────────────────────────────
function Cell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-[11px] font-black text-foreground/80">{value}</span>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PricingSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const handleAction = async (tier: typeof TIERS[0]) => {
    if (tier.id === "enterprise") {
      window.location.href = "mailto:sales@zorvexa.com?subject=Zorvexa%20Enterprise";
      return;
    }
    if (tier.id === "free") {
      window.location.href = "/auth";
      return;
    }
    if (!user) { window.location.href = "/auth"; return; }
    try {
      setLoading(tier.id);
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { planId: tier.id } });
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("Billing service error.");
    } catch (err) {
      toast({ title: "Checkout Error", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="py-32 relative overflow-hidden" id="pricing">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container px-4 relative">

        {/* ── Hero ── */}
        <motion.div className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-balance mb-4">
            Simple, scalable pricing<br className="hidden sm:block" /> for AI-powered DevOps
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Start free. Pay as you scale. Every plan includes the full platform — usage determines the bill.
          </p>
          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-white/[0.04] border border-white/10">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${!annual ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${annual ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}>
              Annual
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">−20%</span>
            </button>
          </div>
        </motion.div>

        {/* ── Tier cards ── */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {TIERS.map((tier, i) => {
            const price = annual ? tier.price_annual : tier.price_monthly;
            return (
              <motion.div key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl flex flex-col overflow-hidden transition-all ${
                  tier.highlighted
                    ? "border border-primary/40 bg-primary/5 shadow-2xl shadow-primary/10"
                    : "border border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute top-0 inset-x-0 flex justify-center">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] bg-primary text-primary-foreground px-4 py-1.5 rounded-b-xl">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="p-8 pt-10 flex-1 flex flex-col">
                  {/* Name + tagline */}
                  <div className="mb-6">
                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2 ${tier.color}`}>{tier.name}</p>
                    <p className="text-muted-foreground text-sm">{tier.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    {price !== null ? (
                      <div className="flex items-end gap-1.5">
                        <span className="text-5xl font-black tracking-tighter">${price}</span>
                        <span className="text-muted-foreground text-sm mb-2">/mo</span>
                        {annual && tier.price_monthly !== null && tier.price_monthly > 0 && (
                          <span className="text-muted-foreground/50 text-sm mb-2 line-through ml-1">${tier.price_monthly}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-4xl font-black tracking-tighter">Custom</span>
                    )}
                    {price === 0 ? (
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">Free forever · No credit card</p>
                    ) : price !== null ? (
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
                        + usage · {annual ? "billed annually" : "billed monthly"}
                      </p>
                    ) : (
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">Volume discounts · Custom SLA</p>
                    )}
                  </div>

                  {/* Key features */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {[
                      tier.features.clusters,
                      tier.features.events,
                      tier.features.ai_actions,
                      tier.features.deployments,
                      tier.features.monitoring,
                      tier.features.ai_copilot && "AI Copilot + Autonomous Agents",
                      tier.features.cost_intelligence && "FinOps Cost Intelligence",
                      tier.features.sso && "SSO / SAML",
                      tier.features.sla,
                      tier.features.audit_logs && "Full Audit Logs",
                    ].filter(Boolean).map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-secondary-foreground">{f as string}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={tier.highlighted ? "default" : "outline"}
                    disabled={!!loading}
                    onClick={() => handleAction(tier)}
                    className={`w-full h-12 font-black text-[11px] uppercase tracking-widest ${
                      tier.highlighted ? "shadow-lg shadow-primary/20" : ""
                    }`}
                  >
                    {loading === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : tier.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Usage pricing ── */}
        <motion.div className="max-w-5xl mx-auto mb-20"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Usage-Based Add-ons</span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary ml-auto">
                Transparent · Predictable
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {USAGE_RATES.map(({ label, unit, price, icon: Icon }) => (
                <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center space-y-2">
                  <Icon className="w-4 h-4 text-primary mx-auto" />
                  <p className="text-2xl font-black tracking-tighter">{price}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</p>
                  <p className="text-[9px] text-muted-foreground/40">{unit}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-muted-foreground/40 mt-6 font-black uppercase tracking-widest">
              Usage billed monthly in arrears · Capped alerts available · No surprise invoices
            </p>
          </div>
        </motion.div>

        {/* ── Cost Estimator ── */}
        <motion.div className="mb-24"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <CostEstimator />
        </motion.div>

        {/* ── Feature comparison table ── */}
        <motion.div className="max-w-5xl mx-auto mb-24"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <button
            onClick={() => setShowCompare(c => !c)}
            className="flex items-center gap-3 mx-auto mb-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompare ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCompare ? "Hide" : "Show"} full feature comparison
          </button>

          <AnimatePresence>
            {showCompare && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-3xl border border-white/[0.06] overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-4 bg-white/[0.03] border-b border-white/[0.06]">
                    <div className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Feature</div>
                    {TIERS.map(t => (
                      <div key={t.id} className={`px-6 py-5 text-center ${t.highlighted ? "bg-primary/5" : ""}`}>
                        <p className={`text-[11px] font-black uppercase tracking-widest ${t.color}`}>{t.name}</p>
                      </div>
                    ))}
                  </div>
                  {/* Rows */}
                  {COMPARE_ROWS.map((row, i) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label}
                        className={`grid grid-cols-4 border-b border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                        <div className="px-6 py-4 flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground/70">{row.label}</span>
                        </div>
                        <div className="px-6 py-4 text-center flex items-center justify-center"><Cell value={row.free} /></div>
                        <div className="px-6 py-4 text-center flex items-center justify-center bg-primary/[0.03]"><Cell value={row.pro} /></div>
                        <div className="px-6 py-4 text-center flex items-center justify-center"><Cell value={row.enterprise} /></div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── ROI section ── */}
        <motion.div className="max-w-5xl mx-auto mb-24"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">ROI & Value</p>
            <h3 className="text-3xl font-black tracking-tighter">The math works in your favor</h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Teams using {BRAND.name} report dramatic improvements in reliability, velocity, and cost — typically within 30 days.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROI.map((r, i) => (
              <motion.div key={r.metric}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 text-center space-y-3"
              >
                <r.icon className="w-5 h-5 text-primary mx-auto" />
                <p className="text-4xl font-black tracking-tighter text-primary">{r.metric}</p>
                <p className="text-sm font-black text-foreground/80">{r.label}</p>
                <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{r.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Trust signals ── */}
        <motion.div className="max-w-4xl mx-auto mb-24 text-center"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              { icon: Shield,      label: "No hidden fees" },
              { icon: DollarSign, label: "Transparent pricing" },
              { icon: Clock,      label: "Cancel anytime" },
              { icon: Users,      label: "Trusted by 800+ engineering teams globally" },
              { icon: Lock,       label: "SOC2 Type II certified" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                <Icon className="w-3.5 h-3.5 text-primary" />
                {label}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
          </div>
          <p className="text-muted-foreground text-sm italic">"{BRAND.name} paid for itself in week one — the FinOps engine found $8K/mo in waste we didn't know we had."</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-2">— Staff SRE, Series B Fintech</p>
        </motion.div>

        {/* ── Final CTA ── */}
        <motion.div className="text-center"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 className="text-3xl font-black tracking-tighter mb-4">Ready to ship faster and spend less?</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Join 800+ teams running AI-native DevOps. Free forever until you need more.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg"
              onClick={() => window.location.href = "/auth"}
              className="h-14 px-10 font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-primary/20">
              Start Free — No Card Required
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline"
              onClick={() => window.location.href = "mailto:sales@zorvexa.com?subject=Zorvexa%20Enterprise"}
              className="h-14 px-10 font-black text-[12px] uppercase tracking-widest border-white/10 hover:border-primary/40">
              Book a Demo
            </Button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 mt-6">
            Free plan · No credit card · Upgrade in 30 seconds
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default PricingSection;
