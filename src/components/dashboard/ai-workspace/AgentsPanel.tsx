import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Activity, Shield, DollarSign, Rocket, Zap,
  Plus, Settings, Play, Pause, StopCircle,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  RefreshCw, Eye, Brain, GitBranch, TrendingUp,
  ChevronDown, ChevronUp, ChevronRight,
  Terminal, Hash, Users, Lock, Unlock,
  BarChart3, MemoryStick, Cpu, Network,
  Target, Database, Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateAgentModal } from "./CreateAgentModal";
import { useAgents } from "@/hooks/useAgents";

// ─── Types ────────────────────────────────────────────────────────────────────
type AgentStatus = "active" | "paused" | "executing" | "error" | "idle";
type ExecutionMode = "manual" | "approval" | "autonomous";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface AgentDecision {
  id: string;
  timestamp: string;
  trigger: string;
  reasoning: string[];
  action: {
    decision: string;
    details: string;
    risk: RiskLevel;
    rollback: string;
  };
  collaboration: string[];
  learning: { insight: string };
  outcome: "pending" | "approved" | "rejected" | "executed" | "failed";
  impact?: { latency_delta: string; error_rate_delta: string; cost_delta: string };
}

interface AgentDefinition {
  id: string;
  name: string;
  type: "sre" | "cost" | "security" | "deployment";
  status: AgentStatus;
  goal: string;
  mode: ExecutionMode;
  policy: { max_scale: string; restricted_hours: string; requires_approval: string[] };
  metrics: { actions_total: number; success_rate: number; avg_impact: string; uptime: string };
  collaborators: string[];
  decisions: AgentDecision[];
  learning_score: number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────
function buildAgentFleet(): AgentDefinition[] {
  return [
    {
      id: "agt-sre-01",
      name: "SRE Agent",
      type: "sre",
      status: "executing",
      goal: "Maintain latency < 50ms and error rate < 0.1%",
      mode: "autonomous",
      policy: { max_scale: "20 replicas", restricted_hours: "none", requires_approval: ["delete_pod", "rollback_production"] },
      metrics: { actions_total: 284, success_rate: 97.2, avg_impact: "−38% latency", uptime: "18d 4h" },
      collaborators: ["Cost Agent", "Security Agent"],
      learning_score: 91,
      decisions: [
        {
          id: "dec-sre-001",
          timestamp: "2026-03-30T14:18:00Z",
          trigger: "CPU throttling — api-gateway p99 latency 820ms (SLO: 500ms)",
          reasoning: [
            "CPU utilization 89% on 4/6 pods — sustained >5 min",
            "Traffic 2.1× spike — organic load, not regression",
            "No recent deployment — code is stable",
            "HPA backoff period expired — scaling safe",
          ],
          action: {
            decision: "Scale api-gateway from 6 → 10 replicas",
            details: "kubectl scale deployment api-gateway --replicas=10 -n prod",
            risk: "low",
            rollback: "Auto-revert to 6 replicas if error rate >2% within 5 min",
          },
          collaboration: ["Cost Agent: +$38/mo — within $500 headroom", "Security Agent: no policy conflict"],
          learning: { insight: "Scaling more effective than restart for stateless services under organic load" },
          outcome: "executed",
          impact: { latency_delta: "−42%", error_rate_delta: "−0.3%", cost_delta: "+$1.20/h" },
        },
        {
          id: "dec-sre-002",
          timestamp: "2026-03-30T13:40:00Z",
          trigger: "Pod crash-loop detected — payment-service (3 restarts in 10 min)",
          reasoning: [
            "OOMKill events — container hitting 512MB limit",
            "Heap growth linear: likely memory leak in v3.1.2",
            "Circuit breaker open downstream — cascading risk",
          ],
          action: {
            decision: "Increase memory limit to 768MB + collect heap dump",
            details: "kubectl set resources deployment/payment-service --limits=memory=768Mi -n prod",
            risk: "medium",
            rollback: "Revert to 512MB and scale horizontally if leak worsens",
          },
          collaboration: ["Cost Agent: memory increase adds $12/mo", "Security Agent: heap dump may contain PII — encrypt before storage"],
          learning: { insight: "v3.1.2 has repeated OOM pattern — recommend pre-emptive limit increase in release checklist" },
          outcome: "approved",
        },
      ],
    },
    {
      id: "agt-cost-01",
      name: "Cost Agent",
      type: "cost",
      status: "active",
      goal: "Reduce cloud spend by 20% within Q2 while maintaining SLOs",
      mode: "approval",
      policy: { max_scale: "N/A", restricted_hours: "RI purchases: business hours only", requires_approval: ["reserved_instance_purchase", "region_migration"] },
      metrics: { actions_total: 142, success_rate: 94.4, avg_impact: "−$240/mo per action", uptime: "23d 11h" },
      collaborators: ["SRE Agent", "Deployment Agent"],
      learning_score: 88,
      decisions: [
        {
          id: "dec-cost-001",
          timestamp: "2026-03-30T12:00:00Z",
          trigger: "Monthly spend forecast 34% above budget — $8,400 vs $6,250 target",
          reasoning: [
            "12 EC2 m5.2xlarge running at avg 8% CPU — severe over-provisioning",
            "S3 lifecycle policy missing — 2.1TB stale data accumulating",
            "Dev cluster running 24×7 — should shut down nights/weekends",
          ],
          action: {
            decision: "Rightsize 12 m5.2xlarge → m5.large + S3 lifecycle + dev schedule",
            details: "AWS CLI: modify-instance-type + s3api put-lifecycle-configuration + Lambda scheduler",
            risk: "low",
            rollback: "Restore m5.2xlarge from snapshot within 15 min if throughput drops",
          },
          collaboration: ["SRE Agent: SLO impact analysis confirms safe", "Deployment Agent: no deployment window conflict"],
          learning: { insight: "Over-provisioning occurs post-incident — teams scale up but never scale down. Recommend auto-rightsizing policy." },
          outcome: "pending",
        },
      ],
    },
    {
      id: "agt-sec-01",
      name: "Security Agent",
      type: "security",
      status: "active",
      goal: "Zero tolerance on critical CVEs; maintain threat response < 5 min",
      mode: "autonomous",
      policy: { max_scale: "N/A", restricted_hours: "none — security is 24×7", requires_approval: ["block_cidr_range", "revoke_admin_access"] },
      metrics: { actions_total: 198, success_rate: 99.0, avg_impact: "−94% threat dwell time", uptime: "30d 0h" },
      collaborators: ["SRE Agent", "Deployment Agent"],
      learning_score: 95,
      decisions: [
        {
          id: "dec-sec-001",
          timestamp: "2026-03-30T14:22:00Z",
          trigger: "Brute-force attack — 47 failed logins from 45.33.32.156 in 8 min",
          reasoning: [
            "IP matches Shodan scanner node — known attacker infrastructure",
            "MITRE T1110: Brute Force pattern confirmed",
            "3 successful logins from same /16 subnet post-failure sequence",
            "Privilege escalation within 4 min — privilege abuse risk",
          ],
          action: {
            decision: "Block IP + revoke sessions + rotate credentials",
            details: "WAF: block 45.33.32.156; Vault: rotate prod-db-creds; Auth: revoke 3 sessions",
            risk: "high",
            rollback: "IP block reversible in <2 min via WAF console if false positive",
          },
          collaboration: ["SRE Agent: service healthy — block has no availability impact"],
          learning: { insight: "Attacker rotates IPs within /16 subnet. Pre-emptive /24 block more effective than single IP." },
          outcome: "executed",
          impact: { latency_delta: "0%", error_rate_delta: "0%", cost_delta: "$0" },
        },
      ],
    },
    {
      id: "agt-deploy-01",
      name: "Deployment Agent",
      type: "deployment",
      status: "idle",
      goal: "Zero-downtime deployments with <0.5% error rate during rollout",
      mode: "approval",
      policy: { max_scale: "N/A", restricted_hours: "no prod deploys 22:00–06:00 IST", requires_approval: ["production_deploy", "canary_promote"] },
      metrics: { actions_total: 87, success_rate: 96.6, avg_impact: "0 incidents per deploy", uptime: "14d 7h" },
      collaborators: ["SRE Agent", "Security Agent"],
      learning_score: 84,
      decisions: [
        {
          id: "dec-dep-001",
          timestamp: "2026-03-30T11:00:00Z",
          trigger: "Canary api-gateway v2.4.1: error rate 3.8% (threshold: 0.5%)",
          reasoning: [
            "Canary cohort (10% traffic): 502s on /api/v2/payments",
            "DB connection pool exhaustion in canary pods — missing pool config",
            "Stable cohort error rate: 0.2% — confirms canary regression",
          ],
          action: {
            decision: "Halt canary, rollback to v2.4.0, file defect",
            details: "kubectl argo rollouts abort api-gateway-v2.4.1; set weight=0",
            risk: "low",
            rollback: "N/A — rollback is the recovery action",
          },
          collaboration: ["SRE Agent: auto-approved (low risk)", "Security Agent: no security impact"],
          learning: { insight: "Missing DB pool config in payments route — add connection pool validation to deployment checklist" },
          outcome: "executed",
          impact: { latency_delta: "−78%", error_rate_delta: "−3.6%", cost_delta: "$0" },
        },
      ],
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AGENT_ICONS = {
  sre:        Activity,
  cost:       DollarSign,
  security:   Shield,
  deployment: Rocket,
};

const AGENT_COLORS = {
  sre:        "text-primary bg-primary/10 border-primary/30",
  cost:       "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  security:   "text-red-400 bg-red-400/10 border-red-400/30",
  deployment: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const STATUS_DOT: Record<AgentStatus, string> = {
  active:    "bg-primary animate-pulse",
  executing: "bg-yellow-400 animate-pulse",
  paused:    "bg-muted-foreground",
  error:     "bg-red-500",
  idle:      "bg-muted-foreground/40",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  active:    "ACTIVE",
  executing: "EXECUTING",
  paused:    "PAUSED",
  error:     "ERROR",
  idle:      "IDLE",
};

const MODE_META: Record<ExecutionMode, { label: string; icon: any; color: string }> = {
  manual:     { label: "Manual",     icon: Lock,    color: "text-muted-foreground" },
  approval:   { label: "Approval",   icon: Eye,     color: "text-yellow-400" },
  autonomous: { label: "Autonomous", icon: Zap,     color: "text-primary" },
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low:      "text-primary border-primary/30 bg-primary/5",
  medium:   "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  high:     "text-orange-400 border-orange-400/30 bg-orange-400/5",
  critical: "text-red-500 border-red-500/30 bg-red-500/5",
};

const OUTCOME_META = {
  pending:  { icon: Clock,         color: "text-yellow-400", label: "Pending Approval" },
  approved: { icon: CheckCircle2,  color: "text-primary",    label: "Approved" },
  rejected: { icon: XCircle,       color: "text-red-500",    label: "Rejected" },
  executed: { icon: CheckCircle2,  color: "text-primary",    label: "Executed" },
  failed:   { icon: AlertTriangle, color: "text-red-500",    label: "Failed" },
};

// ─── Decision Card ─────────────────────────────────────────────────────────────
function DecisionCard({
  dec,
  agentType,
  onApprove,
  onReject,
}: {
  dec: AgentDecision;
  agentType: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [open, setOpen] = useState(dec.outcome === "pending");
  const outcome = OUTCOME_META[dec.outcome];
  const OutcomeIcon = outcome.icon;

  return (
    <div className={`rounded-xl border bg-background overflow-hidden transition-all ${
      dec.outcome === "pending" ? "border-yellow-400/30" : "border-border-subtle"
    }`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-elevated/50 transition-colors"
      >
        <OutcomeIcon className={`w-3.5 h-3.5 shrink-0 ${outcome.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest truncate">{dec.trigger}</p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 shrink-0">
          {dec.timestamp.replace("T", " ").replace("Z", "").slice(11, 16)}
        </span>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${RISK_COLORS[dec.action.risk]}`}>
          {dec.action.risk}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Reasoning */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                    <Brain className="w-3 h-3" /> Reasoning
                  </p>
                  {dec.reasoning.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-primary/50 mt-0.5 shrink-0">{i + 1}</span>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                    <GitBranch className="w-3 h-3" /> Action
                  </p>
                  <p className="text-[11px] font-black">{dec.action.decision}</p>
                  <code className="text-[9px] font-mono text-blue-400 bg-background border border-border-subtle rounded px-2 py-1 block break-all">
                    {dec.action.details}
                  </code>
                  <div className="flex items-start gap-1.5 text-[10px]">
                    <RefreshCw className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground/60">{dec.action.rollback}</span>
                  </div>
                </div>
              </div>

              {/* Collaboration */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Collaboration
                </p>
                <div className="flex flex-wrap gap-2">
                  {dec.collaboration.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-background-elevated border border-border-subtle">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Brain className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{dec.learning.insight}</p>
              </div>

              {/* Impact (if executed) */}
              {dec.impact && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Latency", value: dec.impact.latency_delta },
                    { label: "Error Rate", value: dec.impact.error_rate_delta },
                    { label: "Cost", value: dec.impact.cost_delta },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 rounded-lg bg-background border border-border-subtle">
                      <p className="text-sm font-black text-primary">{value}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Approval gate */}
              {dec.outcome === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline"
                    className="h-8 text-[9px] font-black uppercase tracking-widest border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => onReject(dec.id)}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                  </Button>
                  <Button size="sm"
                    className="h-8 text-[9px] font-black uppercase tracking-widest"
                    onClick={() => onApprove(dec.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  onDecisionApprove,
  onDecisionReject,
  onToggleMode,
  onPause,
}: {
  agent: AgentDefinition;
  onDecisionApprove: (agentId: string, decId: string) => void;
  onDecisionReject: (agentId: string, decId: string) => void;
  onToggleMode: (agentId: string) => void;
  onPause: (agentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = AGENT_ICONS[agent.type];
  const agentColor = AGENT_COLORS[agent.type];
  const mode = MODE_META[agent.mode];
  const ModeIcon = mode.icon;
  const pendingCount = agent.decisions.filter(d => d.outcome === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-background-elevated overflow-hidden transition-all ${
        agent.status === "executing" ? "border-yellow-400/30" :
        agent.status === "error"     ? "border-red-500/30" :
        "border-border-subtle hover:border-primary/20"
      }`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${agentColor}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-widest">{agent.name}</span>
                {pendingCount > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                    {pendingCount} PENDING
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest mt-0.5 leading-tight">{agent.goal}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle">
              <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status]}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{STATUS_LABEL[agent.status]}</span>
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Actions", value: agent.metrics.actions_total.toLocaleString() },
            { label: "Success", value: `${agent.metrics.success_rate}%` },
            { label: "Impact", value: agent.metrics.avg_impact },
            { label: "Uptime", value: agent.metrics.uptime },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-background border border-border-subtle">
              <p className="text-xs font-black text-foreground truncate">{value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
            </div>
          ))}
        </div>

        {/* Mode + Learning score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle`}>
              <ModeIcon className={`w-3 h-3 ${mode.color}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${mode.color}`}>{mode.label}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">IQ {agent.learning_score}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPause(agent.id)}
              className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
              title={agent.status === "paused" ? "Resume" : "Pause"}
            >
              {agent.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onToggleMode(agent.id)}
              className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
              title="Cycle execution mode"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground text-[9px] font-black uppercase tracking-widest"
            >
              Decisions {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Decisions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle"
          >
            <div className="p-4 space-y-2 bg-background/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Decision History</p>
                <div className="flex gap-1.5">
                  {agent.collaborators.map(c => (
                    <span key={c} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-background border border-border-subtle text-muted-foreground/50">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {agent.decisions.map(dec => (
                <DecisionCard
                  key={dec.id}
                  dec={dec}
                  agentType={agent.type}
                  onApprove={id => onDecisionApprove(agent.id, id)}
                  onReject={id => onDecisionReject(agent.id, id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Live Log ─────────────────────────────────────────────────────────────────
interface LogEntry {
  id: number;
  ts: string;
  agent: string;
  level: "INFO" | "WARN" | "ERROR" | "ACTION";
  msg: string;
}

function buildInitialLogs(): LogEntry[] {
  return [
    { id: 1, ts: "14:22:01", agent: "Security Agent", level: "ACTION", msg: "WAF rule applied: block 45.33.32.156 — brute force confirmed" },
    { id: 2, ts: "14:20:15", agent: "SRE Agent",      level: "ACTION", msg: "api-gateway scaled 6→10 replicas — latency SLO restored" },
    { id: 3, ts: "14:19:02", agent: "Cost Agent",     level: "INFO",   msg: "Scale validated: $38/mo add-on within Q2 headroom" },
    { id: 4, ts: "14:18:00", agent: "SRE Agent",      level: "WARN",   msg: "CPU throttling detected — p99 820ms (SLO: 500ms)" },
    { id: 5, ts: "13:40:11", agent: "Deploy Agent",   level: "ACTION", msg: "Canary abort: api-gateway v2.4.1 error rate 3.8%" },
    { id: 6, ts: "13:39:45", agent: "SRE Agent",      level: "INFO",   msg: "Canary regression corroborated — stable cohort 0.2% vs canary 3.8%" },
    { id: 7, ts: "12:00:00", agent: "Cost Agent",     level: "WARN",   msg: "Forecast overage: $8,400 projected vs $6,250 budget" },
    { id: 8, ts: "11:30:00", agent: "Security Agent", level: "INFO",   msg: "Scheduled security scan complete — 0 critical CVEs" },
  ];
}

// ─── System Observability ──────────────────────────────────────────────────────
function ObservabilityPanel({ fleet }: { fleet: AgentDefinition[] }) {
  const totalActions = fleet.reduce((sum, a) => sum + a.metrics.actions_total, 0);
  const avgSuccess = (fleet.reduce((sum, a) => sum + a.metrics.success_rate, 0) / fleet.length).toFixed(1);
  const avgIQ = Math.round(fleet.reduce((sum, a) => sum + a.learning_score, 0) / fleet.length);
  const pendingTotal = fleet.flatMap(a => a.decisions).filter(d => d.outcome === "pending").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Total Actions", value: totalActions.toLocaleString(), icon: Zap, color: "text-foreground" },
        { label: "Avg Success Rate", value: `${avgSuccess}%`, icon: TrendingUp, color: "text-primary" },
        { label: "Avg Learning IQ", value: avgIQ, icon: Brain, color: "text-primary" },
        { label: "Pending Approvals", value: pendingTotal, icon: Clock, color: pendingTotal > 0 ? "text-yellow-400" : "text-muted-foreground" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-border-subtle bg-background-elevated p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</span>
          </div>
          <span className={`text-2xl font-black italic tracking-tighter ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AgentsPanel = () => {
  const [fleet, setFleet] = useState<AgentDefinition[]>(() => buildAgentFleet());
  const [logs, setLogs] = useState<LogEntry[]>(() => buildInitialLogs());
  const [logIdCounter, setLogIdCounter] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { createAgent } = useAgents();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulate live log entries every 8s
  useEffect(() => {
    const LIVE_LOGS = [
      { agent: "SRE Agent",      level: "INFO"   as const, msg: "Health check passed — all 8 services within SLO" },
      { agent: "Cost Agent",     level: "INFO"   as const, msg: "EC2 rightsizing recommendation queued for approval" },
      { agent: "Security Agent", level: "INFO"   as const, msg: "No new threat indicators in last scan window" },
      { agent: "Deploy Agent",   level: "INFO"   as const, msg: "Pipeline idle — next scheduled deploy in 3h" },
      { agent: "SRE Agent",      level: "WARN"   as const, msg: "memory-service p99 rising: 210ms (threshold: 300ms)" },
      { agent: "Security Agent", level: "ACTION" as const, msg: "CVE-2026-1234 patched on 3/4 nodes — 1 pending reboot" },
    ];
    const interval = setInterval(() => {
      const entry = LIVE_LOGS[Math.floor(Math.random() * LIVE_LOGS.length)];
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLogIdCounter(c => {
        const newId = c + 1;
        setLogs(prev => [{ id: newId, ts: now, agent: entry.agent, level: entry.level, msg: entry.msg }, ...prev.slice(0, 29)]);
        return newId;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDecisionApprove = (agentId: string, decId: string) => {
    setFleet(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, decisions: a.decisions.map(d => d.id === decId ? { ...d, outcome: "approved" as const } : d) }
        : a
    ));
    toast.success("Decision approved — agent executing");
  };

  const handleDecisionReject = (agentId: string, decId: string) => {
    setFleet(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, decisions: a.decisions.map(d => d.id === decId ? { ...d, outcome: "rejected" as const } : d) }
        : a
    ));
    toast.info("Decision rejected — no action taken");
  };

  const handleToggleMode = (agentId: string) => {
    const cycle: ExecutionMode[] = ["manual", "approval", "autonomous"];
    setFleet(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const nextIdx = (cycle.indexOf(a.mode) + 1) % cycle.length;
      const newMode = cycle[nextIdx];
      toast.success(`${a.name} → ${newMode} mode`);
      return { ...a, mode: newMode };
    }));
  };

  const handlePause = (agentId: string) => {
    setFleet(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const next: AgentStatus = a.status === "paused" ? "active" : "paused";
      toast.info(`${a.name} ${next === "paused" ? "paused" : "resumed"}`);
      return { ...a, status: next };
    }));
  };

  const LOG_COLORS = {
    INFO:   "text-primary",
    WARN:   "text-yellow-400",
    ERROR:  "text-red-500",
    ACTION: "text-green-400",
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest italic">AI Agent Orchestration</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic mt-0.5">
            Autonomous agents — always reasoning before acting
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5 mr-2" /> Deploy Agent
        </Button>
      </div>

      {/* Observability */}
      <ObservabilityPanel fleet={fleet} />

      {/* Agent Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {fleet.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onDecisionApprove={handleDecisionApprove}
            onDecisionReject={handleDecisionReject}
            onToggleMode={handleToggleMode}
            onPause={handlePause}
          />
        ))}
      </div>

      {/* Live Execution Log */}
      <div className="rounded-2xl border border-border-subtle bg-background-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live Execution Log</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
            Cross-agent signal correlation
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto custom-scrollbar font-mono">
          <AnimatePresence>
            {logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-4 px-5 py-2.5 hover:bg-background/50 transition-colors border-b border-border-subtle/30"
              >
                <span className="text-[9px] font-black text-muted-foreground/30 shrink-0 tabular-nums">{log.ts}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 w-16 ${LOG_COLORS[log.level]}`}>{log.level}</span>
                <span className="text-[9px] font-black text-muted-foreground/50 shrink-0 w-28 truncate">{log.agent}</span>
                <span className="text-[10px] text-muted-foreground/70 leading-relaxed">{log.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Policy Layer */}
      <div className="rounded-2xl border border-border-subtle bg-background-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Safety Policy Layer</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Max Scale Limit", value: "20 replicas / service", icon: Server },
            { label: "Restricted Hours", value: "No prod deploys 22:00–06:00 IST", icon: Clock },
            { label: "Approval Gates", value: "Rollbacks, CIDR blocks, RI purchases", icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border-subtle">
              <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
                <p className="text-[11px] font-black mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 italic border-t border-border-subtle pt-4">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          ORCHESTRATOR: ACTIVE
        </span>
        <span>AGENTS: {fleet.filter(a => a.status !== "paused").length}/{fleet.length} RUNNING</span>
        <span>PENDING: {fleet.flatMap(a => a.decisions).filter(d => d.outcome === "pending").length} APPROVALS</span>
        <span className="ml-auto">POLICY: ENFORCED</span>
      </div>

      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createAgent}
      />
    </div>
  );
};

export default AgentsPanel;
