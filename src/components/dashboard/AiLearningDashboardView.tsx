import React, { useCallback, useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleHeader from "./ModuleHeader";
import AiLearningPanel from "./AiLearningPanel";
import { fetchAiLearningDashboard, fetchAiLearningRecent, type AiLearningRecord, type LearningDashboard } from "@/lib/ai-learning";
import { ApiClientError } from "@/lib/api";
import { useTenantWorkspaceLinked } from "@/hooks/useTenantWorkspaceLinked";

const AiLearningDashboardView: React.FC = () => {
  const tenantWorkspaceLinked = useTenantWorkspaceLinked();
  const [dash, setDash] = useState<LearningDashboard | null>(null);
  const [items, setItems] = useState<AiLearningRecord[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [d, rec] = await Promise.all([fetchAiLearningDashboard(), fetchAiLearningRecent(50)]);
      setDash(d);
      setItems(rec);
    } catch (e) {
      setDash(null);
      setItems([]);
      setLoadError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Could not load AI learning data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-10">
      <ModuleHeader
        title="Self-learning AI"
        subtitle={
          tenantWorkspaceLinked === false
            ? "Global / simulation data until a workspace is linked (Launch Mode). Outcomes still persist from the demo pipeline and API; they are not scoped to a tenant org yet."
            : "Outcomes are stored after each detect → decide → act → verify cycle. Confidence adapts from historical success; low-performing actions can require approval."
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="border-white/15 text-white/80"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <AiLearningPanel />

      {loadError ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          <p className="font-medium text-amber-50">AI learning data could not be loaded</p>
          <p className="mt-1 text-[13px] text-amber-100/85 leading-relaxed">{loadError}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="flex items-center gap-2 text-white/85 mb-3">
          <Brain className="w-4 h-4 text-violet-300" />
          <p className="text-xs font-semibold tracking-tight">Learned episodes (detection · decision · execution JSON)</p>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-white/45 py-6 text-center">
            {loading ? "Loading…" : "No rows yet. Enable the AI stream loop and database persistence to populate learning data."}
          </p>
        ) : (
          <div className="space-y-2 max-h-[min(70vh,720px)] overflow-y-auto pr-1 custom-scrollbar">
            {items.map((row) => {
              const open = openId === row.id;
              return (
                <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    {open ? <ChevronDown className="w-4 h-4 text-white/45 shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/45 shrink-0" />}
                    <span className="text-[11px] font-mono text-white/40 shrink-0">{new Date(row.createdAt).toLocaleString()}</span>
                    <span className="text-sm text-white/90 truncate">{row.resource}</span>
                    <span className="text-xs text-cyan-300/90 font-mono shrink-0">{row.action}</span>
                    <span
                      className={`text-[10px] uppercase ml-auto shrink-0 px-2 py-0.5 rounded border ${
                        row.outcomeImproved ? "border-emerald-500/35 text-emerald-300" : "border-amber-500/30 text-amber-200"
                      }`}
                    >
                      {row.outcomeImproved ? "improved" : row.outcome}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-white/10 px-3 py-3 space-y-3 text-[11px] font-mono bg-black/25">
                      <JsonBlock title="detection" data={row.detection} />
                      <JsonBlock title="decision" data={row.decision} />
                      <JsonBlock title="execution" data={row.execution} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {dash && dash.totalSamples > 0 ? (
        <p className="text-[11px] text-white/40 text-center">
          {dash.totalSamples} samples · success {dash.successRatePct ?? "—"}% · accuracy {dash.aiAccuracyPct ?? "—"} · latency{" "}
          {dash.latencyTrend} · cost {dash.costTrend}
          {dash.lowSuccessApprovalRecommended ? " · approval guard active" : ""}
        </p>
      ) : null}
    </div>
  );
};

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  const text = JSON.stringify(data ?? null, null, 2);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-violet-300/80 mb-1">{title}</p>
      <pre className="whitespace-pre-wrap break-all text-white/70 max-h-48 overflow-y-auto rounded-lg border border-white/10 p-2 bg-black/40">{text}</pre>
    </div>
  );
}

export default AiLearningDashboardView;
