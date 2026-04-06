import { motion } from "framer-motion";
import { TrendingUpIcon, PiggyBankIcon, SparklesIcon } from "lucide-react";

export default function FinOpsValue() {
  return (
    <section className="py-24 sm:py-32 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="max-w-xl">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">FinOps Optimization</h2>
             <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                ROI-driven by intelligence.
             </p>
             <p className="mt-6 text-slate-400 text-base leading-relaxed">
                Zorvexa doesn't just monitor cost — it enforces optimization. Using predictive analytics and autonomous rightsizing, we've helped teams reduce their multi-cloud spend by up to 40% in less than 30 days.
             </p>
             <ul className="mt-10 space-y-4">
                <li className="flex items-center space-x-3">
                   <PiggyBankIcon className="h-5 w-5 text-emerald-500" />
                   <span className="text-sm font-semibold text-slate-100">Autonomous Instance Rightsizing</span>
                </li>
                <li className="flex items-center space-x-3">
                   <SparklesIcon className="h-5 w-5 text-indigo-400" />
                   <span className="text-sm font-semibold text-slate-100">Predictive Budget Enforcement</span>
                </li>
             </ul>
          </div>

          {/* Savings visualization mockup */}
          <div className="relative group p-0.5 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 via-white/5 to-emerald-500/10">
             <div className="bg-slate-950/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="flex justify-between items-end mb-10">
                   <div>
                      <p className="text-xs uppercase font-black tracking-widest text-slate-500 mb-1">Estimated Monthly Savings</p>
                      <h4 className="text-5xl font-black text-white tracking-tighter">$14,280<span className="text-2xl text-emerald-500 ml-2">.50</span></h4>
                   </div>
                   <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1 flex items-center space-x-2">
                       <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                       <span className="text-[10px] font-bold text-emerald-400"> +28% SAVED</span>
                   </div>
                </div>

                {/* Animated Chart Mockup (Static columns for simplicity but clean design) */}
                <div className="flex items-end space-x-3 h-48 w-full">
                   {[30, 45, 38, 55, 62, 70, 85].map((h, i) => (
                      <motion.div 
                         key={i} 
                         initial={{ height: 0 }}
                         whileInView={{ height: `${h}%` }}
                         viewport={{ once: true }}
                         transition={{ delay: i * 0.1, duration: 0.8 }}
                         className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500/30 to-indigo-500/10 border-t border-indigo-500/20" 
                      />
                   ))}
                </div>
                
                <div className="mt-8 flex items-center justify-center space-x-4">
                   <div className="flex items-center space-x-1.5 grayscale opacity-50 contrast-125">
                      <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
                      <div className="w-16 h-2 bg-slate-800 rounded animate-pulse" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
