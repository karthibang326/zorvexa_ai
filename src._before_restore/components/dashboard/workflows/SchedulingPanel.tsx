import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Clock, Calendar, Plus, MoreVertical, 
  ChevronRight, ArrowUpRight, Search,
  Filter, RotateCcw, Activity, Bell,
  Server, Globe, Cpu, AlertCircle,
  CheckCircle2, Sparkles, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SchedulingPanel = () => {
  const [activeJob, setActiveJob] = useState("Daily-Cleanup");

  const JOBS = [
    { id: "Daily-Cleanup", label: "Daily DB Cleanup", cron: "0 0 * * *", next: "14h 20m", status: "Active" },
    { id: "Weekly-Review", label: "Weekly Cost Audit", cron: "0 9 * * 1", next: "2d 12h", status: "Active" },
    { id: "Auth-Rotate", label: "Auth Keys Rotation", cron: "0 0 1 * *", next: "12d 4h", status: "Disabled" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-hidden pb-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-black uppercase tracking-tight italic">Time-Based Orchestration</h2>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-mono opacity-50 underline decoration-primary/30">Stable Crons • Precise Scheduling</p>
        </div>
        <div className="flex gap-2">
           <Button className="h-10 px-6 bg-primary text-black hover:bg-primary/90 text-xs uppercase tracking-tighter italic">
              <Plus className="w-4 h-4 mr-2" /> New Schedule
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {JOBS.map((j) => (
           <div 
              key={j.id} 
              onClick={() => setActiveJob(j.id)}
              className={`p-6 rounded-3xl bg-white/[0.02] border transition-all cursor-pointer group space-y-4 ${
                activeJob === j.id ? 'border-primary/40 bg-primary/5' : 'border-white/5 hover:border-white/10'
              }`}
           >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors`}>
                       <Clock className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-tight italic">{j.label}</h3>
                       <p className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest mt-0.5">{j.cron}</p>
                    </div>
                 </div>
                 <div className={`w-2 h-2 rounded-full ${j.status === 'Active' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-mono italic opacity-60">
                    <span>Next Execution</span>
                    <span>{j.next}</span>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3" />
                 </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-muted-foreground font-mono opacity-50 uppercase tracking-widest italic">
                 <span>{j.status}</span>
                 <span>Upcoming Timeline ↗</span>
              </div>
           </div>
         ))}
      </div>

      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6 shadow-2xl overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Calendar className="w-48 h-48" />
         </div>

         <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
               <Calendar className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Inter-Cloud Calendar view</span>
            </div>
            <div className="flex gap-2">
               <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-50 italic">Timezone: UTC-00</span>
            </div>
         </div>

         <div className="grid grid-cols-7 gap-4 relative z-10">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
               <div key={i} className="space-y-3">
                  <span className="text-[10px] uppercase font-black tracking-widest opacity-30 block text-center mb-4">{day}</span>
                  {[1, 2, 3].map((_, j) => (
                    <div key={j} className={`h-24 rounded-2xl bg-black/40 border border-white/5 p-3 group hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer ${i === 2 && j === 1 ? 'border-primary/30 bg-primary/5' : ''}`}>
                       {i === 2 && j === 1 && (
                          <div className="space-y-1">
                             <span className="text-[8px] font-bold text-primary uppercase">09:00</span>
                             <p className="text-[9px] font-black italic opacity-80 leading-tight">Weekly Review Execution</p>
                          </div>
                       )}
                       {i === 1 && j === 0 && (
                          <div className="space-y-1">
                             <span className="text-[8px] font-bold text-blue-400 uppercase">14:00</span>
                             <p className="text-[9px] font-black italic opacity-80 leading-tight">API Sync (main)</p>
                          </div>
                       )}
                    </div>
                  ))}
               </div>
            ))}
         </div>

         <div className="mt-8 p-5 rounded-3xl bg-primary/5 border border-primary/20 space-y-3 relative z-10">
            <div className="flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest">Efficiency Insight</span>
            </div>
            <p className="text-[11px] text-foreground/70 leading-relaxed italic italic">
               "Detected 4 overlapping cron jobs at 00:00 UTC. I recommend staggering them by 15-minute intervals to reduce infrastructure burst costs by **$420/month**."
            </p>
            <Button variant="ghost" size="sm" className="h-8 text-[9px] uppercase font-black bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20">Stagger Jobs Automatically</Button>
         </div>
      </div>
    </div>
  );
};

export default SchedulingPanel;
