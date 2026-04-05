import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, ArrowUpRight, Zap, Search,
  History, Rocket, DollarSign, KeyRound,
  ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  Shield, Activity, BarChart3, Database, Server,
  RefreshCw, Eye, Brain, GitBranch, Clock,
  TrendingUp, Cpu, MemoryStick, Network,
  ChevronDown, ChevronUp, Lock, Unlock,
  PlayCircle, PauseCircle, StopCircle,
  Users, Layers, Terminal, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CopilotApiError,
  fetchCopilotStatus,
  postCopilotMessage,
} from "@/lib/copilot";
import ModuleHeader from "../ModuleHeader";
import SkeletonBlock from "../control-plane/SkeletonBlock";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CopilotAnalysis {
  summary: string;
  reasoning: string[];
  sources: string[];
}

interface CopilotPlan {
  actions: string[];
  impact: string;
  risk: "low" | "medium" | "high" | "critical";
  rollback: string;
}

interface CopilotExecution {
  mode: "suggest_only" | "approval_required" | "auto_safe";
}

interface CopilotLearning {
  previous_incident: string;
}

interface CopilotAgents {
  involved: string[];
  verdict: string;
}

interface CopilotFeedback {
  latency_delta: string;
  error_rate_delta: string;
  cost_delta: string;
}

interface StructuredResponse {
  type: "structured";
  analysis: CopilotAnalysis;
  plan: CopilotPlan;
  execution: CopilotExecution;
  learning: CopilotLearning;
  agents?: CopilotAgents;
  confidence: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content?: string;
  structured?: StructuredResponse;
  timestamp: string;
  tags?: string[];
  approved?: boolean | null;   // null = pending, true/false = decided
  feedback?: CopilotFeedback | null;
}

interface ContextInfo {
  deployment: string;
  region: string;
  severity: "low" | "medium" | "high";
  cluster: string;
  memory: string;
  signals: string[];
}

// ─── Local Engine ─────────────────────────────────────────────────────────────
function runCopilotEngine(query: string): StructuredResponse {
  const q = query.toLowerCase();

  // High CPU / latency
  if (q.includes("cpu") || q.includes("latency") || q.includes("slow") || q.includes("throttl")) {
    return {
      type: "structured",
      analysis: {
        summary: "CPU throttling detected on api-gateway — latency p99 elevated to 820ms",
        reasoning: [
          "CPU utilization crossed 89% on 4/6 pods in api-gateway deployment",
          "Traffic volume increased 2.1× over the past 45 minutes",
          "No recent deployment — spike is organic load, not regression",
          "p99 latency: 820ms (SLO threshold: 500ms) — currently breaching SLO",
          "Memory pressure normal; issue is purely CPU-bound",
        ],
        sources: ["metrics/prometheus", "logs/pod-stdout", "traces/jaeger"],
      },
      plan: {
        actions: [
          "Scale api-gateway from 6 → 10 replicas (HPA override)",
          "Set CPU request to 500m, limit to 1000m per pod",
          "Enable burst autoscaling policy for next 2 hours",
          "Restart 2 pods showing >95% CPU to clear stuck goroutines",
        ],
        impact: "Reduce p99 latency from 820ms → ~360ms; restore SLO compliance",
        risk: "low",
        rollback: "Auto-revert scale if error rate increases >2% within 5 min post-scale",
      },
      execution: { mode: "approval_required" },
      learning: {
        previous_incident: "INC-2024-0891 (3 days ago): identical CPU spike resolved by scaling 6→8. Traffic was 1.8× — current spike is 2.1×, recommending higher target.",
      },
      agents: {
        involved: ["SRE Agent", "Cost Agent"],
        verdict: "SRE Agent flags SLO breach. Cost Agent confirms 4-replica scale adds ~$38/mo — within budget.",
      },
      confidence: "0.94",
    };
  }

  // Memory / OOM
  if (q.includes("memory") || q.includes("oom") || q.includes("heap") || q.includes("leak")) {
    return {
      type: "structured",
      analysis: {
        summary: "Memory leak suspected in worker-pool — OOMKilled events rising",
        reasoning: [
          "3 OOMKilled events on worker-pool-prod in last 2 hours",
          "RSS memory climbing linearly: 512MB → 1.8GB over 90 min",
          "Heap profiler shows retained job-queue objects not being GC'd",
          "Pattern matches memory leak in batch processor (no job completion ACK)",
          "Node memory limit: 2GB — pods being killed at ~1.9GB",
        ],
        sources: ["metrics/prometheus", "events/k8s", "logs/node-exporter", "traces/otel"],
      },
      plan: {
        actions: [
          "Drain worker-pool gracefully and restart all pods",
          "Set memory limit to 2.5GB as temporary headroom",
          "Enable heap dump collection before next restart",
          "Pin worker-pool to node pool with 16GB RAM for isolation",
          "File P1 ticket: fix job ACK logic in batch-processor v2.4.1",
        ],
        impact: "Stop OOMKill cycle; restore 100% job processing throughput",
        risk: "medium",
        rollback: "Revert memory limit change; restore previous pod spec from git SHA 8fa2c1d",
      },
      execution: { mode: "approval_required" },
      learning: {
        previous_incident: "INC-2024-0744 (11 days ago): same component, memory leak in v2.3.8 fixed by patch v2.3.9. v2.4.1 may have regressed the fix.",
      },
      agents: {
        involved: ["SRE Agent", "Security Agent"],
        verdict: "SRE Agent recommends immediate drain. Security Agent: heap dumps may contain PII — enable encryption before collection.",
      },
      confidence: "0.91",
    };
  }

  // Cost / spend
  if (q.includes("cost") || q.includes("spend") || q.includes("bill") || q.includes("optim")) {
    return {
      type: "structured",
      analysis: {
        summary: "Cloud spend 34% above forecast — 3 primary waste drivers identified",
        reasoning: [
          "EC2 on-demand instances: 12 m5.2xlarge running at 8% avg CPU — massive over-provisioning",
          "S3 storage: 2.1TB in us-east-1 with no lifecycle policy — data never deleted",
          "Data transfer: 4.2TB cross-region egress (us-east-1 → eu-west-1) daily — avoidable",
          "Reserved Instance coverage: 41% (target: 70%) — paying 3× on-demand premium",
          "Dev/staging clusters running 24×7 — should shut down nights/weekends",
        ],
        sources: ["metrics/cloudwatch", "billing/aws-cost-explorer", "metrics/kubecost"],
      },
      plan: {
        actions: [
          "Rightsize 12 EC2 m5.2xlarge → m5.large (save ~$2,100/mo)",
          "Add S3 lifecycle rule: delete objects >90 days (save ~$340/mo)",
          "Enable S3 Transfer Acceleration + CloudFront to eliminate cross-region egress",
          "Purchase 3-year RI for 8 baseline instances (save ~$1,800/mo)",
          "Schedule dev/staging shutdown: Mon–Fri 21:00–08:00, all weekends",
        ],
        impact: "Projected monthly savings: $4,240/mo (~$50,880/year)",
        risk: "low",
        rollback: "RI purchase is non-reversible — apply rightsizing first, validate 7 days before RI purchase",
      },
      execution: { mode: "suggest_only" },
      learning: {
        previous_incident: "Q4 2025 cost spike: similar over-provisioning resolved by rightsizing campaign. RI coverage went from 35% → 68%, saving $38k/quarter.",
      },
      agents: {
        involved: ["Cost Agent", "SRE Agent"],
        verdict: "Cost Agent flagged 3 waste drivers. SRE Agent approved rightsizing for non-prod; requires SLO check before prod rightsizing.",
      },
      confidence: "0.97",
    };
  }

  // Security / threat
  if (q.includes("security") || q.includes("threat") || q.includes("attack") || q.includes("cve") || q.includes("breach")) {
    return {
      type: "structured",
      analysis: {
        summary: "Active brute-force + credential stuffing detected on auth-service",
        reasoning: [
          "47 failed login attempts from IP 45.33.32.156 in 8 minutes",
          "IP resolves to known Shodan scanner node — matches MITRE T1110 pattern",
          "Velocity anomaly: 0.3 req/s baseline → 6.1 req/s from same IP",
          "3 successful logins from IP subnet 45.33.0.0/16 post-failure sequence",
          "Role escalation event detected 4 minutes after successful auth — privilege abuse likely",
        ],
        sources: ["logs/auth-service", "events/waf", "metrics/cloudwatch", "threat-intel/shodan"],
      },
      plan: {
        actions: [
          "Block IP 45.33.32.156 and subnet 45.33.0.0/16 at WAF immediately",
          "Revoke all sessions created by accounts from flagged subnet",
          "Force MFA re-enrollment for 3 accounts with successful logins",
          "Rotate prod-db-creds and vault/api-keys (precautionary)",
          "Enable adaptive rate limiting: 5 failures → 1h block, 10 failures → 24h block",
        ],
        impact: "Terminate active attack, prevent potential data exfiltration",
        risk: "high",
        rollback: "IP block can be reversed in <2min via WAF console if false positive confirmed",
      },
      execution: { mode: "approval_required" },
      learning: {
        previous_incident: "INC-2026-0102 (6 days ago): brute-force from same /16 subnet — IP block resolved in 8 min. Same attacker rotating IPs.",
      },
      agents: {
        involved: ["Security Agent", "SRE Agent"],
        verdict: "Security Agent: block IP now, rotate creds. SRE Agent: service healthy, no downtime expected from block.",
      },
      confidence: "0.96",
    };
  }

  // Deployment / rollback
  if (q.includes("deploy") || q.includes("rollback") || q.includes("release") || q.includes("canary")) {
    return {
      type: "structured",
      analysis: {
        summary: "api-gateway v2.4.1 canary showing 3.8% error rate — rollback recommended",
        reasoning: [
          "Canary cohort (10% traffic): error rate 3.8% vs stable cohort 0.2%",
          "P95 latency in canary: 1,240ms vs stable: 310ms — 4× degradation",
          "Error pattern: 502s on /api/v2/payments — new endpoint introduced in v2.4.1",
          "DB connection pool exhaustion detected in canary pods (max_connections hit)",
          "Root cause likely: missing connection pool config in new payments route",
        ],
        sources: ["metrics/istio", "logs/canary-pods", "traces/jaeger", "events/k8s"],
      },
      plan: {
        actions: [
          "Immediately set canary weight to 0% (halt canary traffic)",
          "Scale down canary deployment from 2 → 0 replicas",
          "Preserve canary pod logs before termination (kubectl logs --previous)",
          "File defect: payments route missing DB pool config in v2.4.1",
          "Re-deploy fixed v2.4.2 with canary protocol after fix validated in staging",
        ],
        impact: "Restore full traffic to stable v2.4.0; eliminate user-facing errors within 30s",
        risk: "low",
        rollback: "Rollback itself is the recovery action — target state is fully stable v2.4.0",
      },
      execution: { mode: "auto_safe" },
      learning: {
        previous_incident: "INC-2025-0998: v2.3.5 canary had identical DB pool exhaustion — root cause was missing poolSize config in environment overlay. Pattern repeating.",
      },
      agents: {
        involved: ["SRE Agent", "Security Agent"],
        verdict: "SRE Agent: auto rollback approved (low risk). Security Agent: no security impact from rollback.",
      },
      confidence: "0.98",
    };
  }

  // Logs / debugging
  if (q.includes("log") || q.includes("debug") || q.includes("error") || q.includes("fail")) {
    return {
      type: "structured",
      analysis: {
        summary: "auth-service log analysis: 3 distinct error clusters in last 30 minutes",
        reasoning: [
          "Cluster 1 (62% of errors): JWT validation failures — token signing key mismatch after cert rotation",
          "Cluster 2 (31% of errors): Redis timeout (>200ms) on session lookup — cache instance degraded",
          "Cluster 3 (7% of errors): Database deadlock on user_sessions table — concurrent writes",
          "Error rate trending up: 0.4% → 2.1% over 30 min — approaching SLO breach",
          "Correlated: Redis cache miss rate jumped from 12% → 67% at 14:22Z — likely root cause",
        ],
        sources: ["logs/auth-service", "logs/redis", "metrics/apm", "traces/distributed"],
      },
      plan: {
        actions: [
          "Restart auth-service pods to reload JWT signing cert from vault",
          "Failover Redis session cache to replica node (primary showing 180ms p99)",
          "Add database index on user_sessions(user_id, created_at) to prevent deadlocks",
          "Set JWT cert rotation grace period to 10 min (currently 0 — causes hard failures)",
        ],
        impact: "Reduce error rate from 2.1% → <0.2%; prevent SLO breach",
        risk: "medium",
        rollback: "Pod restart is stateless — instant rollback by redeployment if worse",
      },
      execution: { mode: "approval_required" },
      learning: {
        previous_incident: "INC-2026-0089: JWT mismatch after cert rotation — fixed by adding grace period. That fix is missing from current cert rotation runbook.",
      },
      agents: {
        involved: ["SRE Agent"],
        verdict: "SRE Agent: 3 independent root causes. Recommend fixing JWT grace period permanently in runbook after resolution.",
      },
      confidence: "0.92",
    };
  }

  // Default
  return {
    type: "structured",
    analysis: {
      summary: `Infrastructure analysis: "${query}"`,
      reasoning: [
        "Queried all available telemetry sources across the production cluster",
        "No active incidents detected matching this query pattern",
        "System health is nominal — all SLOs within bounds",
        "Running continuous anomaly detection across 847 metrics",
      ],
      sources: ["metrics/prometheus", "logs/loki", "events/k8s"],
    },
    plan: {
      actions: [
        "Continue passive monitoring — no immediate action required",
        "Set up targeted alert rule if specific threshold is of concern",
      ],
      impact: "No immediate impact — system stable",
      risk: "low",
      rollback: "N/A",
    },
    execution: { mode: "suggest_only" },
    learning: {
      previous_incident: "No matching historical incident found in the last 30 days.",
    },
    confidence: "0.88",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const SESSION_KEY = "quantum-ops-copilot-session";
const DEV_OPENAI_SESSION_KEY = "quantum-ops-dev-openai-key";

function getSessionOpenAiKey(): string | undefined {
  try { return sessionStorage.getItem(DEV_OPENAI_SESSION_KEY)?.trim() || undefined; } catch { return undefined; }
}
function loadOrCreateSessionId(): string {
  try {
    const e = sessionStorage.getItem(SESSION_KEY);
    if (e) return e;
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch { return `sess-${Date.now()}`; }
}

const RISK_COLORS: Record<string, string> = {
  low:      "text-primary bg-primary/10 border-primary/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
};

const MODE_META = {
  suggest_only:       { icon: Eye,        label: "Suggest Only",      color: "text-primary",    bg: "bg-primary/10 border-primary/30" },
  approval_required:  { icon: Lock,       label: "Approval Required", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  auto_safe:          { icon: PlayCircle, label: "Auto Safe Execute", color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
};

const AGENT_ICONS: Record<string, any> = {
  "SRE Agent":      Activity,
  "Cost Agent":     DollarSign,
  "Security Agent": Shield,
};

function deriveContextFromText(text: string): ContextInfo | null {
  const t = text.toLowerCase();
  const deployment =
    t.includes("api-gateway") ? "api-gateway-v2.4" :
    t.includes("auth-service") ? "auth-service-v2.4" :
    t.includes("worker-pool") ? "worker-pool-v2.4" :
    t.includes("payment") ? "payment-api-v2.4" :
    "";
  if (!deployment) return null;
  const region = t.includes("eu-west-1") ? "eu-west-1" : "us-east-1";
  const severity: ContextInfo["severity"] =
    t.includes("critical") || t.includes("high") ? "high" :
    t.includes("medium") || t.includes("warn") ? "medium" : "low";
  const memory =
    t.includes("1.8gb") ? "1.8GB / 2.0GB" :
    t.includes("2.5gb") ? "2.5GB limit" :
    t.includes("memory pressure normal") ? "normal" : "unknown";
  return {
    deployment,
    region,
    severity,
    cluster: "prod-cluster-a",
    memory,
    signals: ["metrics", "logs", "incidents"],
  };
}

function deriveContextFromMessage(msg: Message): ContextInfo | null {
  if (msg.structured) {
    const fromSummary = deriveContextFromText(msg.structured.analysis.summary);
    if (!fromSummary) return null;
    if (msg.structured.analysis.summary.toLowerCase().includes("no active incidents")) return null;
    const sev = msg.structured.plan.risk === "critical" || msg.structured.plan.risk === "high"
      ? "high"
      : msg.structured.plan.risk === "medium"
        ? "medium"
        : "low";
    const memHint = msg.structured.analysis.reasoning.find((r) => /mb|gb|memory/i.test(r)) ?? fromSummary.memory;
    return {
      ...fromSummary,
      severity: sev,
      memory: typeof memHint === "string" ? memHint : fromSummary.memory,
      signals: msg.structured.analysis.sources.slice(0, 3),
    };
  }
  if (msg.content) return deriveContextFromText(msg.content);
  return null;
}

function StructuredCard({
  msg,
  context,
  onApprove,
  onReject,
  onFeedback,
  onSelectContext,
}: {
  msg: Message;
  context: ContextInfo | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onFeedback: (id: number) => void;
  onSelectContext: (messageId: number, context: ContextInfo | null) => void;
}) {
  const s = msg.structured!;
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const mode = MODE_META[s.execution.mode];
  const ModeIcon = mode.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3 cursor-pointer"
      onClick={() => onSelectContext(msg.id, context)}
    >
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-3 space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Bot className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Issue Detected</span>
              <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest">{msg.timestamp}</span>
              <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${RISK_COLORS[s.plan.risk]}`}>Risk {s.plan.risk}</span>
            </div>
            <p className="text-sm font-black text-white leading-snug">{s.analysis.summary}</p>
            {context ? (
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                {context.deployment} ({context.region})
              </p>
            ) : null}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors mt-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!expanded ? (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2 py-1 rounded border border-white/10 text-white/80">Confidence {(parseFloat(s.confidence) * 100).toFixed(0)}%</span>
            <span className="px-2 py-1 rounded border border-white/10 text-white/70 truncate max-w-[60%]">{s.plan.impact}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 p-2">
                <p className="text-[9px] uppercase tracking-widest text-white/45">Impact</p>
                <p className="text-xs text-white/92 mt-1">{s.plan.impact}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-2">
                <p className="text-[9px] uppercase tracking-widest text-white/45">Root Cause</p>
                <p className="text-xs text-white/92 mt-1">{s.analysis.reasoning[0] ?? "No root cause found"}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-2 md:col-span-2">
                <p className="text-[9px] uppercase tracking-widest text-white/45">AI Plan</p>
                <p className="text-xs text-white/92 mt-1">{s.plan.actions.slice(0, 2).join(" | ")}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-2">
                <p className="text-[9px] uppercase tracking-widest text-white/45">Confidence</p>
                <p className="text-sm font-black text-blue-300 mt-1">{(parseFloat(s.confidence) * 100).toFixed(0)}%</p>
              </div>
              <div className="rounded-xl border border-white/10 p-2">
                <p className="text-[9px] uppercase tracking-widest text-white/45">Execution Mode</p>
                <p className="text-sm font-black text-indigo-300 mt-1">{mode.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest" onClick={() => onApprove(msg.id)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Apply Fix
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest" onClick={() => onFeedback(msg.id)}>
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Simulate Fix
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-red-500/30 text-red-300" onClick={() => onReject(msg.id)}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Ignore
              </Button>
            </div>
          </>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-white/10 p-3 bg-[#0B0F16] space-y-3"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-white/55">Advanced Analysis</p>
              <div className="space-y-2">
                {s.analysis.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[9px] font-black text-primary/70 mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.analysis.sources.map((src) => (
                  <span key={src} className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 text-white/50">
                    {src}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-white/60">Rollback: {s.plan.rollback}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Quick Prompts ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Why is latency high?",        icon: Clock },
  { label: "Debug auth-service logs",     icon: Search },
  { label: "Optimize cluster cost",       icon: DollarSign },
  { label: "Analyze canary deployment",   icon: Layers },
  { label: "Security threat detected",    icon: Shield },
  { label: "Memory leak in worker-pool",  icon: MemoryStick },
];

// ─── Main Component ───────────────────────────────────────────────────────────
interface ChatPanelProps {
  initialQuery?: string | null;
  initialNonce?: number;
}

type OperatorMode = "manual" | "assist" | "auto_execute";

const ChatPanel: React.FC<ChatPanelProps> = ({ initialQuery, initialNonce }) => {
  const HISTORY_KEY = "quantum-ops-ai-operator-history-v1";
  const OPERATOR_MODE_KEY = "quantum-ops-ai-operator-mode-v1";
  const [copilotSessionId] = useState(() => loadOrCreateSessionId());
  const [connection, setConnection] = useState<"loading" | "live" | "demo" | "offline">("loading");
  const [operatorMode, setOperatorMode] = useState<OperatorMode>(() => {
    try {
      const saved = localStorage.getItem(OPERATOR_MODE_KEY) as OperatorMode | null;
      if (saved === "manual" || saved === "assist" || saved === "auto_execute") return saved;
    } catch {
      // ignore storage errors
    }
    return "assist";
  });
  const [approvalMode, setApprovalMode] = useState(true);
  const [maxActionsPerHour, setMaxActionsPerHour] = useState(8);
  const [allowDevOpenAiKey, setAllowDevOpenAiKey] = useState(false);
  const [openaiFromEnv, setOpenaiFromEnv] = useState(false);
  const [sessionKeySaved, setSessionKeySaved] = useState(() => Boolean(getSessionOpenAiKey()));
  const [devKeyInput, setDevKeyInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "I'm your AI Infrastructure Operator. I analyze telemetry, reason through root causes, and generate safe execution plans with full risk assessment.\n\nAsk me about CPU spikes, memory leaks, cost anomalies, security threats, or deployment issues.",
      timestamp: "Now",
      tags: ["#OPERATOR-READY", "#TELEMETRY-CONNECTED"],
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ContextInfo | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const refreshStatus = () => {
    void fetchCopilotStatus().then(s => {
      if (!s) { setConnection("offline"); return; }
      setAllowDevOpenAiKey(s.allowDevOpenAiKey === true);
      setOpenaiFromEnv(s.openaiConfigured);
      const hasBrowserKey = Boolean(getSessionOpenAiKey());
      setSessionKeySaved(hasBrowserKey);
      setConnection(s.openaiConfigured || hasBrowserKey ? "live" : "demo");
    });
  };

  useEffect(() => { refreshStatus(); }, []);
  useEffect(() => {
    if (!autoScrollEnabled) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, autoScrollEnabled]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Message[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setMessages(parsed.slice(-40));
    } catch {
      // ignore malformed history
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // storage can fail in restricted mode
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(OPERATOR_MODE_KEY, operatorMode);
    } catch {
      // ignore storage errors
    }
  }, [operatorMode]);

  useEffect(() => {
    if (!initialQuery?.trim()) return;
    setInput(initialQuery);
    setIsFocused(true);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      // Place caret at end for fast re-submission
      const v = initialQuery;
      if (textareaRef.current && typeof textareaRef.current.selectionStart === "number") {
        const len = v.length;
        textareaRef.current.selectionStart = len;
        textareaRef.current.selectionEnd = len;
      }
    });
  }, [initialNonce, initialQuery]);

  const approve = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, approved: true } : m));
    // Simulate feedback after 2s
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === id ? {
        ...m,
        feedback: {
          latency_delta: "−42%",
          error_rate_delta: "−78%",
          cost_delta: "+$1.20/h",
        },
      } : m));
    }, 2000);
  };

  const reject = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, approved: false, tags: [...(m.tags ?? []), "#IGNORED"] } : m));
    toast.info("Decision logged: ignored");
  };

  const triggerFeedback = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? {
      ...m,
      tags: [...(m.tags ?? []), "#SIMULATION"],
      feedback: {
        latency_delta: "−18%",
        error_rate_delta: "−26%",
        cost_delta: "+$0.40/h",
      },
    } : m));
    toast.success("Dry run complete");
  };

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // If live GPT available, use the real API
    const hasLiveKey = connection === "live";

    if (hasLiveKey) {
      try {
        const data = await postCopilotMessage(text, copilotSessionId, { openaiApiKey: getSessionOpenAiKey() });
        const tags = data.demoMode ? ["#DEMO-MODE"] : ["#LIVE-COPILOT"];
        if (data.actionTaken) tags.push("#ACTION-RUN");
        setConnection(data.demoMode ? "demo" : "live");

        // Try to detect if response is JSON structured
        let structured: StructuredResponse | undefined;
        try {
          const parsed = JSON.parse(data.reply);
          if (parsed.analysis && parsed.plan) structured = { type: "structured", ...parsed, confidence: parsed.confidence || "0.90" };
        } catch { /* plain text */ }

        const aiMsg: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: structured ? undefined : data.reply,
          structured,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tags,
          approved:
            operatorMode === "auto_execute"
              ? true
              : structured?.execution.mode === "approval_required" || (operatorMode === "manual" && approvalMode)
                ? null
                : undefined,
        };
        setMessages(prev => [...prev, aiMsg]);
        refreshStatus();
      } catch (e) {
        // Fall through to local engine on API error
        const structured = runCopilotEngine(text);
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: "assistant",
          structured,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          approved:
            operatorMode === "auto_execute"
              ? true
              : structured.execution.mode === "approval_required" || (operatorMode === "manual" && approvalMode)
                ? null
                : undefined,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } else {
      // Demo mode — local engine
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
      const structured = runCopilotEngine(text);
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        structured,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tags: ["#DEMO-ENGINE", "#LOCAL-ANALYSIS"],
        approved:
          operatorMode === "auto_execute"
            ? true
            : structured.execution.mode === "approval_required" || (operatorMode === "manual" && approvalMode)
              ? null
              : undefined,
      };
      setMessages(prev => [...prev, aiMsg]);
    }

    setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && document.activeElement?.tagName === "TEXTAREA") {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleMessagesScroll = () => {
    const el = messagesViewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScrollEnabled(distanceFromBottom < 120);
  };

  const subtitle =
    connection === "offline"
      ? "Backend unreachable — run: cd backend && npm run dev"
      : connection === "loading"
        ? "Connecting to telemetry sources…"
        : "AI Operator — infrastructure intelligence active";
  const latestContext = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant ? deriveContextFromMessage(lastAssistant) : null;
  }, [messages]);
  const activeContext = selectedContext ?? latestContext;
  const selectedIssue = useMemo(
    () => messages.find((m) => m.id === selectedIssueId && m.structured)?.structured ?? null,
    [messages, selectedIssueId]
  );
  const riskLevel = (activeContext?.severity ?? "low").toUpperCase();
  const modeMeta =
    operatorMode === "manual"
      ? { label: "AI: OFF", cls: "text-zinc-300 border-white/10 bg-white/5" }
      : operatorMode === "assist"
        ? { label: "AI: ASSIST", cls: "text-blue-300 border-blue-500/30 bg-blue-500/10" }
        : { label: "AI: AUTO", cls: "text-violet-200 border-violet-500/30 bg-violet-500/10 shadow-[0_0_18px_rgba(139,92,246,0.35)]" };
  const riskClass =
    riskLevel === "HIGH"
      ? "text-red-300 border-red-500/40 bg-red-500/10 animate-pulse"
      : riskLevel === "MEDIUM"
        ? "text-amber-300 border-amber-500/35 bg-amber-500/10"
        : "text-emerald-300 border-emerald-500/35 bg-emerald-500/10";
  const targetLabel = activeContext ? `${activeContext.deployment} | ${activeContext.region}` : "No active target";

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      <ModuleHeader
        title="AI Operator"
        subtitle={subtitle}
      />

      <div className="px-6 pt-3">
        <div className="mx-auto max-w-[920px] h-14 rounded-xl border border-white/10 bg-background-elevated/50 backdrop-blur-md px-2.5">
          <div className="h-full flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <span className={cn("inline-flex items-center h-8 px-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest", modeMeta.cls)}>
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              {modeMeta.label}
            </span>
            <span className={cn("inline-flex items-center h-8 px-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest", riskClass)}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Risk: {riskLevel}
            </span>
            <span className="inline-flex items-center h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/85">
              <Hash className="w-3.5 h-3.5 mr-1.5 text-white/50" />
              {targetLabel}
            </span>
            <button
              type="button"
              title={`Approval mode: ${approvalMode ? "enabled" : "disabled"} | Rollback: enabled`}
              className="inline-flex items-center h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/80"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5 text-white/55" />
              Limits: {maxActionsPerHour}/hr
            </button>
            <div className="ml-auto inline-flex items-center h-8 rounded-lg border border-white/10 bg-white/5 p-0.5">
              <Button
                size="sm"
                className="h-7 px-2.5 text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  const primaryAction = selectedIssue?.plan.actions?.[0];
                  const q = primaryAction
                    ? `Execute fix now: ${primaryAction}`
                    : activeContext
                      ? `Execute fix for ${activeContext.deployment} in ${activeContext.region}`
                      : "Execute prioritized fix";
                  void sendMessage(q);
                }}
              >
                Execute Fix
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[10px] font-black uppercase tracking-widest border-transparent"
                onClick={() => setOperatorMode("auto_execute")}
              >
                Auto Resolve
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div
        ref={messagesViewportRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto pt-2 px-6 custom-scrollbar"
      >
        <div className="max-w-[920px] mx-auto space-y-3 pb-4">
          <AnimatePresence>
            {messages.map(msg => (
              <React.Fragment key={msg.id}>
                {msg.role === "user" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 items-start flex-row-reverse"
                  >
                    <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-primary to-indigo-400 opacity-80" />
                    </div>
                    <div className="max-w-[80%] bg-[#25253A] border border-white/20 rounded-[1.2rem] px-4 py-3 text-[14px] leading-relaxed text-white font-medium shadow-[0_4px_14px_rgba(0,0,0,0.28)]">
                      {msg.content}
                    </div>
                  </motion.div>
                ) : msg.structured ? (
                  <StructuredCard
                    msg={msg}
                    context={deriveContextFromMessage(msg)}
                    onApprove={approve}
                    onReject={reject}
                    onFeedback={triggerFeedback}
                    onSelectContext={(messageId, context) => {
                      setSelectedIssueId(messageId);
                      setSelectedContext(context);
                    }}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="bg-[#161A26] border border-white/20 rounded-[1.2rem] px-4 py-3 text-[14px] leading-relaxed text-white shadow-[0_4px_14px_rgba(0,0,0,0.24)]">
                        {deriveContextFromMessage(msg) ? (
                          <p className="mb-2 text-[12px] text-blue-200/90">
                            Issue detected in {deriveContextFromMessage(msg)?.deployment} ({deriveContextFromMessage(msg)?.region})
                          </p>
                        ) : null}
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        {msg.tags && (
                          <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                            {msg.tags.map(tag => (
                              <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase text-white/45 tracking-widest pl-4">{msg.timestamp}</span>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            ))}

            {isThinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center animate-pulse">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-48" />
                  <SkeletonBlock className="h-4 w-64" />
                  <SkeletonBlock className="h-4 w-40" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 px-6 pb-3 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-[860px] mx-auto space-y-4">
          {/* Quick actions */}
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label}
                disabled={isThinking}
                onClick={() => void sendMessage(a.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/30 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all disabled:opacity-40">
                <a.icon className="w-3 h-3" />
                {a.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className={cn(
            "relative rounded-2xl transition-all duration-300",
            isFocused ? "ring-1 ring-primary/20 shadow-lg shadow-primary/5" : "border border-white/10"
          )}>
            <div className="bg-[#0A0A0B] rounded-[calc(1rem-1px)] flex flex-col p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI about your infrastructure..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 px-4 outline-none resize-none min-h-[42px] font-medium text-white placeholder:text-white/35 leading-relaxed"
                rows={1}
              />
              <div className="flex items-center justify-between px-3 pb-2 border-t border-white/[0.03] pt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/25">
                  AI Operator — always explains reasoning before executing
                </span>
                <Button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isThinking}
                  className={cn(
                    "h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                    input.trim() ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground/30 border border-white/5"
                  )}
                >
                  Execute
                  <ArrowUpRight className="ml-2 w-3.5 h-3.5 opacity-70" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
