import { Activity, Cpu, GitBranch, PlayCircle } from "lucide-react";

export default function ProductVisual() {
  return (
    <section id="product-visual" className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-300">Product Visual</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            One control plane for workflow intelligence and execution
          </h2>
        </div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111827] to-[#0F172A] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.45)] sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Workflow Graph</h3>
                <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Active
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Ingest", "Transform", "Deploy"].map((node) => (
                  <div key={node} className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-3 text-center text-sm text-blue-100">
                    {node}
                  </div>
                ))}
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300">DAG Validation</span>
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300">Retry Policies</span>
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300">Drift Detection</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-5">
              <h3 className="text-sm font-semibold text-slate-200">Run Insights</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <PlayCircle className="h-4 w-4 text-blue-300" /> Current Run
                  </div>
                  <span className="text-xs text-emerald-300">Healthy</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Cpu className="h-4 w-4 text-indigo-300" /> AI Recommendation
                  </div>
                  <span className="text-xs text-slate-300">Scale worker pool +1</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Activity className="h-4 w-4 text-cyan-300" /> Cost Trend
                  </div>
                  <span className="text-xs text-cyan-300">-18% this week</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <GitBranch className="h-4 w-4 text-violet-300" /> Rollout
                  </div>
                  <span className="text-xs text-slate-300">Multi-cloud synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
