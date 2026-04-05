const steps = [
  { title: "Define workflow", detail: "Describe your pipeline with natural language or visual DAG blocks." },
  { title: "Deploy", detail: "Launch with policy guardrails, environment scopes, and audit controls." },
  { title: "Run", detail: "Execute orchestrated jobs across cloud providers with deterministic reliability." },
  { title: "AI optimizes automatically", detail: "AstraOps tunes cost, performance, and healing actions continuously." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-300">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From workflow design to autonomous optimization
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {idx + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
