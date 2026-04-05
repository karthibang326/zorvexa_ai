import React, { useState } from "react";
import { 
  Globe, Zap, Shield, Search, Plus, 
  MoreVertical, ChevronRight, Hash,
  Database, GitBranch, Bell, Terminal,
  Library, Clock, Trash2, Edit,
  ArrowUpRight, Sparkles, Filter,
  Layers, MousePointer2, ZoomIn, ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const EventTriggersPanel = () => {
  const [activeTrigger, setActiveTrigger] = useState("Webhook-Inbound");

  const TRIGGERS = [
    { id: "Webhook-Inbound", label: "Cloudflare Webhook", type: "Webhook", status: "Active", entries: "142 /hr" },
    { id: "Git-Merge", label: "GitHub Merge (main)", type: "Git", status: "Active", entries: "12 /day" },
    { id: "System-OOM", label: "OOM K8s Killer", type: "System", status: "Active", entries: "0 /day" },
    { id: "API-Error", label: "5xx Error Threshold", type: "API", status: "Idle", entries: "2 /day" },
  ];

  return (
    <div className="flex h-full animate-in fade-in duration-500 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01]">
      <div className="w-80 border-r border-white/5 bg-white/[0.02] p-6 flex flex-col space-y-6">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Zap className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Trigger Registry</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6"><Plus className="w-3.5 h-3.5" /></Button>
         </div>

         <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
               type="text" 
               placeholder="Search triggers..." 
               className="w-full h-10 bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 text-[11px] font-medium outline-none focus:border-primary/30 transition-all italic" 
            />
         </div>

         <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {TRIGGERS.map((t) => (
               <div 
                  key={t.id} 
                  onClick={() => setActiveTrigger(t.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    activeTrigger === t.id ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
               >
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-[10px] font-black uppercase tracking-tight italic">{t.label}</span>
                     <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Active' ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono opacity-50 uppercase tracking-widest italic">
                     <span>{t.type}</span>
                     <span>{t.entries}</span>
                  </div>
               </div>
            ))}
         </div>
      </div>

      <div className="flex-1 flex flex-col bg-white/[0.03]">
         <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded bg-white/5 border border-white/5">
                 <Shield className="w-4 h-4 text-primary" />
               </div>
               <div>
                  <h3 className="text-sm font-black uppercase tracking-tight italic">{activeTrigger}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[9px] font-mono text-muted-foreground opacity-50 italic">Source: cloudflare-worker-executor-v2</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="h-8 text-[9px] uppercase font-black bg-white/5 border border-white/10 hover:text-primary transition-all">Replay Last ↺</Button>
               <Button size="sm" className="h-8 text-[9px] uppercase font-black bg-primary text-black hover:bg-primary/90 px-4">Save Configuration</Button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Inbound Payload Mapping</h4>
                  <div className="p-6 rounded-2xl bg-black/40 border border-white/10 font-mono text-[11px] space-y-4">
                     <div className="flex items-center justify-between group">
                        <span className="text-blue-400">headers.host</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary font-bold">{"{{"}cluster_origin{"}}"}</span>
                     </div>
                     <div className="flex items-center justify-between group">
                        <span className="text-blue-400">body.event.type</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary font-bold">{"{{"}trigger_code{"}}"}</span>
                     </div>
                     <div className="flex items-center justify-between group">
                        <span className="text-blue-400">body.severity</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-orange-500 font-bold">{"{{"}priority_rank{"}}"}</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Condition Logic</h4>
                     <p className="text-[11px] text-foreground/80 leading-relaxed italic italic">"Execute quantum-agent-v4 if `priority_rank` &gt; 8 and `cluster_origin` is Production."</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Rate Limiting</h4>
                     <p className="text-[11px] text-foreground/80 leading-relaxed italic italic">"Max 5 executions per minute to prevent system flooding."</p>
                  </div>
               </div>

               <div className="p-5 rounded-3xl bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-primary" />
                     <span className="text-[10px] font-black uppercase text-primary tracking-widest">Global SRE Awareness</span>
                  </div>
                  <p className="text-[11px] text-foreground/70 leading-relaxed italic italic">
                     "I've linked this trigger to your security-auditor agent to automatically analyze any suspicious payload patterns."
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EventTriggersPanel;
