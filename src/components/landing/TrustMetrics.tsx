import { motion } from "framer-motion";

const stats = [
  {
    value: "Up to 30%",
    label: "cost reduction",
    detail: "From continuous rightsizing, scheduling, and waste removal",
  },
  {
    value: "90%",
    label: "fewer manual interventions",
    detail: "Tier-1 changes handled without human-in-the-loop",
  },
  {
    value: "Pre-page",
    label: "incidents resolved",
    detail: "Containment and remediation before on-call gets paged",
  },
];

/** Value / impact — replaces generic “trust numbers” with outcome language */
export default function TrustMetrics() {
  return (
    <section id="value-impact" className="py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.07] via-white/[0.03] to-transparent px-6 py-12 sm:px-10 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">Impact</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              Replace reactive operations with autonomous execution
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{s.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
