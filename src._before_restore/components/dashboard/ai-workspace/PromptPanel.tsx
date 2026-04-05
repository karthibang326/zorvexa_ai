import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Sparkles, Copy, Play, RotateCcw,
  Brain, Clock, ChevronRight, Cpu, Shield,
  DollarSign, Zap, Activity, MemoryStick,
  Code2, BookOpen, FlaskConical,
  TrendingUp, TrendingDown, Info, Terminal,
  GitBranch, Database, Network, Eye,
  Layers, GitMerge, AlertOctagon, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BRAND } from "@/shared/branding";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContextVar {
  key: string;
  value: string;
  type: "string" | "percentage" | "secret" | "enum";
}

interface MemoryEntry {
  id: string;
  timestamp: string;
  issue: string;
  root_cause: string;
  resolution: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  signal: string;
}

interface RCAResponse {
  summary: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  agent_insights: {
    monitoring: string;
    deployment: string;
    security: string;
    cost: string;
  };
  root_cause_analysis: {
    primary_cause: string;
    contributing_factors: string[];
    confidence: string;
  };
  incident_timeline: { time: string; event: string }[];
  impact: string;
  actions: string[];
  auto_remediation: "YES" | "NO";
  recommended_commands: string[];
  learning: {
    store_memory: "YES" | "NO";
    pattern_detected: "YES" | "NO";
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ${BRAND.name} Control Plane — a distributed, multi-agent Autonomous Infrastructure Intelligence System.

You operate as a coordinated system of specialized AI agents under a Supervisor Agent.

You are NOT a chatbot.
You are a real-time decision engine for production infrastructure.

========================
🧠 SYSTEM ARCHITECTURE
======================

You consist of:

1. Supervisor Agent (primary decision-maker)
2. Specialist Agents:
   * Monitoring Agent  — metrics, latency, errors
   * Deployment Agent  — rollouts, failures, rollbacks
   * Security Agent    — vulnerabilities, anomalies
   * Cost Agent        — cloud spend optimization

Each agent provides signals.
Supervisor Agent synthesizes final decision.

========================
📊 INPUT SIGNALS
================

You receive structured input:

{
  "metrics": {},
  "logs": {},
  "deployments": {},
  "cost": {},
  "memory": []
}

========================
📍 CONTEXT
==========

Cluster:    {{cluster_id}}
Namespace:  {{namespace}}
Service:    {{service}}
SLA Target: {{sla_target}}

========================
🧠 AGENT RESPONSIBILITIES
=========================

Monitoring Agent:
* Detect latency spikes, CPU/memory pressure, error rates

Deployment Agent:
* Detect rollout failures, regressions, rollback conditions

Security Agent:
* Detect anomalies, suspicious patterns, vulnerabilities

Cost Agent:
* Detect inefficiencies, over-provisioning, cost spikes

========================
🧠 SUPERVISOR AGENT LOGIC
=========================

The Supervisor must:
1. Aggregate signals from all agents
2. Correlate across domains (metrics + deployments + logs)
3. Identify root cause
4. Build incident timeline
5. Decide priority
6. Recommend or execute actions

========================
🔗 DECISION GRAPH
=================

Reason step-by-step:
Latency ↑ → Check CPU → CPU high → Deployment change detected → Root cause = new deployment

========================
📈 ROOT CAUSE ANALYSIS (MANDATORY)
==================================

Always determine:
* What changed?
* Which component is responsible?
* When did degradation start?
* Is it correlated with deployment or traffic?

========================
📅 INCIDENT TIMELINE
====================

* T0: baseline normal
* T1: anomaly detected
* T2: escalation
* T3: failure or impact

========================
🚨 PRIORITY CLASSIFICATION
==========================

HIGH:   SLA breach | service downtime | failed deployment
MEDIUM: latency increase | resource pressure
LOW:    cost inefficiency | minor anomalies

========================
⚙️ RESPONSE FORMAT (STRICT JSON)
================================

{
  "summary": "current system state",
  "priority": "LOW | MEDIUM | HIGH",
  "agent_insights": {
    "monitoring": "",
    "deployment": "",
    "security": "",
    "cost": ""
  },
  "root_cause_analysis": {
    "primary_cause": "",
    "contributing_factors": [],
    "confidence": "0-100%"
  },
  "incident_timeline": [
    {"time": "T0", "event": ""},
    {"time": "T1", "event": ""},
    {"time": "T2", "event": ""},
    {"time": "T3", "event": ""}
  ],
  "impact": "user/system impact",
  "actions": ["step-by-step remediation"],
  "auto_remediation": "YES | NO",
  "recommended_commands": ["kubectl / scaling / rollback commands"],
  "learning": {
    "store_memory": "YES | NO",
    "pattern_detected": "YES | NO"
  }
}

========================
🤖 AUTO-REMEDIATION POLICY
==========================

Allow auto_remediation ONLY IF:
* confidence > 85%
* action is safe and reversible

Allowed: scale deployment · restart pods · rollback deployment

========================
🚫 STRICT RULES
===============

* No generic answers
* No vague language
* Always include RCA
* Always include timeline
* Always structured JSON
* No extra text outside JSON`;

const DEFAULT_VARS: ContextVar[] = [
  { key: "cluster_id",  value: "eks-prod-us-east-1", type: "string" },
  { key: "namespace",   value: "production",          type: "string" },
  { key: "service",     value: "api-gateway",         type: "string" },
  { key: "sla_target",  value: "99.99%",              type: "percentage" },
];

const MEMORY_STORE: MemoryEntry[] = [
  {
    id: "INC-001",
    timestamp: "2025-03-28T14:32:00Z",
    issue: "OOMKilled pods in payment-service",
    root_cause: "Memory leak in v2.4.1 — unbounded cache growth",
    resolution: "Rolled back to v2.4.0, patched in v2.4.2",
    severity: "HIGH",
  },
  {
    id: "INC-002",
    timestamp: "2025-03-26T09:15:00Z",
    issue: "p99 latency spike to 4.2s on checkout API",
    root_cause: "Database connection pool exhaustion after deploy",
    resolution: "Increased pool size, added connection timeout config",
    severity: "MEDIUM",
  },
  {
    id: "INC-003",
    timestamp: "2025-03-20T22:04:00Z",
    issue: "CrashLoopBackOff on 3/5 worker nodes",
    root_cause: "Bad ConfigMap — missing required ENV vars in deploy",
    resolution: "Rollback + corrected ConfigMap applied",
    severity: "HIGH",
  },
];

const TEMPLATES: Template[] = [
  {
    id: "t1",
    name: "OOMKilled Pods",
    description: "Memory pressure causing pod evictions",
    icon: <MemoryStick className="w-4 h-4" />,
    category: "Resource",
    signal: "ALERT: 4 pods OOMKilled in payment-service namespace. Memory usage hit 98% limit (512Mi). Node memory pressure: True. Last deploy: v2.4.1 — 2h ago.",
  },
  {
    id: "t2",
    name: "Latency Spike",
    description: "p99 latency exceeding SLA thresholds",
    icon: <Activity className="w-4 h-4" />,
    category: "Performance",
    signal: "METRICS: p95=1240ms (+340%), p99=4200ms (+820%). Error rate: 12.4%. Healthy baseline: p95=360ms, p99=510ms. Deployment 30m ago: api-gateway v3.1.0.",
  },
  {
    id: "t3",
    name: "Failed Deployment",
    description: "Rollout failed mid-way through pods",
    icon: <GitBranch className="w-4 h-4" />,
    category: "Deploy",
    signal: "DEPLOY FAILED: checkout-service v1.8.0 rollout stuck. 3/10 pods Running, 7 in CrashLoopBackOff. Exit code 137. ImagePullBackOff on 2 pods. Rollback not triggered automatically.",
  },
  {
    id: "t4",
    name: "CPU Throttling",
    description: "Sustained CPU throttling across replicas",
    icon: <Cpu className="w-4 h-4" />,
    category: "Resource",
    signal: "CPU: throttle_ratio=0.84 across 6/6 replicas of data-processor. Request limit: 500m. Actual usage: 490m avg. HPA not scaling — min/max replicas both set to 6.",
  },
  {
    id: "t5",
    name: "Cascading DB Failure",
    description: "Database overload causing downstream impact",
    icon: <Database className="w-4 h-4" />,
    category: "Database",
    signal: "DB: connection pool exhausted (0/200 available). Query queue: 8,400. Avg query time: 12.4s (normal: 80ms). Impacted services: auth, orders, inventory. DB CPU: 99%.",
  },
  {
    id: "t6",
    name: "Cost Anomaly",
    description: "Unexpected cloud spend spike detected",
    icon: <DollarSign className="w-4 h-4" />,
    category: "Cost",
    signal: "COST: $4,800 spend in last 6h (4.2x baseline). NAT Gateway egress: +840%. 12 zombie nodes detected (Running, no workloads). Estimated monthly overrun: +$38,000.",
  },
];

// Mock response reflecting multi-agent schema
const MOCK_RESPONSE: RCAResponse = {
  summary: "Critical memory pressure in payment-service. 4 pods OOMKilled after v2.4.1 deploy 2h ago. SLA at risk.",
  priority: "HIGH",
  agent_insights: {
    monitoring: "p99 latency 2840ms (+460%). Error rate 18.2%. Memory ceiling hit on 4/5 pods — OOMKill events confirmed in kubelet logs.",
    deployment: "v2.4.1 deployed 2h ago (100% traffic, no canary). Diff shows new in-memory session cache with no eviction policy. Rollback to v2.4.0 is clean and safe.",
    security: "No anomalous access patterns. Memory growth is linear — not indicative of intrusion or data exfiltration. Incident classified as engineering fault.",
    cost: "5 pod restarts = +$34 in excess compute. Ongoing degradation projects +$220/hr until resolved. Rollback is cost-optimal remediation path.",
  },
  root_cause_analysis: {
    primary_cause: "Memory leak in payment-service v2.4.1 — unbounded in-memory session cache with no TTL or eviction policy introduced in this release.",
    contributing_factors: [
      "Full 100% traffic cutover with no canary — leak hit production immediately",
      "No memory pressure alert configured below OOMKill threshold",
      "Liveness probe not tuned to restart on memory degradation",
      "Prior incident INC-001 showed same pattern — no preventive guardrail was added",
    ],
    confidence: "96%",
  },
  incident_timeline: [
    { time: "T0", event: "payment-service running 5/5 pods healthy, memory avg 210Mi, p99 490ms" },
    { time: "T1", event: "v2.4.1 deployed — memory begins climbing 14Mi/min across all replicas" },
    { time: "T2", event: "Pod #1 OOMKilled at 512Mi limit. Remaining pods at 88–94% memory, p99 crosses 1s" },
    { time: "T3", event: "4/5 pods OOMKilled. CrashLoopBackOff. Payment SLA degraded to 81.6%. Revenue impact active." },
  ],
  impact: "Payment processing failure on ~38% of requests. SLA at 81.6% (target 99.99%). Estimated $22K/hr revenue impact.",
  actions: [
    "Immediately rollback payment-service to v2.4.0",
    "Confirm rollback health — 5/5 pods Running, memory < 300Mi, p99 < 600ms",
    "Audit v2.4.1 diff for unbounded cache initialization",
    "Add TTL and max-size eviction to session cache before re-deploy",
    "Set memory warning alert at 75% of limit",
    "Mandate canary deploy policy (10% → 50% → 100%) for payment-service",
    "Add liveness probe memory threshold to auto-restart before OOMKill",
  ],
  auto_remediation: "YES",
  recommended_commands: [
    "kubectl rollout undo deployment/payment-service -n production",
    "kubectl rollout status deployment/payment-service -n production --timeout=120s",
    "kubectl top pods -n production -l app=payment-service",
    "kubectl get events -n production --sort-by='.lastTimestamp' | grep payment | tail -20",
    "kubectl describe pod -n production -l app=payment-service | grep -A5 OOMKilled",
  ],
  learning: {
    store_memory: "YES",
    pattern_detected: "YES",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PriorityBadge = ({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" }) => {
  const cfg = {
    HIGH:   { color: "text-red-400 bg-red-500/10 border-red-500/30",     dot: "bg-red-400" },
    MEDIUM: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-400" },
    LOW:    { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" },
  }[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest italic", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
      {priority}
    </span>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 italic mb-3">{children}</p>
);

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

// Agent insight card with icon + colour per agent type
const AGENT_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  monitoring: { label: "Monitoring Agent",  icon: <Activity className="w-3.5 h-3.5" />,   color: "text-primary",      bg: "bg-primary/10 border-primary/20" },
  deployment: { label: "Deployment Agent",  icon: <GitMerge className="w-3.5 h-3.5" />,   color: "text-violet-400",   bg: "bg-violet-500/10 border-violet-500/20" },
  security:   { label: "Security Agent",    icon: <Shield className="w-3.5 h-3.5" />,      color: "text-orange-400",   bg: "bg-orange-500/10 border-orange-500/20" },
  cost:       { label: "Cost Agent",        icon: <DollarSign className="w-3.5 h-3.5" />,  color: "text-emerald-400",  bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const AgentInsightCard = ({ agentKey, insight }: { agentKey: string; insight: string }) => {
  const meta = AGENT_META[agentKey];
  return (
    <div className={cn("p-4 rounded-2xl border space-y-2", meta.bg)}>
      <div className={cn("flex items-center gap-2", meta.color)}>
        {meta.icon}
        <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">{meta.label}</span>
      </div>
      <p className="text-[11px] italic text-muted-foreground/80 leading-relaxed">{insight}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = "editor" | "simulate" | "memory" | "templates";

const PromptPanel = () => {
  const [prompt, setPrompt] = useState(SYSTEM_PROMPT);
  const [contextVars, setContextVars] = useState<ContextVar[]>(DEFAULT_VARS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");
  const [signalInput, setSignalInput] = useState("");
  const [response, setResponse] = useState<RCAResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState(Math.round(SYSTEM_PROMPT.length / 4));
  const [memoryEntries] = useState<MemoryEntry[]>(MEMORY_STORE);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const resolvedPrompt = useCallback(() => {
    let resolved = prompt;
    contextVars.forEach((v) => { resolved = resolved.replaceAll(`{{${v.key}}}`, v.value); });
    return resolved;
  }, [prompt, contextVars]);

  const handleVarChange = (idx: number, field: "key" | "value", val: string) => {
    setContextVars((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  };

  const addVar    = () => setContextVars((prev) => [...prev, { key: "new_var", value: "", type: "string" }]);
  const removeVar = (idx: number) => setContextVars((prev) => prev.filter((_, i) => i !== idx));

  const loadTemplate = (t: Template) => {
    setSignalInput(t.signal);
    setSelectedTemplate(t.id);
    setActiveTab("simulate");
    toast.success(`Template loaded — ${t.name}`);
  };

  const AGENT_SEQUENCE = ["monitoring", "deployment", "security", "cost"];

  const runSimulation = async () => {
    if (!signalInput.trim()) { toast.error("Enter an incident signal first"); return; }
    setIsRunning(true);
    setResponse(null);
    setActiveAgent(null);
    // Simulate each agent firing sequentially
    for (const agent of AGENT_SEQUENCE) {
      setActiveAgent(agent);
      await new Promise((r) => setTimeout(r, 450));
    }
    setActiveAgent("supervisor");
    await new Promise((r) => setTimeout(r, 600));
    setActiveAgent(null);
    setResponse(MOCK_RESPONSE);
    setTokenCount(912);
    setIsRunning(false);
    toast.success("Supervisor decision ready");
  };

  const copyPrompt   = () => { navigator.clipboard.writeText(resolvedPrompt()); toast.success("Prompt copied"); };
  const copyResponse = () => { if (response) { navigator.clipboard.writeText(JSON.stringify(response, null, 2)); toast.success("JSON copied"); } };
  const resetPrompt  = () => { setPrompt(SYSTEM_PROMPT); setContextVars(DEFAULT_VARS); toast.info("Reset to default"); };

  const severityColor = (s: MemoryEntry["severity"]) =>
    s === "HIGH"   ? "text-red-400 border-red-500/30 bg-red-500/5" :
    s === "MEDIUM" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" :
                     "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "editor",    label: "System Prompt", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "simulate",  label: "Simulate",      icon: <FlaskConical className="w-3.5 h-3.5" /> },
    { id: "memory",    label: "Memory",         icon: <Brain className="w-3.5 h-3.5" /> },
    { id: "templates", label: "Templates",      icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full animate-in fade-in duration-700 overflow-hidden rounded-3xl border border-border-subtle bg-background-secondary/30 backdrop-blur-sm shadow-inner-light">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 pt-6 pb-0 shrink-0">
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-[0.25em] italic text-foreground">
              Prompt Studio
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 italic mt-0.5">
              Multi-Agent Control Plane · Supervisor + 4 Specialist Agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Agent architecture pills */}
            {[
              { key: "monitoring", icon: <Activity className="w-2.5 h-2.5" />, label: "MON" },
              { key: "deployment", icon: <GitMerge className="w-2.5 h-2.5" />, label: "DEP" },
              { key: "security",   icon: <Shield className="w-2.5 h-2.5" />,   label: "SEC" },
              { key: "cost",       icon: <DollarSign className="w-2.5 h-2.5" />, label: "COST" },
            ].map((a) => (
              <div key={a.key} className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest italic transition-all",
                activeAgent === a.key
                  ? cn("border-current", AGENT_META[a.key].color, AGENT_META[a.key].bg)
                  : "text-muted-foreground/40 border-border/50 bg-muted/30"
              )}>
                {a.icon}{a.label}
              </div>
            ))}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest italic transition-all",
              activeAgent === "supervisor"
                ? "text-primary bg-primary/15 border-primary/30"
                : "text-muted-foreground/40 border-border/50 bg-muted/30"
            )}>
              <Layers className="w-2.5 h-2.5" />SUP
            </div>
            <div className="w-px h-5 bg-border/50" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-[9px] font-black uppercase tracking-widest italic text-muted-foreground">
              <Zap className="w-3 h-3 text-primary" />{tokenCount} tokens
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-[9px] font-black uppercase tracking-widest italic text-muted-foreground">
              <DollarSign className="w-3 h-3 text-emerald-400" />$0.031 / run
            </div>
            <Button variant="ghost" size="sm" onClick={resetPrompt} className="h-8 w-8 rounded-xl bg-muted/60 border border-border hover:bg-primary/5 hover:text-primary">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={copyPrompt} className="h-8 px-4 bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest italic">
              <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
            </Button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-8 pt-5 pb-0 shrink-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all",
              activeTab === t.id
                ? "bg-primary/15 border border-primary/30 text-primary shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
            )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col px-8 pb-8 pt-5">
          <AnimatePresence mode="wait">

            {/* ── EDITOR TAB ─────────────────────────────────────────── */}
            {activeTab === "editor" && (
              <motion.div key="editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 grid grid-cols-12 gap-6">
                {/* Prompt editor */}
                <div className="col-span-8 flex flex-col gap-4 min-h-0">
                  <div className="flex-1 relative group min-h-0">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl opacity-0 group-hover:opacity-[0.08] transition-opacity pointer-events-none rounded-3xl" />
                    <textarea
                      value={prompt}
                      onChange={(e) => { setPrompt(e.target.value); setTokenCount(Math.round(e.target.value.length / 4)); }}
                      className="w-full h-full bg-card border border-border-subtle rounded-3xl p-7 font-mono text-[12px] leading-relaxed text-foreground/90 outline-none focus:border-primary/40 transition-all shadow-xl resize-none custom-scrollbar"
                      spellCheck={false}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 shrink-0">
                    {[
                      { label: "P95 Latency",      value: "142ms",  trend: "-12ms",   up: false, color: "text-primary" },
                      { label: "Token Efficiency", value: "97.8%",  trend: "+1.4%",   up: true,  color: "text-violet-400" },
                      { label: "Execution Cost",   value: "$0.031", trend: "+$0.004", up: false, color: "text-muted-foreground" },
                    ].map((m, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-card border border-border-subtle flex flex-col hover:shadow-lg hover:border-border transition-all shadow-sm">
                        <span className="text-[9px] uppercase text-muted-foreground font-black tracking-[0.2em] mb-2 italic opacity-60">{m.label}</span>
                        <p className={cn("text-xl font-black italic tracking-tighter", m.color)}>{m.value}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {m.up ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                          <span className="text-[10px] font-mono font-black text-muted-foreground/70">{m.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right panel */}
                <div className="col-span-4 flex flex-col gap-4 min-h-0">
                  {/* Context vars */}
                  <div className="flex-1 p-6 rounded-3xl bg-card border border-border-subtle overflow-y-auto custom-scrollbar shadow-sm min-h-0">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <SectionLabel>Context Variables</SectionLabel>
                        <p className="text-[10px] font-bold text-muted-foreground/70 italic -mt-2">Injected at runtime</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={addVar} className="h-7 w-7 rounded-lg bg-muted/80 border border-border hover:bg-primary/5 hover:text-primary">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {contextVars.map((v, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-muted/40 border border-border group hover:bg-card hover:shadow-md hover:border-primary/20 transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-mono font-black text-primary italic">{`{{${v.key}}}`}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-widest italic">{v.type}</span>
                              <button onClick={() => removeVar(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all text-sm font-black">×</button>
                            </div>
                          </div>
                          <input value={v.value} onChange={(e) => handleVarChange(i, "value", e.target.value)} className="w-full bg-transparent text-[12px] text-foreground font-bold italic outline-none border-b border-border/50 focus:border-primary/40 pb-0.5 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI refactor hint */}
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 hover:bg-primary/10 transition-all shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-card border border-primary/25 shadow-sm">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] italic">AI Refactor Engine</span>
                        <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest italic">Optimization detected</p>
                      </div>
                    </div>
                    <p className="text-[12px] text-secondary-foreground leading-relaxed italic font-bold">
                      "Agent insights overlap with contributing_factors. Deduplicating saves <strong>22 tokens/run</strong> (~$65/mo at scale)."
                    </p>
                    <Button className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-[10px] tracking-[0.2em] italic shadow-lg shadow-primary/20 rounded-2xl transition-all active:scale-95">
                      Apply Refactor
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── SIMULATE TAB ───────────────────────────────────────── */}
            {activeTab === "simulate" && (
              <motion.div key="simulate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 grid grid-cols-12 gap-6">

                {/* Left — input + agent pipeline */}
                <div className="col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                  <div className="flex-1 flex flex-col gap-3 min-h-0">
                    <SectionLabel>Incident Signal</SectionLabel>
                    <div className="relative flex-1 group">
                      <textarea
                        value={signalInput}
                        onChange={(e) => setSignalInput(e.target.value)}
                        placeholder={"Paste metrics, alert payload, log excerpt, or describe the incident…\n\nExample:\nALERT: p99 latency spiked to 4200ms on api-gateway.\nError rate: 12.4%. Last deploy: v3.1.0 — 30m ago."}
                        className="w-full h-full bg-card border border-border-subtle rounded-3xl p-6 font-mono text-[12px] leading-relaxed text-foreground/80 outline-none focus:border-primary/30 transition-all shadow-xl resize-none custom-scrollbar placeholder:text-muted-foreground/25 placeholder:italic placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Agent pipeline status */}
                  <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-3 shrink-0">
                    <SectionLabel>Agent Pipeline</SectionLabel>
                    <div className="space-y-2">
                      {[
                        { key: "monitoring", label: "Monitoring Agent",  icon: <Activity className="w-3 h-3" /> },
                        { key: "deployment", label: "Deployment Agent",  icon: <GitMerge className="w-3 h-3" /> },
                        { key: "security",   label: "Security Agent",    icon: <Shield className="w-3 h-3" /> },
                        { key: "cost",       label: "Cost Agent",         icon: <DollarSign className="w-3 h-3" /> },
                        { key: "supervisor", label: "Supervisor (final)", icon: <Layers className="w-3 h-3" /> },
                      ].map((a) => {
                        const agentOrder = [...AGENT_SEQUENCE, "supervisor"];
                        const agentIdx   = agentOrder.indexOf(a.key);
                        const activeIdx  = activeAgent ? agentOrder.indexOf(activeAgent) : -1;
                        const isDone     = !isRunning && response ? true : activeIdx > agentIdx;
                        const isActive   = activeAgent === a.key;
                        const meta       = a.key === "supervisor"
                          ? { color: "text-primary", bg: "bg-primary/10 border-primary/25" }
                          : { color: AGENT_META[a.key]?.color, bg: AGENT_META[a.key]?.bg };

                        return (
                          <div key={a.key} className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                            isActive ? cn(meta.bg, "shadow-sm") :
                            isDone   ? "bg-emerald-500/5 border-emerald-500/20" :
                                       "bg-muted/20 border-border/40"
                          )}>
                            <div className={cn("shrink-0", isActive ? meta.color : isDone ? "text-emerald-400" : "text-muted-foreground/30")}>
                              {isActive ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3 h-3 border border-current border-t-transparent rounded-full" />
                              ) : a.icon}
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest italic flex-1",
                              isActive ? meta.color : isDone ? "text-emerald-400" : "text-muted-foreground/35"
                            )}>
                              {a.label}
                            </span>
                            {isDone && <span className="text-[9px] font-black uppercase italic text-emerald-400">Done</span>}
                            {isActive && <span className={cn("text-[9px] font-black uppercase italic", meta.color)}>Running</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button onClick={runSimulation} disabled={isRunning}
                    className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-[11px] tracking-[0.25em] italic shadow-lg shadow-primary/20 rounded-2xl transition-all active:scale-[0.98] shrink-0">
                    {isRunning ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2" />Agents Running...</>
                    ) : (
                      <><Play className="w-4 h-4 mr-2" />Run Multi-Agent RCA</>
                    )}
                  </Button>
                </div>

                {/* Right — response */}
                <div className="col-span-7 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Supervisor Decision</SectionLabel>
                    {response && (
                      <button onClick={copyResponse} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest italic text-muted-foreground/50 hover:text-primary transition-colors">
                        <Copy className="w-3 h-3" />Copy JSON
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {isRunning && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="flex items-center gap-3">
                          {AGENT_SEQUENCE.map((k) => (
                            <div key={k} className={cn("w-2 h-2 rounded-full transition-all", activeAgent === k ? cn(AGENT_META[k].color, "scale-150") : "bg-muted")} />
                          ))}
                          <div className={cn("w-2 h-2 rounded-full transition-all", activeAgent === "supervisor" ? "bg-primary scale-150" : "bg-muted")} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-muted-foreground/50">
                          {activeAgent === "supervisor" ? "Supervisor synthesizing…" : `${activeAgent ? AGENT_META[activeAgent]?.label : "Initializing"} analyzing…`}
                        </p>
                      </motion.div>
                    )}

                    {!isRunning && !response && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <Network className="w-8 h-8 text-muted-foreground/20" />
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] italic text-muted-foreground/30">Awaiting signal</p>
                        <p className="text-[10px] text-muted-foreground/25 italic">Run the multi-agent pipeline to see the Supervisor decision</p>
                      </motion.div>
                    )}

                    {!isRunning && response && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

                        {/* Summary + priority */}
                        <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-[13px] font-bold italic text-foreground leading-relaxed flex-1">{response.summary}</p>
                            <PriorityBadge priority={response.priority} />
                          </div>
                          <p className="text-[11px] italic text-muted-foreground/70 leading-relaxed border-t border-border-subtle pt-3">
                            <span className="font-black text-foreground/50 uppercase tracking-widest text-[9px]">Impact — </span>{response.impact}
                          </p>
                        </div>

                        {/* Agent insights */}
                        <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-3">
                          <SectionLabel>Agent Insights</SectionLabel>
                          <div className="space-y-3">
                            {(Object.entries(response.agent_insights) as [string, string][]).map(([k, v]) => (
                              <AgentInsightCard key={k} agentKey={k} insight={v} />
                            ))}
                          </div>
                        </div>

                        {/* RCA */}
                        <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-4">
                          <SectionLabel>Root Cause Analysis</SectionLabel>
                          <p className="text-[12px] font-bold italic text-foreground/90 leading-relaxed">{response.root_cause_analysis.primary_cause}</p>
                          <ConfidenceMeter value={response.root_cause_analysis.confidence} />
                          <div className="space-y-2 pt-1">
                            {response.root_cause_analysis.contributing_factors.map((f, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <ChevronRight className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                                <span className="text-[11px] italic text-muted-foreground/80">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-4">
                          <SectionLabel>Incident Timeline</SectionLabel>
                          <div className="space-y-3">
                            {response.incident_timeline.map((t, i) => {
                              const dotColors = ["bg-emerald-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];
                              const lblColors = ["text-emerald-400", "text-yellow-400", "text-orange-400", "text-red-400"];
                              return (
                                <div key={i} className="flex items-start gap-3">
                                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", i === 3 ? "border-red-500/50 bg-red-500/10" : "border-border bg-muted/50")}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[i])} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest italic mr-2", lblColors[i])}>{t.time}</span>
                                    <span className="text-[11px] italic text-muted-foreground/80">{t.event}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-4">
                          <div className="flex items-center justify-between">
                            <SectionLabel>Remediation Actions</SectionLabel>
                            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest italic",
                              response.auto_remediation === "YES"
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                                : "text-muted-foreground bg-muted/50 border-border"
                            )}>
                              {response.auto_remediation === "YES" ? <><Zap className="w-3 h-3" />Auto</> : <><Info className="w-3 h-3" />Manual</>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {response.actions.map((a, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                                <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 text-primary text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                <span className="text-[11px] italic text-foreground/80 leading-relaxed">{a.replace(/^\d+\.\s/, "")}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2 pt-1 border-t border-border-subtle">
                            <SectionLabel>Kubectl Commands</SectionLabel>
                            {response.recommended_commands.map((cmd, i) => (
                              <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border font-mono text-[11px] text-primary/80 group hover:border-primary/30 transition-all">
                                <Terminal className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                                <span className="flex-1 truncate">{cmd}</span>
                                <button onClick={() => { navigator.clipboard.writeText(cmd); toast.success("Copied"); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Copy className="w-3 h-3 text-muted-foreground/50 hover:text-primary" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Learning */}
                        <div className={cn("p-5 rounded-2xl border space-y-3",
                          response.learning.store_memory === "YES" ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Brain className={cn("w-4 h-4", response.learning.store_memory === "YES" ? "text-primary" : "text-muted-foreground/40")} />
                              <span className={cn("text-[10px] font-black uppercase tracking-widest italic", response.learning.store_memory === "YES" ? "text-primary" : "text-muted-foreground/50")}>
                                Memory — {response.learning.store_memory}
                              </span>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic",
                              response.learning.pattern_detected === "YES"
                                ? "text-orange-400 bg-orange-500/10 border-orange-500/25"
                                : "text-muted-foreground/40 border-border"
                            )}>
                              Pattern {response.learning.pattern_detected === "YES" ? "Detected" : "New"}
                            </span>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── MEMORY TAB ─────────────────────────────────────────── */}
            {activeTab === "memory" && (
              <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between shrink-0">
                  <div>
                    <SectionLabel>Incident Memory Store</SectionLabel>
                    <p className="text-[10px] font-bold text-muted-foreground/60 italic -mt-2">
                      {memoryEntries.length} incidents · Injected into every agent context
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest italic text-primary">
                    <Brain className="w-3 h-3" />Active
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {memoryEntries.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="p-6 rounded-2xl bg-card border border-border-subtle hover:border-border hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono font-black text-muted-foreground/50 italic">{m.id}</span>
                          <span className={cn("px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic", severityColor(m.severity))}>{m.severity}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/40 italic">
                          <Clock className="w-3 h-3" />
                          {new Date(m.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">Issue</span>
                          <p className="text-[12px] font-bold italic text-foreground/90 mt-0.5">{m.issue}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/60 italic">Root Cause</span>
                            <p className="text-[11px] italic text-muted-foreground/70 mt-0.5 leading-relaxed">{m.root_cause}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/60 italic">Resolution</span>
                            <p className="text-[11px] italic text-muted-foreground/70 mt-0.5 leading-relaxed">{m.resolution}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between shrink-0">
                  <p className="text-[11px] italic text-muted-foreground/50">Memory is injected into every agent context automatically.</p>
                  <Button size="sm" className="h-8 px-4 bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest italic">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Entry
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── TEMPLATES TAB ──────────────────────────────────────── */}
            {activeTab === "templates" && (
              <motion.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                <div className="shrink-0">
                  <SectionLabel>SRE Scenario Templates</SectionLabel>
                  <p className="text-[10px] font-bold text-muted-foreground/60 italic -mt-2">Pre-built signals for testing the multi-agent pipeline</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {TEMPLATES.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => loadTemplate(t)}
                      className={cn("p-5 rounded-2xl border cursor-pointer transition-all group hover:shadow-lg",
                        selectedTemplate === t.id ? "bg-primary/10 border-primary/30 shadow-md" : "bg-card border-border-subtle hover:border-border"
                      )}>
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("p-2.5 rounded-xl border", selectedTemplate === t.id ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/60 border-border text-muted-foreground")}>
                          {t.icon}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest italic text-muted-foreground/40 border border-border px-2 py-0.5 rounded-lg">{t.category}</span>
                      </div>
                      <h3 className="text-[12px] font-black italic uppercase tracking-tight text-foreground/90 mb-1">{t.name}</h3>
                      <p className="text-[11px] italic text-muted-foreground/60 leading-relaxed mb-4">{t.description}</p>
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 font-mono text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-2 italic">{t.signal}</div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest italic", selectedTemplate === t.id ? "text-primary" : "text-muted-foreground/40")}>
                          {selectedTemplate === t.id ? "Loaded" : "Click to load"}
                        </span>
                        <Play className={cn("w-3.5 h-3.5 transition-all", selectedTemplate === t.id ? "text-primary" : "text-muted-foreground/30 group-hover:text-primary/60")} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PromptPanel;
