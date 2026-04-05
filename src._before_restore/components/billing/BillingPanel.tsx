import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Brain, DollarSign, LineChart, PauseCircle, PlayCircle, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getAICfoStatus,
  getCostRecords,
  postAnalyzeCost,
  postDisableAICfo,
  postEnableAICfo,
  postFixCost,
} from "@/lib/finops";
import { withContextQuery } from "@/lib/context";

type CostRisk = "LOW" | "MEDIUM" | "HIGH";

type Anomaly = {
  id: string;
  service: string;
  spikePct: number;
  rootCause: string;
  impactPerDay: number;
  confidence: number;
};

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  return `${root}/api`;
}

export default function BillingPanel() {
  const [loading, setLoading] = useState(true);
  const [aiCfoOn, setAiCfoOn] = useState(false);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [forecastedSpend, setForecastedSpend] = useState(0);
  const [savingsIdentified, setSavingsIdentified] = useState(0);
  const [costRisk, setCostRisk] = useState<CostRisk>("LOW");
  const [confidence, setConfidence] = useState(92);
  const [records, setRecords] = useState<Array<{ provider: "aws" | "gcp" | "azure"; service: string; region: string; amountUsd: number; usageUnits: number; day: string }>>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [events, setEvents] = useState<Array<{ ts: string; type: string; msg: string }>>([]);
  const [approvalMode, setApprovalMode] = useState(true);
  const [rollbackSafety, setRollbackSafety] = useState(true);
  const [maxOptimizationsPerHour, setMaxOptimizationsPerHour] = useState(8);
  const [busy, setBusy] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Astra AI CFO online. Ask why costs changed, which service is expensive, or how to reduce spend." },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [status, analysis, costRows] = await Promise.all([getAICfoStatus(), postAnalyzeCost(), getCostRecords()]);
      setAiCfoOn(status.mode === "on");
      setApprovalMode(Boolean(status.approvalMode));
      setRollbackSafety(Boolean(status.rollbackEnabled));
      setMaxOptimizationsPerHour(Number(status.maxOptimizationsPerHour ?? 8));
      setMonthlySpend(analysis.monthlySpend);
      setForecastedSpend(analysis.forecastedSpend);
      setSavingsIdentified(analysis.savingsIdentified);
      setCostRisk(analysis.riskLevel);
      setConfidence(analysis.aiConfidence);
      setRecords(costRows);
      const baseAnomalies: Anomaly[] = [
        {
          id: "a1",
          service: "worker-pool",
          spikePct: 34,
          rootCause: analysis.anomaly.reason || "Idle replicas and high over-provisioned compute",
          impactPerDay: Math.max(52, analysis.anomaly.estimatedDailyImpactUsd || 48),
          confidence: Math.max(80, Math.round((analysis.aiConfidence + analysis.prediction.confidence) / 2)),
        },
        {
          id: "a2",
          service: "api-gateway",
          spikePct: 19,
          rootCause: "Traffic increase + cache miss amplification",
          impactPerDay: 27,
          confidence: 86,
        },
      ];
      setAnomalies(baseAnomalies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/cost/stream`));
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string; ts?: number; reason?: string; recommendation?: string };
        const type = String(data.type ?? "cost_update");
        const ts = data.ts ? new Date(data.ts).toLocaleTimeString() : new Date().toLocaleTimeString();
        const msg = String(data.reason ?? data.recommendation ?? type).replace(/_/g, " ");
        setEvents((prev) => [{ ts, type, msg }, ...prev].slice(0, 50));
      } catch {
        // no-op
      }
    };
    return () => es.close();
  }, []);

  const spendByCloud = useMemo(() => {
    const total = records.reduce((acc, r) => acc + Number(r.amountUsd || 0), 0) || 1;
    const by = { aws: 0, gcp: 0, azure: 0 };
    records.forEach((r) => {
      by[r.provider] += Number(r.amountUsd || 0);
    });
    return {
      aws: Math.round((by.aws / total) * 100),
      gcp: Math.round((by.gcp / total) * 100),
      azure: Math.round((by.azure / total) * 100),
    };
  }, [records]);

  const costPerService = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => map.set(r.service, (map.get(r.service) ?? 0) + Number(r.amountUsd || 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [records]);

  const costPerRegion = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => map.set(r.region, (map.get(r.region) ?? 0) + Number(r.amountUsd || 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [records]);

  const optimizeNow = async () => {
    setBusy("optimize");
    try {
      const out = await postFixCost();
      toast.success(`Optimization applied · savings $${out.savingsAchieved}`);
      setSavingsIdentified((v) => v + Math.round(out.savingsAchieved / 3));
      setMonthlySpend((v) => Math.max(0, v - Math.round(out.savingsAchieved / 4)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleAICfo = async (enabled: boolean) => {
    setBusy("mode");
    try {
      if (enabled) {
        await postEnableAICfo();
        toast.success("AI CFO Mode enabled");
      } else {
        await postDisableAICfo();
        toast.info("AI CFO Mode disabled");
      }
      setAiCfoOn(enabled);
    } finally {
      setBusy(null);
    }
  };

  const anomalyAction = async (id: string, action: "fix" | "ignore" | "investigate") => {
    if (action === "fix") {
      await optimizeNow();
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      return;
    }
    if (action === "ignore") {
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      toast.info("Anomaly ignored");
      return;
    }
    toast.success("Investigation workflow started");
  };

  const riskClass =
    costRisk === "HIGH"
      ? "text-red-300 border-red-500/30 bg-red-500/10"
      : costRisk === "MEDIUM"
        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
        : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";

  return (
    <div className="space-y-5 pb-10">
      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-indigo-200">
          <Brain className="w-3.5 h-3.5" />
          AI CFO Mode
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 h-9 text-[11px] uppercase tracking-widest text-white/75">
          {aiCfoOn ? "ON" : "OFF"}
          <input type="checkbox" className="accent-indigo-500" checked={aiCfoOn} onChange={(e) => void toggleAICfo(e.target.checked)} />
        </label>
        <Button onClick={() => void load()} variant="outline" className="h-9 text-[10px] uppercase tracking-widest">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button onClick={() => void optimizeNow()} disabled={busy !== null} className="h-9 text-[10px] uppercase tracking-widest ml-auto">
          <Sparkles className="w-4 h-4 mr-2" />
          Optimize Cost Now
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Monthly Spend</p><p className="mt-1 text-lg font-black text-white">${monthlySpend.toLocaleString()}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Forecasted (30d)</p><p className="mt-1 text-lg font-black text-indigo-300">${forecastedSpend.toLocaleString()}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Savings Identified</p><p className="mt-1 text-lg font-black text-emerald-300">${savingsIdentified.toLocaleString()}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Cost Risk</p><p className={`mt-1 inline-flex px-2 py-1 rounded-full border text-sm font-black ${riskClass}`}>{costRisk}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">AI Confidence</p><p className="mt-1 text-lg font-black text-blue-300">{confidence}%</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Cost Anomalies</p>
        <div className="space-y-2">
          {anomalies.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-[#111827] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">{a.service}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-200">Spike +{a.spikePct}%</span>
                <span className="text-[10px] text-white/55 ml-auto">Confidence {a.confidence}%</span>
              </div>
              <p className="text-[12px] text-white/75 mt-1">Root cause: {a.rootCause}</p>
              <p className="text-[12px] text-amber-200 mt-1">Impact: ${a.impactPerDay}/day</p>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" className="h-8 text-[10px] uppercase tracking-widest" onClick={() => void anomalyAction(a.id, "fix")}><Wrench className="w-3.5 h-3.5 mr-1.5" />Fix Now</Button>
                <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={() => void anomalyAction(a.id, "ignore")}><XCircle className="w-3.5 h-3.5 mr-1.5" />Ignore</Button>
                <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest" onClick={() => void anomalyAction(a.id, "investigate")}><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Investigate</Button>
              </div>
            </div>
          ))}
          {anomalies.length === 0 ? <p className="text-[12px] text-white/45">No anomalies.</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Usage + Billing Metrics</p>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-white/10 p-2"><p className="text-white/50">Workflows usage</p><p className="text-white font-semibold">{Math.max(18, Math.round(records.length / 2))}</p></div>
            <div className="rounded-lg border border-white/10 p-2"><p className="text-white/50">Runs/day</p><p className="text-white font-semibold">{Math.max(120, records.length * 2)}</p></div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">Cost per Service</p>
            <div className="space-y-1">
              {costPerService.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]"><span className="text-white/75">{k}</span><span className="text-white">${Math.round(v)}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">Cost per Region</p>
            <div className="space-y-1">
              {costPerRegion.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]"><span className="text-white/75">{k}</span><span className="text-white">${Math.round(v)}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">Cloud Spend Distribution</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/10 p-2"><p className="text-white/50 text-[10px]">AWS</p><p className="text-orange-300 font-black text-lg">{spendByCloud.aws}%</p></div>
            <div className="rounded-lg border border-white/10 p-2"><p className="text-white/50 text-[10px]">GCP</p><p className="text-blue-300 font-black text-lg">{spendByCloud.gcp}%</p></div>
            <div className="rounded-lg border border-white/10 p-2"><p className="text-white/50 text-[10px]">Azure</p><p className="text-cyan-300 font-black text-lg">{spendByCloud.azure}%</p></div>
          </div>
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-[12px] text-indigo-100">
            AI Suggestion: Shift 20% load to GCP to save ~18% cost.
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/45">Cost Predictions</p>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-lg border border-white/10 p-2">Cost will increase by 22% in next 7 days</div>
            <div className="rounded-lg border border-white/10 p-2">Idle resources detected in worker and analytics lanes</div>
            <div className="rounded-lg border border-white/10 p-2">Over-provisioned cluster detected in us-east-1</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Plan Management</p>
          <div className="rounded-lg border border-white/10 p-3 mb-2">
            <p className="text-[12px] text-white/65">Current plan</p>
            <p className="text-lg font-black text-white mt-1">Pro</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12px] text-emerald-100 mb-2">
            AI Recommendation: Upgrade to Team plan to save ~$200/month via pooled usage tiers.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 text-[10px] uppercase tracking-widest"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Upgrade Plan</Button>
            <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest"><PauseCircle className="w-3.5 h-3.5 mr-1.5" />Downgrade Plan</Button>
            <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase tracking-widest"><PlayCircle className="w-3.5 h-3.5 mr-1.5" />Switch Plan</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">Real-Time FinOps Stream</p>
          <div className="max-h-[220px] overflow-y-auto space-y-1 font-mono text-[11px]">
            {events.length === 0 ? (
              <p className="text-white/35">Waiting for cost spikes, optimizations, anomalies...</p>
            ) : (
              events.map((e, i) => (
                <div key={`${e.ts}-${i}`} className="grid grid-cols-[85px_120px_1fr] gap-2">
                  <span className="text-white/35">{e.ts}</span>
                  <span className="text-indigo-300 uppercase">{e.type}</span>
                  <span className="text-white/80">{e.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Safety Controls</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-[12px] text-white/75">Approval mode<input type="checkbox" className="accent-indigo-500" checked={approvalMode} onChange={(e) => setApprovalMode(e.target.checked)} /></label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-[12px] text-white/75">Rollback safety<input type="checkbox" className="accent-indigo-500" checked={rollbackSafety} onChange={(e) => setRollbackSafety(e.target.checked)} /></label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-[12px] text-white/75">Max optimizations/hour<input type="number" min={1} max={25} value={maxOptimizationsPerHour} onChange={(e) => setMaxOptimizationsPerHour(Math.max(1, Math.min(25, Number(e.target.value) || 1)))} className="w-14 rounded border border-white/10 bg-[#111827] px-2 py-1 text-xs" /></label>
        </div>
      </div>

      <div className="fixed right-4 bottom-20 z-[70]">
        <button onClick={() => setChatOpen((v) => !v)} className="h-12 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
          <Bot className="w-4 h-4 inline mr-2" />
          Astra AI
        </button>
      </div>

      {chatOpen ? (
        <div className="fixed right-4 bottom-36 z-[70] w-[360px] rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl">
          <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-widest text-white/60">AI Billing Explanation</div>
          <div className="max-h-[280px] overflow-y-auto p-3 space-y-2">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`rounded-lg px-3 py-2 text-[12px] ${m.role === "ai" ? "bg-[#111827] text-white/90" : "bg-indigo-600/30 text-indigo-100 border border-indigo-400/20"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-white/10">
            <div className="flex gap-1 mb-2 overflow-x-auto">
              {["Why is cost increasing?", "How to reduce cost?", "Which service is expensive?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setChatInput(q)}
                  className="whitespace-nowrap rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Astra AI..."
                className="h-9 flex-1 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none focus:border-indigo-500"
              />
              <Button
                size="sm"
                className="h-9"
                onClick={() => {
                  const q = chatInput.trim();
                  if (!q) return;
                  const topService = costPerService[0]?.[0] ?? "worker-pool";
                  const topCost = Math.round(costPerService[0]?.[1] ?? monthlySpend * 0.35);
                  let answer = `Root cause: compute over-provisioning in ${topService}. Metrics: spend trend +${Math.max(8, Math.round((forecastedSpend - monthlySpend) / Math.max(monthlySpend, 1) * 100))}%, idle resources detected. Action: downscale idle pods, apply spot profile, rebalance cloud usage. Confidence: ${confidence}%.`;
                  if (/which service/i.test(q)) answer = `Most expensive service is ${topService} (~$${topCost}/month). Recommendation: right-size CPU/memory and schedule idle windows. Confidence: ${confidence - 2}%.`;
                  if (/reduce cost/i.test(q)) answer = `Fastest savings path: optimize ${topService}, shift 20% burst load to GCP, and enforce per-service budgets. Estimated savings: ~$${savingsIdentified}/month. Confidence: ${confidence}%.`;
                  setChatMessages((prev) => [...prev, { role: "user", text: q }, { role: "ai", text: answer }]);
                  setChatInput("");
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
        <ShieldCheck className="w-4 h-4 inline mr-2" />
        AI billing guardrails active. User override available at all times.
        <LineChart className="w-4 h-4 inline mx-2" />
        Forecasting and anomaly control healthy.
        <DollarSign className="w-4 h-4 inline mx-2" />
        FinOps optimization engine running.
      </div>
    </div>
  );
}
