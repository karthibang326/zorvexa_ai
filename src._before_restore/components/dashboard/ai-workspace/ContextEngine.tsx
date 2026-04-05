import { 
  Brain, 
  Rocket, 
  Server, 
  Activity, 
  Zap, 
  Shield, 
  AlertCircle,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextEngineProps {
  activeTab: string;
}

const ContextEngine: React.FC<ContextEngineProps> = ({ activeTab }) => {
  return (
    <div className="flex flex-col h-full bg-[#0B1220] overflow-hidden border-l border-white/5 shadow-2xl">
      {/* 1. ACTIVE CONTEXT (COMPRESSED) */}
      <div className="p-5 border-b border-white/[0.03] bg-white/[0.01]">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-5">Active Context</h3>
        <div className="space-y-1.5">
          {[
            { label: "Deployment", value: "payment-api-v2.4", icon: Rocket },
            { label: "Cluster", value: "us-east-1a-prod", icon: Server },
            { label: "Memory", value: "14.2 GB / 32 GB", icon: Activity },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.02] flex items-center gap-3 group hover:bg-white/[0.04] transition-all">
              <item.icon className="w-3 h-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none mb-1">{item.label}</p>
                <p className="text-[11px] font-bold text-foreground/80 truncate leading-none">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SIGNALS (HIGH-PRIORITY ONLY) */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-5">Signals</h3>
        <div className="space-y-4">
          {[
            { event: "Kubernetes Error", desc: "Pod OOM killed in namespace 'payments'", time: "2m ago", color: "bg-red-400" },
            { event: "Auto-scaling Event", desc: "Cluster scaled up +2 nodes in us-east-1a", time: "14m ago", color: "bg-emerald-400" },
            { event: "Security Audit", desc: "Unusual traffic spike on /checkout", time: "45m ago", color: "bg-amber-400" },
          ].map((sig) => (
            <div key={sig.event} className="relative pl-5 border-l border-white/5 group cursor-default pb-1">
              <div className={cn("absolute -left-[3.5px] top-0 w-1.5 h-1.5 rounded-full shadow-sm", sig.color)} />
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[9px] font-bold uppercase tracking-widest", sig.color.replace('bg-', 'text-'))}>{sig.event}</span>
                <span className="text-[8px] font-medium text-muted-foreground/40 uppercase">{sig.time}</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground/60 leading-tight truncate">{sig.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AI INSIGHT (PRIMARY CTA) */}
      <div className="p-5 mt-auto bg-gradient-to-b from-transparent to-primary/5 border-t border-white/[0.03]">
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
               <Brain className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary/80">Diagnostic Insight</h3>
          </div>
          
          <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed italic">
             "Performance may drop by <span className="text-primary font-bold">~14%</span> due to auth connection pressure. Immediate scaling recommended."
          </p>
          
          <button className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-glow-primary">
            <Zap className="w-3 h-3" />
            Apply Fix
          </button>
        </div>
        <p className="text-center text-[8px] font-bold text-muted-foreground/20 uppercase mt-4 tracking-tighter">Diagnostic Engine active</p>
      </div>
    </div>
  );
};

export default ContextEngine;
