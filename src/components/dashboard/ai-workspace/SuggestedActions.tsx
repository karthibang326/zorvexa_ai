import React, { useState } from "react";
import { 
  Zap, RotateCcw, ArrowUpRight, 
  Settings, MessageSquare, Shield,
  Terminal, Sparkles, AlertCircle, Play,
  Loader2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BRAND } from "@/shared/branding";

const ActionItem = ({ icon: Icon, label, description, color = "text-primary", onClick, isExecuting }: any) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    disabled={isExecuting}
    onClick={onClick}
    className={cn(
      "flex-1 flex items-center gap-4 p-4 rounded-2xl bg-[#141518]/60 backdrop-blur-md border border-white/[0.04] transition-all text-left shadow-2xl group cursor-pointer relative overflow-hidden",
      isExecuting ? "border-primary/50 bg-primary/5 cursor-wait" : "hover:bg-white/[0.03] hover:border-primary/20"
    )}
  >
    {isExecuting && (
      <motion.div 
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none"
      />
    )}
    
    <div className={cn(
      "w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center transition-all group-hover:shadow-glow-primary/5 group-hover:border-primary/30 shrink-0",
      color,
      isExecuting && "animate-pulse"
    )}>
      {isExecuting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
    </div>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-[12px] font-black text-white/90 uppercase tracking-tight italic group-hover:text-primary transition-colors">{label}</span>
      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] truncate italic mt-0.5">
        {isExecuting ? "Executing Orchestration..." : description}
      </span>
    </div>
    <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
       <ArrowUpRight className="w-3.5 h-3.5 text-white/40 group-hover:text-primary" />
    </div>
  </motion.button>
);

const SuggestedActions = ({ horizontal = false }: { horizontal?: boolean }) => {
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const handleAction = async (action: any) => {
    setExecutingAction(action.label);
    toast.info(`Orchestrator: Initiating ${action.label}...`);
    
    // Simulate real infrastructure interaction
    await new Promise(r => setTimeout(r, 2000));
    
    setExecutingAction(null);
    toast.success(`${BRAND.shortName} AI: ${action.label} completed successfully. Clusters synchronized.`);
  };

  const actions = [
    { icon: AlertCircle, label: "Generate RCA", description: "Root cause analysis report", color: "text-amber-400" },
    { icon: RotateCcw, label: "Restart Core Service", description: "Recover auth-service-v2", color: "text-red-400 shadow-glow-destructive/20" },
    { icon: Zap, label: "Scale Deployment", description: "+2 Replicas (Ingress-A)", color: "text-primary shadow-glow-primary/20" },
    { icon: Shield, label: "Harden Firewall", description: "IP Blocking policy sync", color: "text-emerald-400" },
  ];

  return (
    <div className={cn(
      "flex gap-4 p-6 shrink-0 z-20",
      horizontal ? "w-full border-t border-white/[0.04] bg-[#0B0C0E]/60 backdrop-blur-xl" : "flex-col border-l border-white/[0.04]"
    )}>
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary shadow-glow-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.25em] italic">Operator Shortcuts</span>
         </div>
         <span className="text-[9px] font-mono text-white/20">⌘ + SHIFT + E</span>
      </div>
      
      <div className={cn(
        "grid gap-3 w-full",
        horizontal ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"
      )}>
        {actions.map((action, i) => (
          <ActionItem 
            key={i} 
            {...action} 
            isExecuting={executingAction === action.label}
            onClick={() => handleAction(action)} 
          />
        ))}
      </div>
    </div>
  );
};


export default SuggestedActions;
