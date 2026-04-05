import { motion } from "framer-motion";
import { FileText, FileSearch, FileLock, FileWarning, Upload, Eye, Download, Trash2, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ModuleHeader from "./ModuleHeader";

const files = [
  { name: "deployment-config.yaml", type: "Config", size: "12 KB", scanned: true, risk: "low", lastModified: "2h ago", owner: "devops-team" },
  { name: "secrets-prod.env.enc", type: "Secrets", size: "4 KB", scanned: true, risk: "medium", lastModified: "1d ago", owner: "security-team" },
  { name: "terraform-main.tf", type: "IaC", size: "28 KB", scanned: true, risk: "low", lastModified: "3h ago", owner: "infra-team" },
  { name: "docker-compose.prod.yml", type: "Container", size: "8 KB", scanned: true, risk: "low", lastModified: "5h ago", owner: "platform-team" },
  { name: "api-schema-v3.graphql", type: "Schema", size: "45 KB", scanned: false, risk: "unknown", lastModified: "30m ago", owner: "api-team" },
  { name: "incident-report-2024.pdf", type: "Document", size: "2.1 MB", scanned: true, risk: "low", lastModified: "2d ago", owner: "sre-team" },
];

const stats = [
  { icon: FileText, label: "Total Assets", value: "1,247", sub: "tracked" },
  { icon: FileSearch, label: "AI Scanned", value: "1,198", sub: "96% coverage" },
  { icon: FileLock, label: "Encrypted", value: "89", sub: "secrets & keys" },
  { icon: FileWarning, label: "Risks Flagged", value: "7", sub: "3 medium, 4 low" },
];

const FileIntelligenceView = () => (
  <div className="space-y-6 animate-in fade-in duration-500 pb-12">
    <div className="flex items-center justify-between group">
      <div>
        <h2 className="text-2xl font-black tracking-tighter italic text-foreground uppercase">File Intelligence</h2>
        <p className="text-[11px] text-foreground-muted font-black uppercase tracking-widest opacity-40 mt-1 italic italic">AI-powered scanning, secrets detection & compliance</p>
      </div>
      <Button 
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase italic tracking-widest px-6 h-10 shadow-lg shadow-primary/20 transition-all active:scale-95"
        onClick={() => toast.info("File upload coming soon!")}
      >
        <Upload className="w-3.5 h-3.5 mr-2" /> Ingest & Scan
      </Button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="bg-background-elevated border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-primary/20 transition-all group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <s.icon className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-40 italic">{s.label}</span>
          </div>
          <p className="text-3xl font-black tracking-tighter italic text-foreground group-hover:text-primary transition-colors">{s.value}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mt-1.5 opacity-40 italic">{s.sub}</p>
        </motion.div>
      ))}
    </div>

    {/* Scan Progress */}
    <div className="bg-background-secondary border border-border-subtle rounded-2xl p-6 shadow-inner group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
           <ShieldCheck className="w-5 h-5 text-primary animate-pulse" />
           <span className="text-xs font-black uppercase tracking-widest italic tracking-widest">Global Heuristic Scan Logic</span>
        </div>
        <span className="text-[10px] font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20 shadow-sm shadow-primary/10 tracking-[0.2em] italic">96.2% COMPLETE</span>
      </div>
      <Progress value={96.2} className="h-2.5 bg-background-elevated border border-border-subtle/50" />
      <div className="flex justify-between items-center mt-3">
         <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-40 italic tracking-tighter">49 Files queueing • Pipeline active</p>
         <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-40 italic tracking-tighter">EST. REMAINING: 03:12 MIN</p>
      </div>
    </div>

    {/* File Table */}
    <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border-subtle bg-background-elevated/30 flex items-center justify-between">
        <span className="font-black text-xs uppercase tracking-widest italic flex items-center gap-2">
           <Terminal className="w-4 h-4 text-primary" />
           Binary & Artifact Audit History
        </span>
        <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline transition-all italic tracking-[0.2em]">View Secure Vault ↗</button>
      </div>
      <div className="divide-y divide-border-subtle/50">
        {files.map((f, i) => (
          <motion.div
            key={f.name}
            className="grid grid-cols-10 gap-4 items-center px-6 py-4 hover:bg-background-elevated/50 transition-colors group cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="col-span-3 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-background-elevated border border-border-subtle group-hover:scale-110 transition-transform shadow-inner">
                 <FileText className="w-5 h-5 text-foreground-muted opacity-60 group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-black italic tracking-tight text-foreground truncate">{f.name}</p>
                <div className="flex items-center gap-2">
                   <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-40 italic italic">OWNER: {f.owner}</p>
                </div>
              </div>
            </div>
            
            <div className="col-span-1">
               <span className="text-[10px] font-black italic uppercase tracking-widest px-2.5 py-1 rounded bg-background-elevated border border-border-subtle text-foreground-muted opacity-70 italic tracking-tighter">{f.type}</span>
            </div>

            <div className="col-span-1 text-[11px] font-mono font-black italic tracking-tight text-foreground-muted opacity-60">{f.size}</div>

            <div className="col-span-2">
              <span className={`text-[9px] font-black uppercase italic tracking-widest px-3 py-1 rounded border shadow-sm ${
                f.risk === "low" ? "bg-primary/5 text-primary border-primary/20" :
                f.risk === "medium" ? "bg-orange-500/5 text-orange-400 border-orange-500/20" :
                "bg-background-elevated text-foreground-muted border-border-subtle/50 italic opacity-40"
              }`}>
                 {f.risk} RISK VECTOR
              </span>
            </div>

            <div className="col-span-1 text-[10px] font-mono text-foreground-muted uppercase tracking-tighter italic opacity-60">{f.lastModified}</div>

            <div className="col-span-2 flex items-center gap-2 justify-end">
              <button 
                className="p-2 rounded-lg bg-background-elevated border border-border-subtle shadow-sm hover:border-primary/20 hover:text-primary transition-all group/btn" 
                onClick={() => toast.info(`Viewing ${f.name}`)}
              >
                <Eye className="w-4 h-4 text-foreground-muted group-hover/btn:text-primary transition-colors" />
              </button>
              <button 
                className="p-2 rounded-lg bg-background-elevated border border-border-subtle shadow-sm hover:border-primary/20 hover:text-primary transition-all group/btn" 
                onClick={() => toast.info(`Downloading ${f.name}`)}
              >
                <Download className="w-4 h-4 text-foreground-muted group-hover/btn:text-primary transition-colors" />
              </button>
              <button 
                className="p-2 rounded-lg bg-background-elevated border border-border-subtle shadow-sm hover:border-red-500/20 hover:text-red-500 transition-all group/btn" 
                onClick={() => toast.success(`${f.name} purged`)}
              >
                <Trash2 className="w-4 h-4 text-foreground-muted group-hover/btn:text-red-500 transition-colors" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="px-6 py-2.5 bg-background-elevated/20 border-t border-border-subtle shadow-inner">
         <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted/30 text-center italic">Continuous heuristic analysis pipeline active • Zero-trust compliance enforcement enabled</p>
      </div>
    </div>
  </div>
);

export default FileIntelligenceView;
