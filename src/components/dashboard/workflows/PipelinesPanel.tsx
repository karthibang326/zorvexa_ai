import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Terminal, Play, CheckCircle2, RotateCcw, 
  Activity, Clock, ChevronRight, AlertCircle,
  GitBranch, GitPullRequest, Layout, Search,
  Plus, MoreVertical, Server
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PipelinesPanel = () => {
  const [activeStage, setActiveStage] = useState<string | null>("Deploy");

  const PIPELINES = [
    { id: 1, name: "API Service - Production", branch: "main", status: "Success", duration: "12m 42s", time: "2m ago" },
    { id: 2, name: "Auth Engine - Staging", branch: "dev-v2", status: "Running", duration: "4m 10s", time: "Active" },
    { id: 3, name: "Analytics Worker - Edge", branch: "fix-latency", status: "Failed", duration: "1m 05s", time: "1h ago" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-hidden pb-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-black uppercase tracking-tight italic">Global DevOps Pipelines</h2>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-mono opacity-50 underline decoration-primary/30">Stable CI/CD • Temporal-Powered Durability</p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" className="h-10 px-6 text-xs uppercase tracking-tighter text-muted-foreground hover:text-primary italic border border-border">
              Historical DAGs ↺
           </Button>
           <Button className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-tighter italic">
              <Plus className="w-4 h-4 mr-2" /> New Pipeline
           </Button>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-muted/20 border border-border flex flex-col items-center justify-center relative shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <GitBranch className="w-48 h-48 rotate-90" />
         </div>
         
         <div className="relative z-10 w-full mb-10 text-center">
            <div className="flex items-center justify-center gap-12 md:gap-24 relative overflow-hidden">
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
               <div className="absolute top-1/2 left-0 w-2/3 h-0.5 bg-primary/20 -translate-y-1/2 z-0 animate-in slide-in-from-left duration-1000" />
               
                {[
                 { label: "Build", status: "stable", icon: GitBranch },
                 { label: "Test", status: "stable", icon: CheckCircle2 },
                 { label: "Deploy", status: "active", icon: Server },
                 { label: "Verify", status: "pending", icon: Activity },
               ].map((stage, i) => (
                 <motion.div 
                    key={i} 
                    onClick={() => setActiveStage(stage.label)}
                    className="relative z-10 flex flex-col items-center gap-4 cursor-pointer group"
                    whileHover={{ scale: 1.1 }}
                 >
                    <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center bg-background transition-all ${
                      stage.status === 'stable' ? 'border-primary text-primary shadow-primary/20' : 
                      stage.status === 'active' ? 'border-blue-400 text-blue-400 shadow-blue-400/20 animate-pulse' : 
                      'border-border text-muted-foreground'
                    }`}>
                       <stage.icon className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className={`text-[11px] font-black uppercase tracking-tight italic ${stage.status === 'active' ? 'text-blue-400' : 'text-foreground'}`}>{stage.label}</h3>
                       <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-0.5">{stage.status}</p>
                    </div>
                    {stage.status === 'active' && (
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
                    )}
                 </motion.div>
               ))}
            </div>
         </div>

         <div className="w-full bg-muted/30 border border-border rounded-2xl p-6 font-mono text-[11px] space-y-2 max-h-48 overflow-y-auto custom-scrollbar italic leading-relaxed text-foreground/70">
            <div className="flex gap-4">
               <span className="text-muted-foreground">09:42:01</span>
               <span className="text-primary font-bold">[BUILD]</span>
               <span>Artifact `api-v2.4.0` generated successfully in S3.</span>
            </div>
            <div className="flex gap-4">
               <span className="text-muted-foreground">09:42:15</span>
               <span className="text-blue-400 font-bold">[TEST]</span>
               <span>Running 124 integration suites across us-east-1.</span>
            </div>
            <div className="flex gap-4">
               <span className="text-muted-foreground">09:43:08</span>
               <span className="text-blue-400 font-bold">[TEST]</span>
               <span>124/124 SUITES PASSED. GROUNDING CONFIRMED.</span>
            </div>
            <div className="flex gap-4 animate-pulse">
               <span className="text-muted-foreground">09:43:12</span>
               <span className="text-orange-500 font-bold">[DEPLOY]</span>
               <span>Migrating blue-green traffic to new K8s service mesh.</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {PIPELINES.map((p) => (
           <div key={p.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer group space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${p.status === 'Success' ? 'text-primary' : p.status === 'Running' ? 'text-blue-400' : 'text-red-500'}`}>
                       <Layout className="w-4 h-4" />
                    </div>
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-tight italic">{p.name}</h3>
                       <p className="text-[9px] text-muted-foreground uppercase font-mono">{p.branch}</p>
                    </div>
                 </div>
                 <MoreVertical className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase text-muted-foreground block mb-0.5">Duration</span>
                    <span className="text-[10px] font-mono font-bold italic">{p.duration}</span>
                 </div>
                 <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase text-muted-foreground block mb-0.5">Status</span>
                    <span className={`text-[10px] font-black italic uppercase ${p.status === 'Success' ? 'text-primary' : p.status === 'Running' ? 'text-blue-400' : 'text-red-500'}`}>{p.status}</span>
                 </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono opacity-50 uppercase tracking-widest italic pt-2 border-t border-white/5">
                 <span>{p.time}</span>
                 <span>View Logs ↗</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default PipelinesPanel;
