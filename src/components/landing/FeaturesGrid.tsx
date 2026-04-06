import { motion } from "framer-motion";
import { 
  ZapIcon, 
  ShieldCheckIcon, 
  CpuIcon, 
  ActivityIcon, 
  TrendingDownIcon, 
  CloudIcon, 
  ChevronRightIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Workflow Orchestration",
    description: "Build and manage complex multi-stage DAGs with topological sorting and high-availability job queues.",
    icon: ZapIcon,
    color: "text-amber-400 bg-amber-400/10",
    size: "col-span-1 md:col-span-2",
  },
  {
    title: "Real-Time Execution",
    description: "SSE-backed streaming logs for absolute visibility.",
    icon: ActivityIcon,
    color: "text-blue-400 bg-blue-400/10",
    size: "col-span-1",
  },
  {
    title: "AI Deployment Engine",
    description: "Generate infrastructure from natural language.",
    icon: CpuIcon,
    color: "text-indigo-400 bg-indigo-400/10",
    size: "col-span-1",
  },
  {
    title: "Autonomous Self-Healing",
    description: "Detect, orient, decide, and act. Zorvexa autonomously identifies and resolves drift before it hits your SLIs.",
    icon: ShieldCheckIcon,
    color: "text-emerald-400 bg-emerald-400/10",
    size: "col-span-1 md:col-span-2",
  },
  {
    title: "FinOps Optimization",
    description: "Real-time cost anomaly detection and automated rightsizing.",
    icon: TrendingDownIcon,
    color: "text-rose-400 bg-rose-400/10",
    size: "col-span-1",
  },
  {
    title: "Multi-Cloud Abstraction",
    description: "One control plane for AWS, GCP, and Azure.",
    icon: CloudIcon,
    color: "text-sky-400 bg-sky-400/10",
    size: "col-span-1",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.03),_transparent)]" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl text-left mb-20 px-4 border-l-2 border-indigo-500/50">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">Platform Capabilities</h2>
          <p className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Autonomous Resilience at Scale.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "group relative p-8 rounded-3xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all hover:border-white/10 overflow-hidden flex flex-col justify-between h-full shadow-2xl",
                feature.size
              )}
            >
              <div className="flex-1">
                <div className={cn("mb-6 p-4 rounded-2xl w-fit transition-transform group-hover:scale-110", feature.color)}>
                  <feature.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  {feature.description}
                </p>
              </div>
              <div className="mt-8 flex items-center space-x-2 text-indigo-500 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View Documentation</span>
                <ChevronRightIcon className="h-3 w-3" />
              </div>

              {/* Grid Background Effect */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
