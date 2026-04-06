import { motion } from "framer-motion";
import { Eye, Compass, Brain, Zap } from "lucide-react";

const STEPS = [
  {
    id: "observe",
    label: "Observe",
    description: "Ingest trillions of data points across your multi-cloud environment in real-time.",
    icon: Eye,
    color: "text-blue-400",
  },
  {
    id: "orient",
    label: "Orient",
    description: "Contextualize anomalies against historical cloud patterns and your custom governance policies.",
    icon: Compass,
    color: "text-amber-400",
  },
  {
    id: "decide",
    label: "Decide",
    description: "AI generates a risk-mitigated remediation plan and identifies the most cost-efficient path.",
    icon: Brain,
    color: "text-indigo-400",
  },
  {
    id: "act",
    label: "Act",
    description: "Autonomous execution of the plan via the Zorvexa DAG engine with zero human intervention.",
    icon: Zap,
    color: "text-emerald-400",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.02),_transparent)]" />
      
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-24 max-w-2xl mx-auto">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">Autonomous Intelligence</h2>
          <p className="text-3xl sm:text-5xl font-black tracking-tight text-white italic">
            The OODA Loop.
          </p>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">
            Zorvexa isn't just a tool; it's a closed-loop intelligence system that lives in your cloud 24/7.
          </p>
        </div>

        <div className="relative mt-20">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 hidden lg:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="relative group text-center lg:text-left z-10"
              >
                {/* Step Circle */}
                <div className="mx-auto lg:mx-0 w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-8 relative transition-all group-hover:border-indigo-500 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-lg">
                    STEP 0{idx + 1}
                  </span>
                  <step.icon className={`h-6 w-6 ${step.color}`} strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                  {step.label}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Action Visualization Highlight */}
        <div className="mt-32 p-8 rounded-[2rem] border border-white/10 bg-indigo-500/5 relative group overflow-hidden">
           <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                 <h4 className="text-lg font-bold text-white mb-2">Automated Incident Response</h4>
                 <p className="text-sm text-slate-400 leading-relaxed italic">
                    "Zorvexa detected a 300% latency spike in the checkout service. It autonomously re-routed traffic, scaled the underlying worker nodes across two AZs, and successfully resolved the issue before a single alert was triggered manually."
                 </p>
              </div>
              <div className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-3 backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-xs font-mono font-bold text-slate-300">SYSTEM HEALTH: 100% (RECOVERED)</span>
              </div>
           </div>
           {/* Background Mesh */}
           <div className="absolute inset-0 opacity-[0.1] -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
      </div>
    </section>
  );
}
