import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, PieChart, Info, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative min-h-[95vh] bg-slate-950 pt-20 overflow-hidden flex items-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] h-[80%] w-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[5%] h-[60%] w-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* LEFT: Messaging (40% focus) */}
          <div className="lg:col-span-5 text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="mb-8 flex items-center space-x-3">
                 <div className="flex -space-x-1">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <Cpu className="h-4 w-4 text-indigo-400 ml-1" />
                 </div>
                 <span className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-500">
                    Built for SRE • Platform Engineers
                 </span>
              </div>

              <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[0.95] mb-8">
                Autonomous Cloud <br /> <span className="text-indigo-500">Control Plane</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
                Orchestrate workflows, execute at scale, self-heal failures, and optimize cloud cost — across AWS, GCP, and Azure using AI.
              </p>

              <div className="flex flex-wrap gap-5 mb-14">
                <Button asChild size="lg" className="rounded-2xl h-14 bg-indigo-600 hover:bg-slate-100 hover:text-slate-950 text-white shadow-[0_15px_40px_-10px_rgba(99,102,241,0.4)] px-10 font-black tracking-tight text-md transition-all">
                  <Link to="/auth">View Live System</Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-2xl h-14 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 px-10 font-bold">
                  <Link to="/docs">Explore Architecture</Link>
                </Button>
              </div>

              <div className="border-t border-white/5 pt-10 flex items-center justify-between opacity-60">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution</span>
                    <span className="text-xs font-bold text-white">Real-time DAG</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Remediation</span>
                    <span className="text-xs font-bold text-white">AI-Driven Loops</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compliance</span>
                    <span className="text-xs font-bold text-white">Policy Enforced</span>
                 </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: High-Fidelity Product Visualization (60% focus) */}
          <div className="lg:col-span-7 relative">
            <motion.div
               initial={{ opacity: 0, y: 40, scale: 0.95, rotateY: -10 }}
               animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
               transition={{ duration: 1.2, ease: "circOut" }}
               className="perspective-[2000px]"
            >
               <div className="relative rounded-[2.5rem] bg-slate-900/40 p-1.5 border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden group">
                  {/* Subtle Scanline Overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20" />
                  
                  <div className="rounded-[2.4rem] bg-[#020617] overflow-hidden aspect-video relative flex flex-col">
                     
                     {/* Window Header */}
                     <div className="h-14 flex items-center justify-between px-8 bg-white/5 border-b border-white/5">
                        <div className="flex space-x-2">
                           <div className="w-3 h-3 rounded-full bg-rose-500/30" />
                           <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                           <div className="w-3 h-3 rounded-full bg-emerald-500/30" />
                        </div>
                        <div className="flex items-center space-x-4">
                           <span className="text-[10px] font-mono text-slate-500 tracking-tighter">ENVIRONMENT: PRODUCTION</span>
                           <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-emerald-500">LIVE</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 grid grid-cols-12 overflow-hidden relative">
                        
                        {/* 1. DAG Workflow View (Left 7 Columns) */}
                        <div className="col-span-8 p-8 relative flex flex-col overflow-hidden border-r border-white/5">
                           <div className="flex items-center justify-between mb-8">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Autonomous Workflow: checkout-orchestration</span>
                              <Zap className="h-3.5 w-3.5 text-indigo-500" />
                           </div>

                           {/* Visual DAG Steps */}
                           <div className="relative flex-1 flex flex-col items-center justify-center space-y-12">
                              {/* Step 1: Managed Success */}
                              <div className="w-44 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between px-4">
                                 <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                 <span className="text-[10px] font-bold text-emerald-400">Validate VPC</span>
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                              </div>

                              <div className="w-0.5 h-12 bg-gradient-to-b from-emerald-500 to-indigo-500" />

                              {/* Step 2: Running Pulse */}
                              <div className="w-52 h-14 rounded-xl bg-indigo-500/20 border border-indigo-500 flex items-center justify-between px-4 shadow-[0_0_30px_rgba(99,102,241,0.2)] animate-pulse">
                                 <Cpu className="h-4 w-4 text-indigo-400" />
                                 <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Scaling Kubernetes</span>
                                 <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366f1]" />
                              </div>

                              <div className="w-0.5 h-8 bg-dashed bg-slate-800" />

                              {/* Step 3: Pending */}
                              <div className="w-44 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between px-4 opacity-40">
                                 <Info className="h-4 w-4 text-slate-500" />
                                 <span className="text-[10px] font-bold text-slate-500">Propagate DNS</span>
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                              </div>
                           </div>
                        </div>

                        {/* 2. AI & Cost Pane (Right 4 Columns) */}
                        <div className="col-span-4 bg-slate-900/30 backdrop-blur-sm p-6 flex flex-col">
                           
                           {/* Insight Widget 1: Cost */}
                           <div className="mb-8 p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20">
                              <div className="flex items-center space-x-2 mb-2">
                                 <PieChart className="h-3 w-3 text-indigo-400" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">FinOps Snapshot</span>
                              </div>
                              <h4 className="text-2xl font-black text-white italic tracking-tighter">-$1,240<span className="text-xs text-indigo-500 ml-1">SAVE / DAY</span></h4>
                              <p className="text-[9px] text-slate-500 mt-1 leading-tight uppercase font-bold tracking-widest">Rightsizing nodes in us-east-1</p>
                           </div>

                           {/* Insight Widget 2: AI Console */}
                           <div className="flex-1 flex flex-col">
                              <div className="flex items-center space-x-2 mb-4">
                                 <Terminal className="h-3 w-3 text-slate-500" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Autonomous Trace</span>
                              </div>
                              <div className="flex-1 font-mono text-[9px] text-slate-400 space-y-4 leading-relaxed overflow-hidden py-1">
                                 <p className="border-l-2 border-indigo-500/30 pl-3">
                                    <span className="text-indigo-400">[08:42:01]</span> Anomalous latency detected in P99 logs. Scaling trigger initiated.
                                 </p>
                                 <p className="border-l-2 border-emerald-500/30 pl-3">
                                    <span className="text-emerald-400">[08:42:04]</span> Self-healing approved by policy OPA-72. Scaling replicas to 18.
                                 </p>
                                 <p className="border-l-2 border-slate-500/30 pl-3 animate-pulse">
                                    <span className="text-slate-500">[08:42:10]</span> Verifying health check on new instances... 
                                 </p>
                              </div>
                           </div>
                           
                           {/* Cloud Provider Indicators */}
                           <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                               <Globe className="h-4 w-4" />
                               <span className="text-[9px] font-black tracking-widest">AWS</span>
                               <span className="text-[9px] font-black tracking-widest text-indigo-500">GCP</span>
                               <span className="text-[9px] font-black tracking-widest">AZURE</span>
                           </div>
                        </div>

                     </div>
                  </div>
               </div>
               
               {/* Ambient Glows behind the card */}
               <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-indigo-500/5 blur-[140px] pointer-events-none" />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
