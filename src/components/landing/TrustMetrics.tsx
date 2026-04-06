import { motion } from "framer-motion";
import { ShieldCheckIcon, GlobeIcon, ServerIcon, UsersIcon } from "lucide-react";

const METRICS = [
  {
    label: "Cloud Spend Under Management",
    value: "$1.4B",
    icon: GlobeIcon,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    label: "Autonomous Actions Monthly",
    value: "20M+",
    icon: ServerIcon,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    label: "SRE Teams Empowered",
    value: "450+",
    icon: UsersIcon,
    color: "text-indigo-500 bg-indigo-500/10",
  },
  {
    label: "Mean-Time-To-Resolve (MTTR)",
    value: "3s",
    icon: ShieldCheckIcon,
    color: "text-rose-500 bg-rose-500/10",
  },
];

export default function TrustMetrics() {
  return (
    <section className="py-24 sm:py-32 bg-slate-950 border-y border-white/5 relative overflow-hidden">
      {/* Background Micro-Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 items-center text-center">
          {METRICS.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative p-8 rounded-[2rem] hover:bg-white/[0.02] transition-colors group"
            >
              <div className={`mx-auto w-12 h-12 rounded-full ${metric.color} flex items-center justify-center mb-6`}>
                <metric.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h4 className="text-4xl font-black text-white italic tracking-tighter mb-2 scale-110 group-hover:text-indigo-400 transition-colors">
                {metric.value}
              </h4>
              <p className="text-xs uppercase font-black tracking-widest text-slate-500">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Enterprise Logos Placeholder (Dark Clean Sub-Section) */}
        <div className="mt-20 border-t border-white/5 pt-12 flex flex-wrap justify-center gap-12 opacity-30 grayscale contrast-125 filter">
           <div className="h-6 w-32 bg-white/20 rounded-md" />
           <div className="h-6 w-24 bg-white/20 rounded-md" />
           <div className="h-6 w-40 bg-white/20 rounded-md" />
           <div className="h-6 w-28 bg-white/20 rounded-md" />
           <div className="h-6 w-36 bg-white/20 rounded-md" />
        </div>
      </div>
    </section>
  );
}
