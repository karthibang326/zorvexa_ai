import { motion } from "framer-motion";
import { ServerIcon, NetworkIcon, DatabaseIcon, CpuIcon, LayersIcon } from "lucide-react";

export default function Architecture() {
  return (
    <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-20 max-w-2xl mx-auto">
           <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">Architecture</h2>
           <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for absolute reliability.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Layer 1: Data Plane */}
          <motion.div 
             initial={{ opacity: 0, x: -20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="p-8 border border-white/5 bg-slate-900/10 rounded-3xl backdrop-blur-md relative"
          >
             <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                   <ServerIcon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Data Plane</h3>
             </div>
             <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Distributed execution context across all regions. Low-latency, multi-cloud adapter network.
             </p>
             <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">AWS EKS</span>
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">GCP GKE</span>
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">Azure AKS</span>
             </div>
          </motion.div>

          {/* Layer 2: Control Plane */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="p-8 border border-indigo-500/20 bg-indigo-500/5 rounded-3xl backdrop-blur-md ring-1 ring-inset ring-indigo-500/10"
          >
             <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                   <LayersIcon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Control Plane</h3>
             </div>
             <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Centralized orchestration engine for workflow lifecycle, DAG management, and SSE-based streaming.
             </p>
             <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">Fastify</span>
                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">BullMQ</span>
                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">Prisma</span>
             </div>
          </motion.div>

          {/* Layer 3: AI Engine */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="p-8 border border-white/5 bg-slate-900/10 rounded-3xl backdrop-blur-md"
          >
             <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                   <CpuIcon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Intelligence Engine</h3>
             </div>
             <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Self-learning controller with vector-based memory for autonomous problem-solving and optimization.
             </p>
             <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">FAISS</span>
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">OpenAI</span>
                <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-white/10">FastAPI</span>
             </div>
          </motion.div>
        </div>
        
        {/* Simplified Diagram Visual */}
        <div className="mt-16 w-full max-w-5xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent relative">
           <div className="absolute left-1/4 top-[-4px] h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
           <div className="absolute left-1/2 top-[-4px] h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
           <div className="absolute right-1/4 top-[-4px] h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        </div>
      </div>
    </section>
  );
}
