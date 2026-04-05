import { motion } from "framer-motion";
import {
  Activity,
  Cpu,
  Gauge,
  LayoutDashboard,
  LineChart,
  Sparkles,
  Wallet,
} from "lucide-react";

/** Large dashboard-style preview — control plane + AI stream + cost (illustrative). */
export default function ProductPreview() {
  return (
    <section className="relative pb-20 pt-4 sm:pb-28 sm:pt-6" aria-label="Product preview">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#0f141c] via-[#0a0d12] to-[#080a0e] p-1 shadow-[0_32px_120px_rgba(0,0,0,0.55),0_0_0_1px_rgba(99,102,241,0.08)]"
        >
          <div className="rounded-[22px] border border-white/[0.06] bg-[#07090d]/95 backdrop-blur-sm">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
              </div>
              <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-500">
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-600" />
                <span className="truncate font-mono text-slate-500">control.zorvexa.ai / prod-use1</span>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[200px_1fr_260px]">
              {/* Mini sidebar */}
              <div className="hidden border-r border-white/[0.06] bg-white/[0.02] p-4 lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Control plane</p>
                <ul className="mt-4 space-y-1 text-[13px]">
                  {["Overview", "AI loop", "Cost", "Governance"].map((item, i) => (
                    <li
                      key={item}
                      className={`rounded-lg px-2 py-2 ${
                        i === 1 ? "bg-blue-500/15 text-blue-100" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI activity stream */}
              <div className="min-h-[280px] border-b border-white/[0.06] p-5 sm:p-6 lg:border-b-0 lg:min-h-[320px]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI activity stream</p>
                  <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Autonomous
                  </span>
                </div>
                <ul className="mt-5 space-y-2">
                  {[
                    { t: "Decision", d: "Scale checkout-api +2 — confidence 94%", c: "text-cyan-200/80" },
                    { t: "Signal", d: "p95 latency trending down — 412ms → 286ms", c: "text-violet-200/80" },
                    { t: "Action", d: "Cost guardrail: spot shift approved (Δ −$1.1k/mo)", c: "text-amber-200/80" },
                  ].map((row) => (
                    <li
                      key={row.d}
                      className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm"
                    >
                      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.t}</p>
                        <p className={`mt-0.5 leading-snug ${row.c}`}>{row.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cost panel */}
              <div className="border-t border-white/[0.06] bg-gradient-to-b from-indigo-500/[0.06] to-transparent p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400/90" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cost optimization</p>
                </div>
                <div className="mt-4 flex h-24 items-end gap-1">
                  {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-blue-600/40 to-indigo-400/60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <LineChart className="h-3.5 w-3.5" />
                    vs. last month
                  </span>
                  <span className="font-medium text-emerald-400">−18% spend</span>
                </div>
                <div className="mt-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> Rightsizing
                    </span>
                    <span className="text-slate-300">−$4.2k/mo</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Idle cleanup
                    </span>
                    <span className="text-slate-300">−$1.8k/mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-sm font-medium text-slate-500">
          Real-time autonomous decision engine
        </p>
      </div>
    </section>
  );
}
