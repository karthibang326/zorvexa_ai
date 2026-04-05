import React, { useEffect, useMemo, useState } from "react";
import { Cloud, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import ModuleHeader from "./ModuleHeader";
import { estimateValuePricing, getBillingDashboard, type BillingDashboard, type ValuePricingEstimate, type ValuePlan } from "@/lib/billing";
import { fetchMultiCloudDashboard, type ControlPlaneStatus } from "@/lib/cloud";

type CloudSpend = { cloud: "AWS" | "GCP" | "Azure"; cost: number; deltaPct: number };
type Recommendation = { id: string; title: string; action: string; projectedMonthlySavings: number };

const INITIAL_SPEND: CloudSpend[] = [
  { cloud: "AWS", cost: 2840, deltaPct: 8 },
  { cloud: "GCP", cost: 1940, deltaPct: -3 },
  { cloud: "Azure", cost: 1260, deltaPct: 4 },
];

const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  { id: "r1", title: "Rightsize worker pools during off-peak", action: "Scale from 8 to 4 replicas overnight", projectedMonthlySavings: 360 },
  { id: "r2", title: "Optimize workload placement by latency/cost", action: "Shift 15% stateless load to lower-cost region", projectedMonthlySavings: 240 },
  { id: "r3", title: "Enable aggressive idle resource cleanup", action: "Terminate idle analytics nodes after 15 minutes", projectedMonthlySavings: 190 },
];

const CostIntelligenceView: React.FC = () => {
  const [cloudSpend, setCloudSpend] = useState<CloudSpend[]>(INITIAL_SPEND);
  const [controlPlanes, setControlPlanes] = useState<ControlPlaneStatus[] | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(INITIAL_RECOMMENDATIONS);
  const [savedByAi, setSavedByAi] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<ValuePlan>("growth");
  const [valuePricing, setValuePricing] = useState<ValuePricingEstimate | null>(null);
  const [billingDashboard, setBillingDashboard] = useState<BillingDashboard | null>(null);

  const costToday = useMemo(() => Math.round(cloudSpend.reduce((sum, item) => sum + item.cost, 0) / 30), [cloudSpend]);
  const monthlyForecast = useMemo(() => Math.round(cloudSpend.reduce((sum, item) => sum + item.cost, 0) * 1.08), [cloudSpend]);
  const totalCloudSpend = useMemo(() => Math.round(cloudSpend.reduce((sum, item) => sum + item.cost, 0)), [cloudSpend]);
  const savingsTracking = useMemo(
    () => ({
      thisWeek: Math.round(savedByAi * 0.22),
      thisMonth: savedByAi,
      annualized: savedByAi * 12,
    }),
    [savedByAi]
  );

  useEffect(() => {
    const run = async () => {
      try {
        const out = await estimateValuePricing({
          cloudSpendUsd: totalCloudSpend,
          savingsUsd: savedByAi,
          plan: selectedPlan,
        });
        setValuePricing(out);
      } catch {
        const fallbackPct = selectedPlan === "enterprise" ? 0.15 : selectedPlan === "growth" ? 0.2 : 0.25;
        const fallbackBase = selectedPlan === "enterprise" ? 799 : selectedPlan === "growth" ? 199 : 49;
        const platformFeeUsd = Number((savedByAi * fallbackPct + fallbackBase).toFixed(2));
        setValuePricing({
          plan: selectedPlan,
          cloudSpendUsd: totalCloudSpend,
          savingsUsd: savedByAi,
          savingsRatePct: totalCloudSpend > 0 ? Number(((savedByAi / totalCloudSpend) * 100).toFixed(2)) : 0,
          feePercentage: fallbackPct,
          baseFeeUsd: fallbackBase,
          platformFeeUsd,
          netSavingsUsd: Number((savedByAi - platformFeeUsd).toFixed(2)),
          valueMessage: "Only pay when you save",
        });
      }
    };
    void run();
  }, [savedByAi, selectedPlan, totalCloudSpend]);

  useEffect(() => {
    void getBillingDashboard()
      .then((d) => {
        setBillingDashboard(d);
        setSavedByAi(Math.max(0, Math.round(d.aiSavingsUsd ?? 0)));
      })
      .catch(() => {
        // ignore billing preload failures
      });
  }, []);

  useEffect(() => {
    void fetchMultiCloudDashboard()
      .then((dash) => {
        setControlPlanes(dash.controlPlanes);
        const rows: CloudSpend[] = dash.metrics.map((m) => ({
          cloud: m.provider === "aws" ? "AWS" : m.provider === "gcp" ? "GCP" : "Azure",
          cost: Math.round(m.cost * 24),
          deltaPct: m.cpu > 60 ? 5 : m.cpu < 45 ? -2 : 1,
        }));
        if (rows.length === 3) setCloudSpend(rows);
      })
      .catch(() => {
        setControlPlanes(null);
      });
  }, []);

  return (
    <div className="space-y-6 pb-10 w-full min-w-0">
      <ModuleHeader
        title="Cost Intelligence"
        subtitle="Multi-cloud AI control — unified routing to AWS, GCP, Azure, and Kubernetes (see live stream for provider-scoped actions)."
      />
      <div className="w-full min-w-0 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 md:px-5 md:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/85 mb-2">Recent AI outcomes</p>
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 text-[13px] text-emerald-100/95 leading-snug">
          <li className="flex items-start gap-2 min-w-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            <span>AI stabilized system automatically</span>
          </li>
          <li className="flex items-start gap-2 min-w-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            <span>AI reduced latency</span>
          </li>
          <li className="flex items-start gap-2 min-w-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            <span>AI optimized cost</span>
          </li>
        </ul>
      </div>

      {controlPlanes && controlPlanes.length > 0 ? (
        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
          <p className="text-[10px] uppercase tracking-widest text-cyan-200/90 mb-3 flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Control plane connections
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {controlPlanes.map((cp) => (
              <div
                key={cp.id}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  cp.connected ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100" : "border-white/15 bg-white/[0.04] text-white/70"
                }`}
              >
                <p className="font-semibold text-white flex items-center justify-between gap-2">
                  <span>{cp.label}</span>
                  <span className="text-[10px] uppercase">{cp.connected ? "live" : "offline"}</span>
                </p>
                <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{cp.authMode}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Cost Today</p>
          <p className="mt-2 text-2xl font-black text-white">${costToday.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-emerald-200">Savings by AI</p>
          <p className="mt-2 text-2xl font-black text-emerald-100">${savedByAi.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-indigo-200">Monthly Forecast</p>
          <p className="mt-2 text-2xl font-black text-indigo-100">${monthlyForecast.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-widest text-blue-100">Only pay when you save</p>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as ValuePlan)}
            className="h-9 rounded-lg border border-white/20 bg-[#0B1220] px-3 text-xs text-white"
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] uppercase text-white/45">AI Saved Amount</p>
            <p className="mt-1 text-xl font-black text-emerald-200">${savedByAi.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] uppercase text-white/45">Platform Fee</p>
            <p className="mt-1 text-xl font-black text-amber-200">${Math.round(valuePricing?.platformFeeUsd ?? 0).toLocaleString()}</p>
            <p className="text-[11px] text-white/60 mt-1">
              fee = savings * {Math.round((valuePricing?.feePercentage ?? 0) * 100)}% + ${valuePricing?.baseFeeUsd ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] uppercase text-white/45">Net Savings</p>
            <p className="mt-1 text-xl font-black text-cyan-200">${Math.round(valuePricing?.netSavingsUsd ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Cost Breakdown by Cloud</p>
          <div className="space-y-2">
            {cloudSpend.map((row) => (
              <div key={row.cloud} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-semibold">{row.cloud}</p>
                  <p className="text-xs text-white/60">Current month spend</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-white">${Math.round(row.cost).toLocaleString()}</p>
                  <p className={`text-xs inline-flex items-center gap-1 ${row.deltaPct <= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                    {row.deltaPct <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(row.deltaPct)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Savings Tracking</p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
              <span className="text-white/70 inline-flex items-center gap-2"><Wallet className="w-4 h-4 text-cyan-300" />This Week</span>
              <span className="text-cyan-200 font-semibold">${savingsTracking.thisWeek.toLocaleString()}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
              <span className="text-white/70 inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-300" />This Month</span>
              <span className="text-emerald-200 font-semibold">${savingsTracking.thisMonth.toLocaleString()}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
              <span className="text-white/70 inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-300" />Annualized</span>
              <span className="text-indigo-200 font-semibold">${savingsTracking.annualized.toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">AI Recommendations</p>
        <div className="space-y-2">
          {recommendations.length === 0 ? (
            <p className="text-sm text-emerald-300">All recommendations applied. AI will continue monitoring and optimizing automatically.</p>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-white font-semibold">{rec.title}</p>
                <p className="text-xs text-white/65 mt-1">Action: {rec.action}</p>
                <p className="text-xs text-emerald-300 mt-1">Projected monthly savings: ${rec.projectedMonthlySavings}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">AI Explainability · Savings Engine</p>
        <div className="space-y-2">
          {(billingDashboard?.savingsEntries ?? []).slice(0, 3).map((entry) => (
            <div key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-white/70">
                Before: ${Math.round(entry.beforeCostUsd).toLocaleString()} | After: ${Math.round(entry.afterCostUsd).toLocaleString()}
              </p>
              <p className="text-xs text-emerald-300 mt-1">
                Savings: ${Math.round(entry.savingsUsd).toLocaleString()} | Fee: ${Math.round(entry.platformFeeUsd).toLocaleString()} | Net: $
                {Math.round(entry.netSavingsUsd).toLocaleString()}
              </p>
              <p className="text-xs text-white/65 mt-1">{entry.explanation}</p>
              <p className="text-[11px] mt-1 text-white/55">
                {entry.charged ? "Charge applied based on measured savings." : "No savings or negative impact detected. No charge applied."}
              </p>
            </div>
          ))}
          {(billingDashboard?.savingsEntries ?? []).length === 0 ? <p className="text-sm text-white/50">No explainability entries yet. AI will append autonomous optimization traces here.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default CostIntelligenceView;
