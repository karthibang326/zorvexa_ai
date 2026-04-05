import React, { useEffect, useState } from "react";
import { Brain, DollarSign, Layers, ShieldAlert, TrendingUp } from "lucide-react";
import { fetchAiLearningDashboard, type LearningDashboard } from "@/lib/ai-learning";
import { ApiClientError } from "@/lib/api";

const AiLearningPanel: React.FC = () => {
  const [dash, setDash] = useState<LearningDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAiLearningDashboard()
      .then((d) => {
        setDash(d);
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Could not load metrics.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading || (!dash && !err)) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/45">
        Loading self-learning metrics…
      </div>
    );
  }

  if (err || !dash) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55 space-y-1">
        <p className="text-white/70">Self-learning metrics</p>
        <p className="text-white/45">{err ?? "Unavailable"}</p>
      </div>
    );
  }

  const phase =
    dash.totalSamples > 40 ? "Adaptive" : dash.totalSamples > 8 ? "Learning" : dash.totalSamples > 0 ? "Warm-up" : "Collecting";

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-violet-200/95">
        <Brain className="w-4 h-4" />
        <p className="text-xs font-semibold tracking-tight">Self-learning AI</p>
        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-500/15">{phase}</span>
      </div>
      {dash.lowSuccessApprovalRecommended ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-start gap-2 text-[11px] text-amber-100/95">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
          <p>
            <span className="font-semibold">Safety:</span> rolling success rate is below the configured minimum — autonomous
            apply may require approval until performance recovers (see <code className="text-[10px]">AI_LEARNING_*</code> env).
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
          <p className="text-[9px] text-white/45 uppercase">Accuracy</p>
          <p className="text-lg font-bold text-emerald-200 tabular-nums">
            {dash.aiAccuracyPct != null ? `${dash.aiAccuracyPct.toFixed(1)}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
          <p className="text-[9px] text-white/45 uppercase">Success rate</p>
          <p className="text-lg font-bold text-cyan-200 tabular-nums">
            {dash.successRatePct != null ? `${dash.successRatePct}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
          <p className="text-[9px] text-white/45 uppercase">Samples</p>
          <p className="text-lg font-bold text-white tabular-nums">{dash.totalSamples}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
          <p className="text-[9px] text-white/45 uppercase flex items-center justify-center gap-1">
            <Layers className="w-3 h-3" /> Actions
          </p>
          <p className="text-lg font-bold text-violet-200 tabular-nums">{dash.learnedActionsCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 flex flex-col items-center justify-center gap-0.5">
          <p className="text-[9px] text-white/45 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Latency
          </p>
          <p className="text-sm font-semibold text-amber-200 capitalize">{dash.latencyTrend}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 flex flex-col items-center justify-center gap-0.5">
          <p className="text-[9px] text-white/45 uppercase flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Cost signal
          </p>
          <p className="text-sm font-semibold text-sky-200 capitalize">{dash.costTrend}</p>
        </div>
      </div>
      {Object.keys(dash.byAction).length > 0 ? (
        <div className="text-[10px] text-white/55 space-y-1">
          <p className="text-white/45 uppercase tracking-wide">By action</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dash.byAction).map(([action, v]) => (
              <span key={action} className="rounded-md border border-white/10 px-2 py-1 bg-black/30">
                {action}: {v.successRatePct}% ({v.samples} runs)
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {Object.keys(dash.byService).length > 0 ? (
        <div className="text-[10px] text-white/55 space-y-1">
          <p className="text-white/45 uppercase tracking-wide">By service / workload</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dash.byService).map(([svc, v]) => (
              <span key={svc} className="rounded-md border border-white/10 px-2 py-1 bg-black/30">
                {svc}: {v.successRatePct}% ({v.samples})
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {dash.recentLearned.length > 0 ? (
        <div className="text-[10px] text-white/50 space-y-1 max-h-[100px] overflow-y-auto">
          <p className="text-white/45 uppercase tracking-wide">Recent outcomes</p>
          {dash.recentLearned.slice(0, 5).map((r) => (
            <div key={r.id} className="flex justify-between gap-2 border-b border-white/5 pb-1">
              <span className="text-white/70 truncate">
                {r.resource} · {r.action}
              </span>
              <span className={r.improved ? "text-emerald-300" : "text-amber-300/90"}>{r.improved ? "improved" : r.outcome}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AiLearningPanel;
