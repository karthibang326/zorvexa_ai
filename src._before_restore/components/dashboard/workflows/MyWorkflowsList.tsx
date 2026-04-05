import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, MoreHorizontal, ChevronRight,
  CheckCircle2, AlertCircle, Clock, Shield,
  User, Users, Zap, Brain, Calendar, AlertTriangle,
  Lock, Unlock, Activity, TrendingUp, Copy,
  RotateCcw, Terminal, DollarSign, Server,
  GitBranch, SkipForward, XCircle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType  = "metrics" | "logs" | "deployment" | "schedule" | "manual";
type StatusType   = "Active" | "Paused" | "Failed" | "Draft";
type ScopeType    = "personal" | "team";
type RBACRole     = "owner" | "editor" | "viewer";

interface PersonalWorkflow {
  id: string;
  name: string;
  description: string;
  owner: string;
  user_id: string;
  team_id: string | null;
  scope: ScopeType;
  rbac: RBACRole;
  status: StatusType;
  triggerType: TriggerType;
  triggerCondition: string;
  steps: string[];
  safetyConstraints: string[];
  rollbackLogic: string;
  reliability: number;
  invocations: number;
  lastRun: string;
  failures: number;
  lastResult: "success" | "failed" | null;
  lastImpact: string;
  isolated: boolean;
}

interface ExecutionRecord {
  workflow: string;
  owner: string;
  trigger: string;
  actions: string[];
  result: { status: "success" | "failed"; impact: string };
  metrics: { reliability: string; invocations: string };
  next_steps: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CURRENT_USER = { id: "usr-karthi-01", name: "Karthiban G.", team: "Platform Engineering" };

const MY_WORKFLOWS: PersonalWorkflow[] = [
  {
    id: "mwf-001",
    name: "My API Gateway Scale-Out",
    description: "Auto-scale api-gateway when p99 > 800ms for 2m",
    owner: "Karthiban G.",
    user_id: "usr-karthi-01",
    team_id: "team-platform-eng",
    scope: "personal",
    rbac: "owner",
    status: "Active",
    triggerType: "metrics",
    triggerCondition: "p99_latency > 800ms for 2 consecutive minutes",
    steps: ["Validate p99 spike is sustained", "Check HPA ceiling", "Scale api-gateway +4 replicas", "Verify health 60s post-scale"],
    safetyConstraints: ["Max replicas: 14", "Only in production namespace", "No execution during deploy lock"],
    rollbackLogic: "Scale back to original replica count if p99 not improved within 3 minutes",
    reliability: 97.2,
    invocations: 318,
    lastRun: "4m ago",
    failures: 9,
    lastResult: "success",
    lastImpact: "p99 dropped from 920ms → 310ms. SLA restored.",
    isolated: true,
  },
  {
    id: "mwf-002",
    name: "My Staging Cleanup",
    description: "Remove stale staging deployments older than 7 days",
    owner: "Karthiban G.",
    user_id: "usr-karthi-01",
    team_id: null,
    scope: "personal",
    rbac: "owner",
    status: "Active",
    triggerType: "schedule",
    triggerCondition: "Every Sunday at 02:00 UTC",
    steps: ["List deployments in staging older than 7d", "Verify no active traffic on each", "Delete deployment + associated PVCs", "Notify via Slack"],
    safetyConstraints: ["Staging namespace only", "Skip if traffic > 0 rps", "Max 10 deletions per run"],
    rollbackLogic: "N/A — deletion is permanent. Dry-run mode available.",
    reliability: 100,
    invocations: 12,
    lastRun: "3d ago",
    failures: 0,
    lastResult: "success",
    lastImpact: "Freed 42Gi storage, saved $18/mo.",
    isolated: true,
  },
  {
    id: "mwf-003",
    name: "Team Deploy Notifier",
    description: "Alert team Slack channel on any production deploy event",
    owner: "Karthiban G.",
    user_id: "usr-karthi-01",
    team_id: "team-platform-eng",
    scope: "team",
    rbac: "owner",
    status: "Active",
    triggerType: "deployment",
    triggerCondition: "Any deployment status change in production namespace",
    steps: ["Capture deployment event", "Extract service, version, author, status", "Post to #platform-deploys Slack channel", "Link to run logs"],
    safetyConstraints: ["Read-only — no infra changes", "Rate-limit: max 20 notifications/hour"],
    rollbackLogic: "N/A — notification only workflow",
    reliability: 99.8,
    invocations: 1204,
    lastRun: "11m ago",
    failures: 2,
    lastResult: "success",
    lastImpact: "Deploy event posted to #platform-deploys for checkout-service v1.9.1.",
    isolated: false,
  },
  {
    id: "mwf-004",
    name: "My OOMKill Rollback",
    description: "Auto-rollback if OOMKill detected in any owned service",
    owner: "Karthiban G.",
    user_id: "usr-karthi-01",
    team_id: "team-platform-eng",
    scope: "personal",
    rbac: "owner",
    status: "Failed",
    triggerType: "logs",
    triggerCondition: "OOMKilled event in kubelet logs for any service in production",
    steps: ["Detect OOMKill event", "Identify owning deployment", "Check rollback availability", "Execute rollback to previous stable version", "Notify owner via email"],
    safetyConstraints: ["Only rollback owned services", "Confidence > 85% required", "Skip if already rolling back"],
    rollbackLogic: "kubectl rollout undo to last known stable version",
    reliability: 74.3,
    invocations: 35,
    lastRun: "2h ago",
    failures: 9,
    lastResult: "failed",
    lastImpact: "Rollback blocked — no previous revision available for payment-service v2.4.1.",
    isolated: true,
  },
  {
    id: "mwf-005",
    name: "Draft: Cost Alert Hook",
    description: "Alert when personal namespace cost exceeds daily budget",
    owner: "Karthiban G.",
    user_id: "usr-karthi-01",
    team_id: null,
    scope: "personal",
    rbac: "owner",
    status: "Draft",
    triggerType: "metrics",
    triggerCondition: "Daily spend > $50 in dev-karthi namespace",
    steps: ["Monitor daily spend via AWS Cost Explorer API", "Alert if threshold exceeded", "Suggest resource candidates for termination"],
    safetyConstraints: ["dev-karthi namespace only", "No auto-termination without confirmation"],
    rollbackLogic: "N/A",
    reliability: 0,
    invocations: 0,
    lastRun: "Never",
    failures: 0,
    lastResult: null,
    lastImpact: "Not yet executed.",
    isolated: true,
  },
];

const buildExecution = (wf: PersonalWorkflow): ExecutionRecord => ({
  workflow: wf.name,
  owner: wf.user_id,
  trigger: wf.triggerCondition,
  actions: wf.steps,
  result: {
    status: wf.lastResult ?? "success",
    impact: wf.lastImpact,
  },
  metrics: {
    reliability: `${wf.reliability}%`,
    invocations: wf.invocations.toString(),
  },
  next_steps: wf.lastResult === "failed"
    ? ["Review failure log", "Check safety constraint causing block", "Notify owner — manual remediation required"]
    : ["Monitor for 5m post-execution", `Update reliability score → ${wf.reliability}%`, "Log execution to audit trail"],
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280] italic mb-2">{children}</p>
);

const STATUS_META: Record<StatusType, { dot: string; text: string; bg: string }> = {
  Active: { dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Paused: { dot: "bg-yellow-400",  text: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20"  },
  Failed: { dot: "bg-red-400 animate-pulse", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  Draft:  { dot: "bg-[#4B5563]",   text: "text-[#6B7280]",  bg: "bg-white/5 border-white/10"             },
};

const TRIGGER_ICON: Record<TriggerType, React.ReactNode> = {
  metrics:    <Activity className="w-3 h-3" />,
  logs:       <Terminal className="w-3 h-3" />,
  deployment: <GitBranch className="w-3 h-3" />,
  schedule:   <Calendar className="w-3 h-3" />,
  manual:     <User className="w-3 h-3" />,
};

const TRIGGER_COLOR: Record<TriggerType, string> = {
  metrics:    "text-primary/70",
  logs:       "text-orange-400/70",
  deployment: "text-violet-400/70",
  schedule:   "text-blue-400/70",
  manual:     "text-[#9CA3AF]/70",
};

const ReliabilityBar = ({ rate, invocations }: { rate: number; invocations: number }) => {
  const color = rate >= 95 ? "bg-emerald-400" : rate >= 75 ? "bg-yellow-400" : rate === 0 ? "bg-[#374151]" : "bg-red-400";
  const text  = rate >= 95 ? "text-emerald-400" : rate >= 75 ? "text-yellow-400" : rate === 0 ? "text-[#4B5563]" : "text-red-400";
  return (
    <div className="flex flex-col gap-1.5 w-[110px]">
      <div className="flex items-center justify-between">
        <span className={cn("text-[12px] font-bold tabular-nums", text)}>{rate === 0 ? "—" : `${rate}%`}</span>
        <span className="text-[9px] font-mono text-[#6B7280]">{invocations === 0 ? "0 runs" : `${invocations.toLocaleString()}`}</span>
      </div>
      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={cn("h-full", color)} />
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const WorkflowDetail = ({ wf, onClose }: { wf: PersonalWorkflow; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "execution" | "security">("overview");
  const [isRunning, setIsRunning] = useState(false);
  const execution = buildExecution(wf);

  const runWorkflow = async () => {
    if (wf.status === "Draft") { toast.error("Activate workflow before running"); return; }
    setIsRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsRunning(false);
    toast.success(`${wf.name} executed successfully`);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(execution, null, 2));
    toast.success("Execution JSON copied");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full border-l border-[#1F2937] bg-[#0B1220]"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-[#1F2937] shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-[#E5E7EB] leading-snug">{wf.name}</h3>
            <p className="text-[11px] italic text-[#6B7280] mt-0.5">{wf.description}</p>
          </div>
          <button onClick={onClose} className="text-[#4B5563] hover:text-[#9CA3AF] text-lg font-black shrink-0 leading-none">×</button>
        </div>

        {/* Owner + scope row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest italic text-[#6B7280]">
            <User className="w-3 h-3" />{wf.user_id}
          </div>
          {wf.team_id && (
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest italic text-blue-400/70">
              <Users className="w-3 h-3" />{wf.team_id}
            </div>
          )}
          <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest italic px-2 py-0.5 rounded-lg border",
            wf.scope === "personal" ? "text-primary/70 bg-primary/10 border-primary/20" : "text-blue-400/70 bg-blue-500/10 border-blue-500/20"
          )}>
            {wf.scope === "personal" ? <Lock className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
            {wf.scope}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest italic text-emerald-400/70">
            <Shield className="w-2.5 h-2.5" />{wf.rbac}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 px-6 border-b border-[#1F2937] shrink-0">
        {(["overview", "execution", "security"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("text-[10px] font-bold capitalize tracking-wide italic h-9 transition-colors relative",
              activeTab === t ? "text-[#E5E7EB]" : "text-[#6B7280] hover:text-[#9CA3AF]"
            )}>
            {t}
            {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="p-5 space-y-4">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Reliability",  value: wf.reliability === 0 ? "—" : `${wf.reliability}%`,  color: wf.reliability >= 95 ? "text-emerald-400" : wf.reliability >= 75 ? "text-yellow-400" : wf.reliability === 0 ? "text-[#4B5563]" : "text-red-400" },
                    { label: "Invocations",  value: wf.invocations.toLocaleString(),                    color: "text-[#E5E7EB]" },
                    { label: "Last Run",     value: wf.lastRun,                                         color: "text-[#9CA3AF]" },
                    { label: "Failures",     value: wf.failures.toString(),                             color: wf.failures > 0 ? "text-red-400" : "text-[#4B5563]" },
                  ].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-[#1F2937]">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic mb-1">{m.label}</p>
                      <p className={cn("text-[13px] font-black italic tabular-nums", m.color)}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Trigger */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
                  <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest italic", TRIGGER_COLOR[wf.triggerType])}>
                    {TRIGGER_ICON[wf.triggerType]}{wf.triggerType} trigger
                  </div>
                  <p className="text-[11px] italic text-[#9CA3AF] leading-relaxed">{wf.triggerCondition}</p>
                </div>

                {/* Steps */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
                  <SectionLabel>Execution Steps</SectionLabel>
                  <div className="space-y-2">
                    {wf.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-primary/15 border border-primary/25 text-primary text-[8px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-[10px] italic text-[#9CA3AF] leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last result */}
                {wf.lastResult && (
                  <div className={cn("p-4 rounded-xl border space-y-1.5",
                    wf.lastResult === "success" ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"
                  )}>
                    <div className="flex items-center gap-2">
                      {wf.lastResult === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className={cn("text-[9px] font-black uppercase tracking-widest italic", wf.lastResult === "success" ? "text-emerald-400" : "text-red-400")}>Last Result</span>
                    </div>
                    <p className="text-[10px] italic text-[#9CA3AF] leading-relaxed">{wf.lastImpact}</p>
                  </div>
                )}
              </>
            )}

            {/* ── EXECUTION JSON ── */}
            {activeTab === "execution" && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel>Response Format</SectionLabel>
                  <button onClick={copyJSON} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest italic text-[#6B7280] hover:text-primary transition-colors">
                    <Copy className="w-3 h-3" />Copy
                  </button>
                </div>

                {/* workflow + owner + trigger */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-3">
                  {[
                    { field: "workflow", value: execution.workflow },
                    { field: "owner",   value: execution.owner },
                    { field: "trigger", value: execution.trigger },
                  ].map(({ field, value }) => (
                    <div key={field}>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic mb-0.5">{field}</p>
                      <p className="text-[11px] italic text-[#E5E7EB]/80 leading-relaxed font-mono">{value}</p>
                    </div>
                  ))}
                </div>

                {/* actions */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
                  <SectionLabel>Actions</SectionLabel>
                  {execution.actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/15 border border-primary/25 text-primary text-[8px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-[10px] italic text-[#9CA3AF] leading-snug">{a}</span>
                    </div>
                  ))}
                </div>

                {/* result */}
                <div className={cn("p-4 rounded-xl border space-y-2",
                  execution.result.status === "success" ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"
                )}>
                  <div className="flex items-center justify-between">
                    <SectionLabel>Result</SectionLabel>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest italic px-2 py-0.5 rounded-lg border",
                      execution.result.status === "success" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"
                    )}>{execution.result.status}</span>
                  </div>
                  <p className="text-[10px] italic text-[#9CA3AF] leading-relaxed">{execution.result.impact}</p>
                </div>

                {/* metrics */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937]">
                  <SectionLabel>Metrics</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#6B7280] italic">Reliability</p>
                      <p className={cn("text-[13px] font-black italic tabular-nums mt-0.5",
                        wf.reliability >= 95 ? "text-emerald-400" : wf.reliability >= 75 ? "text-yellow-400" : wf.reliability === 0 ? "text-[#4B5563]" : "text-red-400"
                      )}>{execution.metrics.reliability}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#6B7280] italic">Invocations</p>
                      <p className="text-[13px] font-black italic tabular-nums text-[#E5E7EB] mt-0.5">{parseInt(execution.metrics.invocations).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* next_steps */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
                  <SectionLabel>Next Steps</SectionLabel>
                  {execution.next_steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                      <span className="text-[10px] italic text-[#9CA3AF] leading-snug">{s}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "security" && (
              <>
                {/* Isolation status */}
                <div className={cn("p-4 rounded-xl border space-y-3",
                  wf.isolated ? "bg-emerald-500/5 border-emerald-500/15" : "bg-blue-500/5 border-blue-500/15"
                )}>
                  <div className="flex items-center gap-2">
                    {wf.isolated ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Users className="w-3.5 h-3.5 text-blue-400" />}
                    <span className={cn("text-[9px] font-black uppercase tracking-widest italic", wf.isolated ? "text-emerald-400" : "text-blue-400")}>
                      {wf.isolated ? "Strict User Isolation" : "Team-Shared Scope"}
                    </span>
                  </div>
                  <p className="text-[10px] italic text-[#9CA3AF] leading-relaxed">
                    {wf.isolated
                      ? "This workflow can only affect resources owned by usr-karthi-01. Cross-user impact is blocked at execution layer."
                      : "This workflow operates in team scope. Actions are visible to all members of team-platform-eng."}
                  </p>
                </div>

                {/* RBAC */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-3">
                  <SectionLabel>RBAC Policy</SectionLabel>
                  {[
                    { role: "Owner",  subject: wf.user_id,    perms: "Read · Write · Execute · Delete", granted: true },
                    { role: "Team",   subject: wf.team_id ?? "—",   perms: wf.team_id ? "Read · Execute" : "No team access", granted: !!wf.team_id },
                    { role: "Global", subject: "Other users",  perms: "No access",   granted: false },
                  ].map((r, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn("w-2 h-2 rounded-full mt-1 shrink-0", r.granted ? "bg-emerald-400" : "bg-[#374151]")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest italic text-[#E5E7EB]/60">{r.role}</span>
                          <span className="text-[9px] font-mono text-[#6B7280]">{r.subject}</span>
                        </div>
                        <p className={cn("text-[10px] italic", r.granted ? "text-[#9CA3AF]" : "text-[#4B5563]")}>{r.perms}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Safety constraints */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
                  <SectionLabel>Safety Constraints</SectionLabel>
                  {wf.safetyConstraints.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Shield className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                      <span className="text-[10px] italic text-[#9CA3AF] leading-snug">{c}</span>
                    </div>
                  ))}
                </div>

                {/* Rollback */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-1.5">
                  <SectionLabel>Rollback Logic</SectionLabel>
                  <p className="text-[10px] italic text-[#9CA3AF] leading-relaxed">{wf.rollbackLogic}</p>
                </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Run button */}
      <div className="p-5 border-t border-[#1F2937] shrink-0">
        <Button
          onClick={runWorkflow}
          disabled={isRunning || wf.status === "Draft"}
          className={cn(
            "w-full h-10 font-black uppercase text-[10px] tracking-[0.25em] italic rounded-xl transition-all active:scale-[0.98]",
            wf.status === "Draft"
              ? "bg-white/5 text-[#4B5563] border border-[#1F2937] cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          )}
        >
          {isRunning ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />Executing…</>
          ) : wf.status === "Draft" ? (
            "Activate to Run"
          ) : (
            <><Play className="w-3.5 h-3.5 mr-2" />Run Workflow</>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const MyWorkflowsList = () => {
  const [selected, setSelected] = useState<PersonalWorkflow | null>(null);
  const [filterScope, setFilterScope] = useState<"all" | ScopeType>("all");

  const filtered = filterScope === "all"
    ? MY_WORKFLOWS
    : MY_WORKFLOWS.filter((w) => w.scope === filterScope);

  const stats = {
    total:       MY_WORKFLOWS.length,
    active:      MY_WORKFLOWS.filter((w) => w.status === "Active").length,
    totalRuns:   MY_WORKFLOWS.reduce((a, w) => a + w.invocations, 0),
    avgReliability: MY_WORKFLOWS.filter((w) => w.invocations > 0).reduce((a, w, _, arr) => a + w.reliability / arr.length, 0),
  };

  return (
    <div className="flex h-full bg-[#0B1220] overflow-hidden">

      {/* ── Left: list ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Owner header */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-[#1F2937] shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-[12px] italic">K</div>
            <div>
              <p className="text-[11px] font-bold text-[#E5E7EB]">{CURRENT_USER.name}</p>
              <p className="text-[9px] font-mono text-[#6B7280] italic">{CURRENT_USER.id} · {CURRENT_USER.team}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest italic text-emerald-400">
              <Shield className="w-2.5 h-2.5" />Owner Scope Active
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            {[
              { label: "My Workflows",  value: stats.total,                                          color: "text-[#E5E7EB]" },
              { label: "Active",        value: stats.active,                                         color: "text-emerald-400" },
              { label: "Total Runs",    value: stats.totalRuns.toLocaleString(),                     color: "text-[#E5E7EB]" },
              { label: "Avg Reliability", value: `${Math.round(stats.avgReliability * 10) / 10}%`,  color: "text-primary" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic">{s.label}</span>
                <span className={cn("text-[13px] font-black italic tabular-nums", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-11 border-b border-[#1F2937] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-1.5">
            {(["all", "personal", "team"] as const).map((s) => (
              <button key={s} onClick={() => setFilterScope(s)} className={cn(
                "px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest italic transition-all",
                filterScope === s ? "bg-primary/15 border-primary/30 text-primary" : "border-[#1F2937] text-[#6B7280] hover:text-[#E5E7EB]"
              )}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F2937]">
                {["Workflow", "Scope", "Trigger", "Status", "Reliability", "Last Run", ""].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wf, i) => {
                const s = STATUS_META[wf.status];
                const isSelected = selected?.id === wf.id;
                return (
                  <motion.tr
                    key={wf.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(isSelected ? null : wf)}
                    className={cn(
                      "group border-b border-[#1F2937] transition-colors cursor-pointer",
                      isSelected ? "bg-primary/5" : "hover:bg-white/[0.025]"
                    )}
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-[13px] font-semibold leading-none", isSelected ? "text-primary" : "text-[#E5E7EB] group-hover:text-white")}>{wf.name}</span>
                        <span className="text-[10px] text-[#6B7280] italic font-mono">{wf.id}</span>
                      </div>
                    </td>
                    {/* Scope */}
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic",
                        wf.scope === "personal" ? "text-primary/70 bg-primary/10 border-primary/20" : "text-blue-400/70 bg-blue-500/10 border-blue-500/20"
                      )}>
                        {wf.scope === "personal" ? <Lock className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}{wf.scope}
                      </span>
                    </td>
                    {/* Trigger */}
                    <td className="px-6 py-4">
                      <span className={cn("flex items-center gap-1.5 text-[10px] font-bold italic", TRIGGER_COLOR[wf.triggerType])}>
                        {TRIGGER_ICON[wf.triggerType]}{wf.triggerType}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold", s.text, s.bg)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />{wf.status}
                      </span>
                    </td>
                    {/* Reliability */}
                    <td className="px-6 py-4">
                      <ReliabilityBar rate={wf.reliability} invocations={wf.invocations} />
                    </td>
                    {/* Last run */}
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-[#9CA3AF]">{wf.lastRun}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelected(wf); }}
                          className="h-7 w-7 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <div className="h-9 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between px-8 text-[8px] font-mono font-black uppercase tracking-[0.2em] italic shrink-0">
          <div className="flex items-center gap-6 text-white/40">
            <span><span className="text-emerald-400/80">●</span> Isolation: Strict User Scope</span>
            <span><span className="text-primary/80">●</span> RBAC: Enforced</span>
            <span><span className="text-violet-400/80">●</span> Conflict Check: Active</span>
          </div>
          <span className="text-white/20">usr-karthi-01 · {MY_WORKFLOWS.length} owned</span>
        </div>
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="w-[380px] shrink-0">
            <WorkflowDetail wf={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyWorkflowsList;
