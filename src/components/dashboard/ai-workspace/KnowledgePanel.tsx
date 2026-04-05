import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, FileText, Folder, Library,
  Sparkles, Brain, Shield, DollarSign, Network,
  BookOpen, Clock, ChevronRight, Copy, Play,
  AlertTriangle, CheckCircle2, Info, RotateCcw,
  Zap, Server, GitBranch, Database, ScrollText,
  Target, TrendingDown, Layers, ArrowUpRight,
  ScanSearch, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ModuleHeader from "../ModuleHeader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KBDocument {
  id: string;
  name: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  type: "topology" | "architecture" | "runbook" | "policy" | "cost";
}

interface RAGResponse {
  summary: string;
  context_used: string[];
  analysis: {
    architecture_insight: string;
    system_behavior: string;
    correlation: string;
  };
  root_cause: {
    reason: string;
    confidence: string;
  };
  recommended_actions: string[];
  risk_assessment: {
    impact: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  };
}

interface ContextVar { key: string; value: string }

// ─── Data ─────────────────────────────────────────────────────────────────────

const KB_CATEGORIES = [
  {
    name: "Infrastructure Topology",
    icon: <Network className="w-3.5 h-3.5" />,
    color: "text-primary",
    docs: [
      { id: "d1", name: "EKS Cluster Topology", tags: ["eks", "cluster", "networking"], lastUpdated: "2025-03-28", type: "topology" as const, category: "Infrastructure Topology" },
      { id: "d2", name: "Service Mesh Design V3", tags: ["mesh", "istio", "mTLS"], lastUpdated: "2025-03-22", type: "topology" as const, category: "Infrastructure Topology" },
      { id: "d3", name: "Multi-Region Networking", tags: ["vpc", "peering", "egress"], lastUpdated: "2025-03-15", type: "topology" as const, category: "Infrastructure Topology" },
    ],
  },
  {
    name: "Architecture Docs",
    icon: <Layers className="w-3.5 h-3.5" />,
    color: "text-violet-400",
    docs: [
      { id: "d4", name: "API Gateway Architecture V2", tags: ["gateway", "routing", "lb"], lastUpdated: "2025-03-27", type: "architecture" as const, category: "Architecture Docs" },
      { id: "d5", name: "Payment Service Design", tags: ["payment", "pci", "idempotency"], lastUpdated: "2025-03-18", type: "architecture" as const, category: "Architecture Docs" },
      { id: "d6", name: "Database Sharding Strategy", tags: ["postgres", "sharding", "replica"], lastUpdated: "2025-03-10", type: "architecture" as const, category: "Architecture Docs" },
    ],
  },
  {
    name: "Incident Runbooks",
    icon: <ScrollText className="w-3.5 h-3.5" />,
    color: "text-orange-400",
    docs: [
      { id: "d7", name: "OOMKill Response Runbook", tags: ["memory", "oomkill", "rollback"], lastUpdated: "2025-03-29", type: "runbook" as const, category: "Incident Runbooks" },
      { id: "d8", name: "Latency Spike Playbook", tags: ["latency", "p99", "throttling"], lastUpdated: "2025-03-26", type: "runbook" as const, category: "Incident Runbooks" },
      { id: "d9", name: "CrashLoop Recovery Guide", tags: ["crashloop", "configmap", "envvars"], lastUpdated: "2025-03-20", type: "runbook" as const, category: "Incident Runbooks" },
    ],
  },
  {
    name: "Security Policies",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "text-red-400",
    docs: [
      { id: "d10", name: "PodSecurityAdmission Policy", tags: ["psa", "rbac", "privileged"], lastUpdated: "2025-03-25", type: "policy" as const, category: "Security Policies" },
      { id: "d11", name: "Secret Rotation Policy", tags: ["secrets", "vault", "rotation"], lastUpdated: "2025-03-14", type: "policy" as const, category: "Security Policies" },
    ],
  },
  {
    name: "Cost Strategies",
    icon: <DollarSign className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    docs: [
      { id: "d12", name: "Spot Instance Strategy", tags: ["spot", "ec2", "savings"], lastUpdated: "2025-03-21", type: "cost" as const, category: "Cost Strategies" },
      { id: "d13", name: "Right-sizing Playbook", tags: ["rightsizing", "hpa", "vpa"], lastUpdated: "2025-03-09", type: "cost" as const, category: "Cost Strategies" },
    ],
  },
];

const ALL_DOCS: KBDocument[] = KB_CATEGORIES.flatMap((c) => c.docs);

const DEFAULT_VARS: ContextVar[] = [
  { key: "cluster_id", value: "eks-prod-us-east-1" },
  { key: "service",    value: "api-gateway" },
  { key: "env",        value: "production" },
  { key: "sla_target", value: "99.99%" },
];

const SAMPLE_QUERIES = [
  "Why is api-gateway showing elevated p99 latency after the latest deploy?",
  "What runbook applies to OOMKilled pods in the payment-service?",
  "Which architecture components are affected by a DB connection pool exhaustion?",
  "What is the rollback procedure for a failed deployment in production?",
];

const MOCK_RAG_RESPONSE: RAGResponse = {
  summary: "API Gateway latency spike is correlated with the v3.1.0 deployment 30m ago. Architecture docs confirm the gateway is a synchronous dependency for all downstream services. Runbook recommends immediate rollback.",
  context_used: [
    "API Gateway Architecture V2 — routing topology and upstream dependencies",
    "Latency Spike Playbook — p99 threshold procedures and rollback triggers",
    "EKS Cluster Topology — node allocation and pod scheduling for api-gateway",
    "Payment Service Design — synchronous call chain from gateway to payment",
  ],
  analysis: {
    architecture_insight: "API Gateway V2 is a synchronous single point of entry for 14 downstream services including payment, auth, and checkout. Latency here propagates to all consumers. Architecture doc specifies max gateway p99 of 400ms before downstream SLAs breach.",
    system_behavior: "p99 latency jumped from 490ms → 4,200ms (+757%) within 8 minutes of the v3.1.0 rollout. Error rate climbed to 12.4%. CPU usage is within normal range, ruling out resource saturation as primary cause.",
    correlation: "Deployment v3.1.0 introduced a new synchronous middleware chain (request-signing + audit-logging) with no timeout configuration. Architecture docs confirm no circuit breaker is configured on this path — latency spike propagates unbounded to all callers.",
  },
  root_cause: {
    reason: "New synchronous middleware in v3.1.0 (request-signing + audit-logging) added ~3.7s of blocking I/O per request with no timeout. No circuit breaker on the gateway→downstream path means all 14 consumers are impacted.",
    confidence: "91%",
  },
  recommended_actions: [
    "Per Latency Spike Playbook §3.1: rollback api-gateway to v3.0.9 immediately",
    "Verify rollback: p99 < 500ms, error rate < 0.5% within 3 minutes",
    "Per Architecture V2 §7: add 500ms timeout + circuit breaker to new middleware before re-deploy",
    "Per EKS Topology §4: check node memory after rollback — middleware may have leaked connections",
    "Open post-mortem: mandate load-test for synchronous middleware before any gateway release",
  ],
  risk_assessment: {
    impact: "14 downstream services degraded. Payment and checkout directly impacted. Estimated $18K/hr revenue risk. SLA currently at 87.6% (target 99.99%).",
    severity: "HIGH",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 italic mb-3">{children}</p>
);

const SeverityBadge = ({ severity }: { severity: "LOW" | "MEDIUM" | "HIGH" }) => {
  const cfg = {
    HIGH:   { cls: "text-red-400 bg-red-500/10 border-red-500/30",     dot: "bg-red-400" },
    MEDIUM: { cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-400" },
    LOW:    { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" },
  }[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest italic", cfg.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
      {severity}
    </span>
  );
};

const ConfidenceMeter = ({ value }: { value: string }) => {
  const num = parseInt(value);
  const color = num >= 85 ? "bg-emerald-400" : num >= 60 ? "bg-yellow-400" : "bg-red-400";
  const label = num >= 85 ? "text-emerald-400" : num >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div className={cn("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${num}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <span className={cn("text-[11px] font-black italic tabular-nums", label)}>{value}</span>
    </div>
  );
};

const typeIcon = (type: KBDocument["type"]) => {
  const icons = {
    topology:     <Network className="w-3.5 h-3.5" />,
    architecture: <Layers className="w-3.5 h-3.5" />,
    runbook:      <ScrollText className="w-3.5 h-3.5" />,
    policy:       <Shield className="w-3.5 h-3.5" />,
    cost:         <DollarSign className="w-3.5 h-3.5" />,
  };
  return icons[type];
};

const typeColor = (type: KBDocument["type"]) => ({
  topology:     "text-primary bg-primary/10 border-primary/20",
  architecture: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  runbook:      "text-orange-400 bg-orange-500/10 border-orange-500/20",
  policy:       "text-red-400 bg-red-500/10 border-red-500/20",
  cost:         "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
}[type]);

// ─── Main Component ───────────────────────────────────────────────────────────

interface KnowledgePanelProps {
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = () => {
  const [search, setSearch]           = useState("");
  const [activeDoc, setActiveDoc]     = useState<KBDocument | null>(null);
  const [query, setQuery]             = useState("");
  const [contextVars, setContextVars] = useState<ContextVar[]>(DEFAULT_VARS);
  const [response, setResponse]       = useState<RAGResponse | null>(null);
  const [isRunning, setIsRunning]     = useState(false);
  const [retrieving, setRetrieving]   = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(["Infrastructure Topology", "Incident Runbooks"]);

  const filteredDocs = search.trim()
    ? ALL_DOCS.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.tags.some((t) => t.includes(search.toLowerCase()))
      )
    : null;

  const toggleCat = (name: string) =>
    setExpandedCats((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);

  const updateVar = (idx: number, val: string) =>
    setContextVars((prev) => prev.map((v, i) => (i === idx ? { ...v, value: val } : v)));

  const runRAG = async () => {
    if (!query.trim()) { toast.error("Enter a query first"); return; }
    setIsRunning(true);
    setResponse(null);
    setRetrieving(true);
    await new Promise((r) => setTimeout(r, 900));
    setRetrieving(false);
    await new Promise((r) => setTimeout(r, 800));
    setResponse(MOCK_RAG_RESPONSE);
    setIsRunning(false);
    toast.success("Knowledge retrieval complete");
  };

  const copyResponse = () => {
    if (response) { navigator.clipboard.writeText(JSON.stringify(response, null, 2)); toast.success("JSON copied"); }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-700 overflow-hidden">
      <ModuleHeader
        title="Knowledge Base"
        subtitle="Retrieval-augmented infrastructure intelligence"
        actions={
          <Button onClick={() => toast.success("Document upload is available in Integrations")} className="bg-primary hover:opacity-90 shadow-glow-primary px-6 h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest italic flex items-center gap-2">
            <Plus className="w-4 h-4" />Add Document
          </Button>
        }
      />

      <div className="flex-1 flex overflow-hidden rounded-3xl border border-border-subtle bg-background-secondary/30 backdrop-blur-sm shadow-inner-light m-6 mt-0 min-h-0">

        {/* ── Left: Knowledge Tree ──────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-border-subtle/30 bg-card/60 flex flex-col overflow-hidden shadow-[inset_-1px_0_0_0_hsl(var(--foreground)/0.04)]">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted border border-border shadow-sm">
                  <Library className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-[0.2em] italic">Knowledge Tree</span>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest italic opacity-60">{ALL_DOCS.length} documents indexed</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg bg-muted/80 border border-border hover:bg-primary/5 hover:text-primary">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {/* Search */}
            <div className="relative group">
              <ScanSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Semantic search…"
                className="w-full h-9 bg-muted/50 border border-border rounded-xl pl-9 pr-3 text-[11px] font-bold text-foreground outline-none focus:border-primary/40 transition-all italic placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Tree or search results */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-2">
            {filteredDocs ? (
              <>
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 italic px-2 mb-3">
                  {filteredDocs.length} results for "{search}"
                </p>
                {filteredDocs.map((doc) => (
                  <DocItem key={doc.id} doc={doc} active={activeDoc?.id === doc.id} onClick={() => setActiveDoc(doc)} />
                ))}
              </>
            ) : (
              KB_CATEGORIES.map((cat) => {
                const isOpen = expandedCats.includes(cat.name);
                return (
                  <div key={cat.name}>
                    <button
                      onClick={() => toggleCat(cat.name)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-all group"
                    >
                      <ChevronRight className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", isOpen && "rotate-90")} />
                      <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] italic flex-1 text-left", cat.color)}>{cat.name}</span>
                      <span className="text-[8px] font-black text-muted-foreground/30 italic">{cat.docs.length}</span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden ml-3 space-y-1 mt-1">
                          {cat.docs.map((doc) => (
                            <DocItem key={doc.id} doc={doc} active={activeDoc?.id === doc.id} onClick={() => setActiveDoc(doc)} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Center: RAG Query Interface ───────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border-subtle/30">
          <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">

            {/* Context vars */}
            <div className="shrink-0">
              <SectionLabel>Context Variables</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {contextVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border hover:border-primary/20 transition-all">
                    <span className="text-[9px] font-mono font-black text-primary italic shrink-0">{`{{${v.key}}}`}</span>
                    <input
                      value={v.value}
                      onChange={(e) => updateVar(i, e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-[10px] font-bold italic text-foreground/80 outline-none border-b border-transparent focus:border-primary/30 transition-colors pb-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Query area */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <SectionLabel>RAG Query</SectionLabel>
              <div className="relative flex-1 min-h-0 group">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={"Ask a grounded question about your infrastructure…\n\nExamples:\n• Why is latency spiking after the latest deploy?\n• What runbook applies to OOMKilled pods?\n• Which components are at risk from DB pool exhaustion?"}
                  className="w-full h-full bg-card border border-border-subtle rounded-2xl p-5 font-mono text-[12px] leading-relaxed text-foreground/80 outline-none focus:border-primary/30 transition-all shadow-lg resize-none custom-scrollbar placeholder:text-muted-foreground/25 placeholder:italic placeholder:font-normal"
                />
              </div>

              {/* Quick queries */}
              <div className="shrink-0 space-y-2">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">Quick queries</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(q)}
                      className="text-[9px] font-bold italic text-muted-foreground/60 hover:text-primary border border-border/50 hover:border-primary/30 px-2.5 py-1.5 rounded-lg bg-muted/30 hover:bg-primary/5 transition-all max-w-[200px] text-left leading-tight truncate"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active doc info */}
            {activeDoc && (
              <div className="shrink-0 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg border", typeColor(activeDoc.type))}>
                  {typeIcon(activeDoc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black italic text-foreground/80 truncate">{activeDoc.name}</p>
                  <p className="text-[8px] font-bold italic text-muted-foreground/50 uppercase tracking-widest">Pinned as primary context</p>
                </div>
                <button onClick={() => setActiveDoc(null)} className="text-muted-foreground/30 hover:text-foreground text-sm font-black">×</button>
              </div>
            )}

            <Button onClick={runRAG} disabled={isRunning}
              className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-[10px] tracking-[0.25em] italic shadow-lg shadow-primary/20 rounded-2xl transition-all active:scale-[0.98] shrink-0">
              {isRunning ? (
                <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2" />
                  {retrieving ? "Retrieving Context…" : "Generating Analysis…"}</>
              ) : (
                <><ScanSearch className="w-4 h-4 mr-2" />Retrieve & Analyze</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: RAG Response ───────────────────────────────────────── */}
        <div className="w-[420px] shrink-0 flex flex-col min-h-0 bg-muted/10">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-foreground/60">Intelligence Output</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 italic mt-0.5">Grounded · No hallucinations</p>
            </div>
            <div className="flex items-center gap-2">
              {response && (
                <button onClick={copyResponse} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest italic text-muted-foreground/40 hover:text-primary transition-colors">
                  <Copy className="w-3 h-3" />JSON
                </button>
              )}
              {response && (
                <button onClick={() => setResponse(null)} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest italic text-muted-foreground/40 hover:text-foreground transition-colors">
                  <RotateCcw className="w-3 h-3" />Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">
            <AnimatePresence mode="wait">
              {isRunning && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 gap-5">
                  <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full" />
                    <Brain className="w-5 h-5 text-primary absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-muted-foreground/50">
                      {retrieving ? "Semantic retrieval…" : "Grounded reasoning…"}
                    </p>
                    <p className="text-[9px] italic text-muted-foreground/30">
                      {retrieving ? "Searching knowledge base" : "Correlating architecture + runbooks"}
                    </p>
                  </div>
                </motion.div>
              )}

              {!isRunning && !response && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground/15" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-muted-foreground/25">Awaiting query</p>
                  <p className="text-[9px] text-muted-foreground/20 italic leading-relaxed max-w-[200px]">Enter a question and retrieve grounded infrastructure intelligence</p>
                </motion.div>
              )}

              {!isRunning && response && (
                <motion.div key="response" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

                  {/* Summary */}
                  <div className="p-4 rounded-2xl bg-card border border-border-subtle space-y-2">
                    <SectionLabel>Summary</SectionLabel>
                    <p className="text-[12px] font-bold italic text-foreground/90 leading-relaxed">{response.summary}</p>
                  </div>

                  {/* Context used */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-3">
                    <div className="flex items-center gap-2">
                      <ScanSearch className="w-3.5 h-3.5 text-primary" />
                      <SectionLabel>Context Retrieved</SectionLabel>
                    </div>
                    <div className="space-y-2">
                      {response.context_used.map((src, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                          <FileText className="w-3 h-3 text-primary/50 shrink-0 mt-0.5" />
                          <span className="text-[10px] italic text-muted-foreground/80 leading-snug">{src}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className="p-4 rounded-2xl bg-card border border-border-subtle space-y-4">
                    <SectionLabel>Analysis</SectionLabel>
                    {[
                      { label: "Architecture Insight", value: response.analysis.architecture_insight, color: "text-violet-400", icon: <Layers className="w-3 h-3" /> },
                      { label: "System Behavior",      value: response.analysis.system_behavior,      color: "text-primary",    icon: <Activity className="w-3 h-3" /> },
                      { label: "Correlation",          value: response.analysis.correlation,          color: "text-orange-400", icon: <GitBranch className="w-3 h-3" /> },
                    ].map((a, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] italic", a.color)}>
                          {a.icon}{a.label}
                        </div>
                        <p className="text-[11px] italic text-muted-foreground/80 leading-relaxed pl-4 border-l border-border">{a.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Root cause */}
                  <div className="p-4 rounded-2xl bg-card border border-border-subtle space-y-3">
                    <SectionLabel>Root Cause</SectionLabel>
                    <p className="text-[12px] font-bold italic text-foreground/90 leading-relaxed">{response.root_cause.reason}</p>
                    <ConfidenceMeter value={response.root_cause.confidence} />
                  </div>

                  {/* Actions */}
                  <div className="p-4 rounded-2xl bg-card border border-border-subtle space-y-3">
                    <SectionLabel>Recommended Actions (Runbook-Based)</SectionLabel>
                    <div className="space-y-2">
                      {response.recommended_actions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 text-primary text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-[11px] italic text-foreground/80 leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk assessment */}
                  <div className={cn("p-4 rounded-2xl border space-y-3",
                    response.risk_assessment.severity === "HIGH"   ? "bg-red-500/5 border-red-500/20" :
                    response.risk_assessment.severity === "MEDIUM" ? "bg-yellow-500/5 border-yellow-500/20" :
                                                                     "bg-emerald-500/5 border-emerald-500/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <SectionLabel>Risk Assessment</SectionLabel>
                      <SeverityBadge severity={response.risk_assessment.severity} />
                    </div>
                    <p className="text-[11px] italic text-muted-foreground/80 leading-relaxed">{response.risk_assessment.impact}</p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

// Small inline component used inside the tree
const Activity = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const DocItem = ({ doc, active, onClick }: { doc: KBDocument; active: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border",
      active
        ? "bg-primary/10 border-primary/30 text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/50"
    )}
  >
    <div className={cn("p-1 rounded-md border shrink-0", active ? "bg-primary/20 border-primary/30 text-primary" : typeColor(doc.type))}>
      {typeIcon(doc.type)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black italic truncate">{doc.name}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {doc.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[8px] font-bold italic text-muted-foreground/40">#{t}</span>
        ))}
      </div>
    </div>
    {active && <ArrowUpRight className="w-3 h-3 shrink-0" />}
  </div>
);

export default KnowledgePanel;
