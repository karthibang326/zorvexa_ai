import { motion } from "framer-motion";
import { Brain, CloudCog, Zap } from "lucide-react";

const steps = [
  {
    icon: CloudCog,
    title: "Connect your cloud",
    sub: "AWS / GCP / Azure",
    detail: "Secure read-first integrations. No rip-and-replace.",
  },
  {
    icon: Brain,
    title: "AI observes & learns",
    sub: "Metrics, logs, patterns",
    detail: "Baselines behavior, cost drivers, and failure modes across fleets.",
  },
  {
    icon: Zap,
    title: "AI acts autonomously",
    sub: "Scaling, healing, optimization",
    detail: "Closed-loop execution with guardrails, approvals, and audit trails.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px max-w-5xl -translate-y-1/2 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">From connection to autonomous execution</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            Three steps. One control plane. Outcomes you can measure.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((step, idx) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-6 backdrop-blur-sm transition-all hover:border-indigo-500/25 hover:shadow-[0_20px_60px_rgba(79,70,229,0.12)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-blue-600/20 text-indigo-100 ring-1 ring-white/10">
                <step.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Step {idx + 1}</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-xs font-medium text-indigo-300/90">{step.sub}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.detail}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
