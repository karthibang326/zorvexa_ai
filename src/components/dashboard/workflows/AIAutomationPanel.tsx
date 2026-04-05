import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Bot, Zap, Activity, Bell, 
  Terminal, Globe, Cpu, ArrowRight,
  Plus, Search, Settings, Filter,
  Layers, MousePointer2, ZoomIn, ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AIAutomationPanel = () => {
  const [activeNode, setActiveNode] = useState<string | null>("Agent-01");

  const NODES = [
    { id: "Trigger-01", type: "trigger", icon: Globe, label: "Webhook Inbound", sub: "Cloudflare GSLB", x: 100, y: 150, color: "border-orange-500/50" },
    { id: "Agent-01", type: "agent", icon: Bot, label: "SRE Analyst", sub: "RCA System-V4", x: 400, y: 150, color: "border-primary/50", active: true },
    { id: "Action-01", type: "action", icon: Terminal, label: "Deploy Rollback", sub: "Manual Approval", x: 700, y: 50, color: "border-blue-500/50" },
    { id: "Notify-01", type: "notify", icon: Bell, label: "Slack Sync", sub: "#ops-critical", x: 700, y: 250, color: "border-emerald-500/50" },
  ];

  return (
    <div className="flex h-full animate-in fade-in duration-500 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01] relative group">
      {/* Visual Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="absolute top-6 left-6 z-10 flex gap-2">
           <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 shadow-2xl backdrop-blur-md">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><MousePointer2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Layers className="w-4 h-4" /></Button>
              <div className="w-px h-4 bg-white/10 mx-1 mt-2" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><ZoomIn className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><ZoomOut className="w-4 h-4" /></Button>
           </div>
           <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 shadow-2xl backdrop-blur-md flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest animate-pulse italic">Live Execution: ACTIVE</span>
           </div>
        </div>

        <div className="absolute inset-0 cursor-grab active:cursor-grabbing p-12">
           <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>
              {/* Connections */}
              <motion.path 
                d="M 276 200 L 400 200" 
                stroke="#f9731680" 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
              <motion.path 
                d="M 576 180 L 700 100" 
                stroke="#10b98180" 
                strokeWidth="2" 
                fill="none" 
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                strokeDasharray="5 5"
              />
              <motion.path 
                d="M 576 220 L 700 300" 
                stroke="#3b82f680" 
                strokeWidth="2" 
                fill="none" 
              />
           </svg>

           {NODES.map((node) => (
              <motion.div
                key={node.id}
                onClick={() => setActiveNode(node.id)}
                className={`absolute w-44 p-4 rounded-2xl bg-black/80 border-2 shadow-2xl transition-all cursor-pointer group ${node.color} ${activeNode === node.id ? 'scale-105 z-20 shadow-primary/10' : 'opacity-80'}`}
                style={{ left: node.x, top: node.y }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex flex-col items-center text-center gap-2">
                   <div className={`p-2.5 rounded-xl ${activeNode === node.id ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-muted-foreground group-hover:text-primary transition-colors'}`}>
                      <node.icon className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="text-[11px] font-black uppercase tracking-tight italic">{node.label}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{node.sub}</p>
                   </div>
                </div>
                {activeNode === node.id && (
                   <div className="absolute inset-0 border border-primary/40 rounded-2xl animate-in zoom-in-95 pointer-events-none" />
                )}
              </motion.div>
           ))}
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex gap-2 z-10 font-black italic">
           <Button className="h-10 px-6 bg-primary text-black hover:bg-primary/90 text-xs uppercase tracking-tighter italic">
              <Plus className="w-4 h-4 mr-2" /> Add Smart Node
           </Button>
           <Button variant="ghost" className="h-10 px-6 text-xs uppercase tracking-tighter text-muted-foreground hover:text-primary italic border border-white/5">
              Deploy Workflow ⚡
           </Button>
        </div>
      </div>

      {/* Property Panel */}
      <div className="w-80 border-l border-white/5 bg-white/[0.02] p-6 hidden xl:block space-y-6 animate-in slide-in-from-right duration-500">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
               <Settings className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Node Configuration</span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-50 italic">UUID-XJ42</span>
         </div>

         {activeNode === 'Agent-01' ? (
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[8px] uppercase text-muted-foreground font-black tracking-widest">Agent Persona</label>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 italic text-[11px] leading-relaxed text-foreground/80">
                     "You are an SRE Analyst tasked with identifying root causes for 5xx errors. Grounded in Cloudflare GSLB metrics."
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[8px] uppercase text-muted-foreground font-black tracking-widest">Decision Confidence</label>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                     <span className="text-primary font-bold">92%</span>
                     <span className="opacity-30">NOMINAL</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-primary w-[92%]" />
                  </div>
               </div>

               <div className="space-y-3 pt-6 border-t border-white/5">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Execution Policies</p>
                  {[
                     { label: "Retry on failure", enabled: true },
                     { label: "Durability (Temporal)", enabled: true },
                     { label: "Manual Approval Reg", enabled: false },
                  ].map((p, i) => (
                     <div key={i} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                        <span className="text-[11px] font-medium italic opacity-80">{p.label}</span>
                        <div className={`w-3 h-3 rounded-full ${p.enabled ? 'bg-primary' : 'bg-white/10'}`} />
                     </div>
                  ))}
               </div>
            </div>
         ) : (
            <div className="h-full flex items-center justify-center text-center opacity-30 italic">
               <p className="text-xs">Select a node to configure orchestration logic.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default AIAutomationPanel;
