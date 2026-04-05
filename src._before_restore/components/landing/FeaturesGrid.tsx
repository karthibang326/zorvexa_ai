import { Bot, ShieldCheck, Cloud, Coins, Workflow, Sparkles } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Copilot",
    description: "Analyze and optimize workflows",
  },
  {
    icon: ShieldCheck,
    title: "Self-Healing",
    description: "Automatically fix failures",
  },
  {
    icon: Cloud,
    title: "Multi-Cloud",
    description: "Run across AWS, GCP, Azure",
  },
  {
    icon: Coins,
    title: "FinOps",
    description: "Reduce cloud costs",
  },
  {
    icon: Workflow,
    title: "Execution Engine",
    description: "DAG-based orchestration",
  },
  {
    icon: Sparkles,
    title: "Infra Generator",
    description: "Generate infra from text",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-300">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Autonomous operations across your entire cloud stack
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-white/10 bg-[#111827]/75 p-6 shadow-[0_12px_32px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:shadow-[0_16px_44px_rgba(37,99,235,0.25)]"
            >
              <div className="inline-flex rounded-xl bg-gradient-to-br from-[#2563EB]/30 to-[#4F46E5]/30 p-2.5 text-blue-200 ring-1 ring-white/15">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
