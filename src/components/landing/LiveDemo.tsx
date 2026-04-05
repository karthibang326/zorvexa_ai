import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, Calendar, Cpu, Radio, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EVENTS = [
  { icon: Activity, tone: "text-cyan-200", bg: "bg-cyan-500/10 border-cyan-400/20", line: "Scaled api-gateway +2 — p95 latency −18%" },
  { icon: Cpu, tone: "text-violet-200", bg: "bg-violet-500/10 border-violet-400/20", line: "Rightsizing applied — monthly cost −$4.2k est." },
  { icon: Zap, tone: "text-amber-200", bg: "bg-amber-500/10 border-amber-400/20", line: "Incident #4281 contained — auto-rollback + canary hold" },
  { icon: Radio, tone: "text-emerald-200", bg: "bg-emerald-500/10 border-emerald-400/20", line: "Policy check passed — governance snapshot archived" },
];

const BOOK_ENGINEER =
  "mailto:sales@zorvexa.com?subject=Book%20Demo%20with%20Engineer%20%E2%80%94%20Zorvexa";

export type LiveDemoProps = {
  /** On /live-demo the page hero already has a title — skip the duplicate h2 block */
  omitIntro?: boolean;
  /** On /live-demo the hero already has CTAs — skip the duplicate bottom banner */
  hideClosingCta?: boolean;
};

export default function LiveDemo({ omitIntro = false, hideClosingCta = false }: LiveDemoProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => window.clearInterval(id);
  }, []);

  const active = EVENTS[tick % EVENTS.length];
  const ActiveIcon = active.icon;

  return (
    <section id="live-demo" className={omitIntro ? "pb-20 sm:pb-28 pt-2 sm:pt-4" : "py-20 sm:py-28"}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {!omitIntro && (
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Simulated AI actions — real-time feel
            </h2>
            <p className="mt-4 text-sm text-slate-400 sm:text-base">
              Watch how the control plane reacts to telemetry. Illustrative metrics; real workflow.
            </p>
          </div>
        )}

        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#0f1419] via-[#0c1018] to-[#080a0e] p-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
            omitIntro ? "mt-0" : "mt-12"
          )}
        >
          <div className="rounded-[22px] border border-white/[0.06] bg-[#0b0f14]/90 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-sm font-medium text-slate-200">Autonomous loop</span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Simulation
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Latest action</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tick}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.35 }}
                    className={cn("mt-3 flex items-start gap-3 rounded-xl border px-4 py-3", active.bg)}
                  >
                    <ActiveIcon className={cn("mt-0.5 h-5 w-5 shrink-0", active.tone)} />
                    <p className={cn("text-sm leading-relaxed", active.tone)}>{active.line}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 space-y-2">
                  {EVENTS.map((e, i) => {
                    const RowIcon = e.icon;
                    return (
                    <div
                      key={e.line}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                        i === tick % EVENTS.length ? "bg-white/[0.06] text-slate-200" : "text-slate-500"
                      )}
                    >
                      <RowIcon className="h-3.5 w-3.5 opacity-70" />
                      <span className="truncate">{e.line}</span>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signals</p>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["CPU", "72%", "w-[72%]"],
                    ["Memory", "61%", "w-[61%]"],
                    ["p95 latency", "186ms", "w-[58%]"],
                    ["Cost index", "−12% vs baseline", "w-[48%]"],
                  ].map(([k, v, bar]) => (
                    <div key={String(k)}>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{k}</span>
                        <span className="text-slate-300">{v}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={cn("h-full origin-left rounded-full bg-gradient-to-r from-cyan-500/80 to-indigo-500/80", bar)}
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {!hideClosingCta && (
          <div
            id="live-demo-cta"
            className="mt-14 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-blue-500/[0.08] via-transparent to-indigo-500/[0.06] px-6 py-10 text-center sm:px-10"
          >
            <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Experience Zorvexa in action
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
              Open the product demo or book time with an engineer — your stack, your questions.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 min-w-[220px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-base font-medium text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] hover:brightness-110"
              >
                <Link to="/dashboard?demo=1" className="inline-flex items-center justify-center gap-2">
                  Try Demo (No Setup)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 min-w-[220px] rounded-xl border-white/[0.14] bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              >
                <a href={BOOK_ENGINEER} className="inline-flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Book Demo with Engineer
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
