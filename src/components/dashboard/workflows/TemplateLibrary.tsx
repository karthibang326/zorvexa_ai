import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, TrendingUp, GitBranch, Activity,
  Shield, DollarSign, Plus, ChevronRight,
  CheckCircle2, AlertCircle, Copy, Zap,
  Server, Cpu, Clock, Terminal, RotateCcw,
  Package, Search, ArrowRight, Info,
  BookOpen, Star, Users, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateCategory = "scaling" | "deployment" | "monitoring" | "security" | "cost";
type EnvType = "production" | "staging" | "development" | "all";

interface TemplateInput {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "number" | "select";
  options?: string[];
  required: boolean;
  validation?: { min?: number; max?: number; pattern?: string };
  hint?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  triggerLogic: string;
  steps: string[];
  requiredInputs: TemplateInput[];
  safetyConstraints: string[];
  rollbackLogic: string;
  popularity: number;   // 1–5
  teams: number;
  env: EnvType;
  estimatedRuntime: string;
}

interface GeneratedOutput {
  template: string;
  inputs: Record<string, string>;
  generated_workflow: { name: string; steps: string[] };
  validation: { status: "valid" | "invalid"; errors: string[] };
}

// ─── Templates data ───────────────────────────────────────────────────────────

const TEMPLATES: WorkflowTemplate[] = [
  // ── Scaling ──
  {
    id: "tpl-sc-001",
    name: "CPU Throttle Auto-Scale",
    description: "Scale out replicas when CPU throttle ratio exceeds threshold for N minutes.",
    category: "scaling",
    triggerLogic: "throttle_ratio > {{threshold}} for {{duration}}m across all replicas",
    steps: [
      "Validate throttle_ratio sustained above threshold for {{duration}}m",
      "Check HPA ceiling — abort if at max_replicas",
      "Scale {{service_name}} by +{{scale_step}} replicas via kubectl scale",
      "Wait {{wait_seconds}}s for pod readiness",
      "Verify throttle_ratio drops below threshold",
      "Update reliability score and log result",
    ],
    requiredInputs: [
      { key: "service_name",   label: "Service Name",      placeholder: "api-gateway",   type: "text",   required: true,  hint: "Kubernetes deployment name" },
      { key: "cluster_id",     label: "Cluster ID",        placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",      label: "Namespace",         placeholder: "production",    type: "text",   required: true },
      { key: "threshold",      label: "Throttle Ratio",    placeholder: "0.80",          type: "number", required: true,  validation: { min: 0.5, max: 0.99 }, hint: "0.0–1.0" },
      { key: "duration",       label: "Sustained (min)",   placeholder: "3",             type: "number", required: true,  validation: { min: 1, max: 15 } },
      { key: "scale_step",     label: "Scale Step",        placeholder: "4",             type: "number", required: true,  validation: { min: 1, max: 20 } },
      { key: "max_replicas",   label: "Max Replicas",      placeholder: "20",            type: "number", required: true,  validation: { min: 2, max: 100 } },
      { key: "wait_seconds",   label: "Readiness Wait (s)", placeholder: "60",           type: "number", required: false, validation: { min: 10, max: 300 } },
      { key: "environment",    label: "Environment",       placeholder: "production",    type: "select", required: true,  options: ["production", "staging", "development"] },
    ],
    safetyConstraints: ["Max replicas ceiling enforced", "Abort if recent deploy < 5m ago", "Rate limit: 1 scale per 10m"],
    rollbackLogic: "Scale back to original replica count if throttle_ratio not improved within 3m post-scale",
    popularity: 5,
    teams: 38,
    env: "production",
    estimatedRuntime: "~90s",
  },
  {
    id: "tpl-sc-002",
    name: "Latency Spike HPA Scale-Out",
    description: "Trigger HPA scale when p99 latency breaches SLA threshold.",
    category: "scaling",
    triggerLogic: "p99_latency > {{latency_threshold}}ms for {{duration}}m",
    steps: [
      "Confirm p99 spike is sustained (not a transient blip)",
      "Cross-check CPU and memory — rule out resource exhaustion",
      "Patch HPA min replicas to {{target_replicas}} for {{service_name}}",
      "Monitor p99 for 2m post-scale",
      "Restore original HPA config if no improvement",
    ],
    requiredInputs: [
      { key: "service_name",       label: "Service Name",         placeholder: "checkout-api",  type: "text",   required: true },
      { key: "cluster_id",         label: "Cluster ID",           placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",          label: "Namespace",            placeholder: "production",    type: "text",   required: true },
      { key: "latency_threshold",  label: "p99 Threshold (ms)",   placeholder: "800",           type: "number", required: true, validation: { min: 100, max: 10000 } },
      { key: "duration",           label: "Sustained (min)",      placeholder: "2",             type: "number", required: true, validation: { min: 1, max: 10 } },
      { key: "target_replicas",    label: "Target Replicas",      placeholder: "12",            type: "number", required: true, validation: { min: 2, max: 50 } },
      { key: "environment",        label: "Environment",          placeholder: "production",    type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["HPA max_replicas ceiling enforced", "No execution during deploy lock", "Cooldown: 5m between triggers"],
    rollbackLogic: "Revert HPA minReplicas to original value if p99 unchanged after 2m",
    popularity: 4,
    teams: 24,
    env: "production",
    estimatedRuntime: "~3m",
  },
  // ── Deployment ──
  {
    id: "tpl-dp-001",
    name: "Canary Deployment",
    description: "Progressive traffic shift: 10% → 50% → 100% with automated health gates.",
    category: "deployment",
    triggerLogic: "Manual trigger — user initiates canary for {{service_name}} version {{new_version}}",
    steps: [
      "Deploy {{service_name}} {{new_version}} to 10% of traffic (canary pod group)",
      "Gate 1: Monitor error rate and p99 for 5m at 10%",
      "If Gate 1 passed → shift to 50% traffic",
      "Gate 2: Monitor error rate and p99 for 5m at 50%",
      "If Gate 2 passed → promote to 100% (full rollout)",
      "If any gate fails → rollback to {{stable_version}} immediately",
    ],
    requiredInputs: [
      { key: "service_name",    label: "Service Name",      placeholder: "payment-service", type: "text",   required: true },
      { key: "cluster_id",      label: "Cluster ID",        placeholder: "eks-prod-us-1",   type: "text",   required: true },
      { key: "namespace",       label: "Namespace",         placeholder: "production",      type: "text",   required: true },
      { key: "new_version",     label: "New Version",       placeholder: "v2.4.2",          type: "text",   required: true },
      { key: "stable_version",  label: "Stable Version",    placeholder: "v2.4.1",          type: "text",   required: true },
      { key: "error_threshold", label: "Max Error Rate (%)", placeholder: "1.0",            type: "number", required: true, validation: { min: 0.1, max: 10 } },
      { key: "latency_gate",   label: "Max p99 (ms)",       placeholder: "500",             type: "number", required: true, validation: { min: 50, max: 5000 } },
      { key: "environment",    label: "Environment",        placeholder: "production",      type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["Automatic rollback if error gate breached", "Max 3 canary deploys per day", "Notify team on gate failure"],
    rollbackLogic: "kubectl rollout undo to stable_version if any health gate fails",
    popularity: 5,
    teams: 52,
    env: "production",
    estimatedRuntime: "15–30m",
  },
  {
    id: "tpl-dp-002",
    name: "Auto-Rollback on Failure",
    description: "Detect deploy regressions and auto-rollback within 60 seconds.",
    category: "deployment",
    triggerLogic: "Deployment status change → error_rate > {{error_threshold}}% or p99 > {{latency_threshold}}ms within {{window}}m of deploy",
    steps: [
      "Listen for deployment completion event on {{service_name}}",
      "Monitor error rate and p99 for {{window}}m post-deploy",
      "If regression detected → confirm signal is sustained (not transient)",
      "Execute kubectl rollout undo for {{service_name}}",
      "Verify rollback health (5/5 pods Running, metrics normalized)",
      "Notify owner and log rollback reason",
    ],
    requiredInputs: [
      { key: "service_name",       label: "Service Name",       placeholder: "api-gateway",   type: "text",   required: true },
      { key: "cluster_id",         label: "Cluster ID",         placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",          label: "Namespace",          placeholder: "production",    type: "text",   required: true },
      { key: "error_threshold",    label: "Error Rate Gate (%)", placeholder: "2.0",          type: "number", required: true, validation: { min: 0.5, max: 20 } },
      { key: "latency_threshold",  label: "p99 Gate (ms)",      placeholder: "1000",          type: "number", required: true, validation: { min: 100, max: 10000 } },
      { key: "window",             label: "Watch Window (min)", placeholder: "5",             type: "number", required: true, validation: { min: 1, max: 30 } },
      { key: "environment",        label: "Environment",        placeholder: "production",    type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["Rollback only if previous revision exists", "Skip if manual rollback already in progress", "Confidence > 80% required"],
    rollbackLogic: "kubectl rollout undo — automatic, no confirmation required if confidence > 85%",
    popularity: 5,
    teams: 61,
    env: "production",
    estimatedRuntime: "~2m",
  },
  // ── Monitoring ──
  {
    id: "tpl-mn-001",
    name: "SLA Breach Alert + Escalate",
    description: "Detect SLA breach and escalate through PagerDuty → Slack → incident creation.",
    category: "monitoring",
    triggerLogic: "Uptime drops below {{sla_target}}% OR p99 > {{latency_gate}}ms for {{duration}}m",
    steps: [
      "Detect SLA breach condition on {{service_name}}",
      "Calculate current uptime and p99 against SLA targets",
      "Fire PagerDuty alert P{{severity}} to on-call engineer",
      "Post incident summary to #{{slack_channel}} Slack channel",
      "Create incident record in incident management system",
      "Attach system snapshot (metrics, recent logs, last deploy info)",
    ],
    requiredInputs: [
      { key: "service_name",   label: "Service Name",      placeholder: "api-gateway",   type: "text",   required: true },
      { key: "cluster_id",     label: "Cluster ID",        placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "sla_target",     label: "SLA Target (%)",    placeholder: "99.99",         type: "number", required: true, validation: { min: 90, max: 100 } },
      { key: "latency_gate",   label: "Latency Gate (ms)", placeholder: "500",           type: "number", required: true, validation: { min: 50, max: 5000 } },
      { key: "duration",       label: "Sustained (min)",   placeholder: "2",             type: "number", required: true, validation: { min: 1, max: 10 } },
      { key: "severity",       label: "PD Severity",       placeholder: "2",             type: "select", required: true, options: ["1", "2", "3", "4"] },
      { key: "slack_channel",  label: "Slack Channel",     placeholder: "platform-incidents", type: "text", required: true },
      { key: "environment",    label: "Environment",       placeholder: "production",    type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["Rate limit: 1 alert per 5m per service", "Dedup: skip if active incident exists", "Auto-close if SLA restored for 10m"],
    rollbackLogic: "N/A — notification-only workflow, no infra changes",
    popularity: 4,
    teams: 44,
    env: "production",
    estimatedRuntime: "~15s",
  },
  {
    id: "tpl-mn-002",
    name: "Error Rate Spike Response",
    description: "Detect error rate spikes and trigger automated triage + remediation chain.",
    category: "monitoring",
    triggerLogic: "error_rate > {{error_threshold}}% for {{duration}}m on {{service_name}}",
    steps: [
      "Confirm error rate spike sustained above {{error_threshold}}%",
      "Correlate with recent deployments (last 30m) and traffic changes",
      "If deploy-correlated → trigger Auto-Rollback workflow",
      "If not deploy-correlated → scale out by {{scale_step}} replicas",
      "Notify on-call via PagerDuty with triage snapshot",
      "Re-evaluate error rate after 3m — escalate if unresolved",
    ],
    requiredInputs: [
      { key: "service_name",     label: "Service Name",       placeholder: "checkout-api",  type: "text",   required: true },
      { key: "cluster_id",       label: "Cluster ID",         placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",        label: "Namespace",          placeholder: "production",    type: "text",   required: true },
      { key: "error_threshold",  label: "Error Threshold (%)", placeholder: "5.0",         type: "number", required: true, validation: { min: 1, max: 50 } },
      { key: "duration",         label: "Sustained (min)",    placeholder: "2",             type: "number", required: true, validation: { min: 1, max: 10 } },
      { key: "scale_step",       label: "Scale Step",         placeholder: "3",             type: "number", required: false, validation: { min: 1, max: 10 } },
      { key: "environment",      label: "Environment",        placeholder: "production",    type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["No rollback without deploy correlation confirmation", "Scale limited to +10 replicas max", "Cooldown: 5m between triggers"],
    rollbackLogic: "Defer to Auto-Rollback template if deploy-correlated; otherwise revert scale after 10m if error rate normalized",
    popularity: 4,
    teams: 31,
    env: "production",
    estimatedRuntime: "~4m",
  },
  // ── Security ──
  {
    id: "tpl-sc2-001",
    name: "Secret Rotation Automation",
    description: "Rotate secrets in Vault/AWS Secrets Manager and propagate to Kubernetes secrets.",
    category: "security",
    triggerLogic: "Schedule: every {{rotation_days}} days OR manual trigger",
    steps: [
      "Generate new secret value via {{secret_backend}} API",
      "Store new secret in {{secret_backend}} under {{secret_path}}",
      "Update Kubernetes secret in {{namespace}} namespace",
      "Trigger rolling restart on {{service_name}} to pick up new secret",
      "Verify pods restart successfully with new credentials",
      "Invalidate old secret version after {{grace_period}}h",
    ],
    requiredInputs: [
      { key: "service_name",    label: "Service Name",       placeholder: "auth-service",  type: "text",   required: true },
      { key: "cluster_id",      label: "Cluster ID",         placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",       label: "Namespace",          placeholder: "production",    type: "text",   required: true },
      { key: "secret_path",     label: "Secret Path",        placeholder: "prod/auth/db",  type: "text",   required: true },
      { key: "secret_backend",  label: "Secret Backend",     placeholder: "vault",         type: "select", required: true, options: ["vault", "aws-secrets-manager", "gcp-secret-manager"] },
      { key: "rotation_days",   label: "Rotation (days)",    placeholder: "30",            type: "number", required: true, validation: { min: 1, max: 365 } },
      { key: "grace_period",    label: "Grace Period (hr)",  placeholder: "24",            type: "number", required: true, validation: { min: 1, max: 72 } },
      { key: "environment",     label: "Environment",        placeholder: "production",    type: "select", required: true, options: ["production", "staging"] },
    ],
    safetyConstraints: ["Never log secret values", "Grace period before invalidation", "Notify security team on rotation"],
    rollbackLogic: "Restore previous secret version if pod restart fails — kubectl rollout undo",
    popularity: 3,
    teams: 19,
    env: "all",
    estimatedRuntime: "~5m",
  },
  // ── Cost ──
  {
    id: "tpl-co-001",
    name: "Idle Resource Terminator",
    description: "Identify and terminate idle nodes, zombie pods, and orphaned volumes to cut waste.",
    category: "cost",
    triggerLogic: "Schedule: every {{schedule}} OR cost spike > {{cost_threshold}}% above baseline",
    steps: [
      "Scan {{cluster_id}} for nodes with CPU < {{cpu_idle_threshold}}% for {{idle_duration}}h",
      "Identify pods with no active traffic and no scheduled jobs",
      "List orphaned PVCs not bound to any running pod",
      "Generate deletion plan with estimated monthly savings",
      "Dry-run if {{dry_run}} = true — skip actual deletion",
      "Delete confirmed idle resources with 60s drain window",
      "Report savings to cost dashboard and notify {{notify_channel}}",
    ],
    requiredInputs: [
      { key: "cluster_id",          label: "Cluster ID",         placeholder: "eks-prod-us-1", type: "text",   required: true },
      { key: "namespace",           label: "Namespace",          placeholder: "all",           type: "text",   required: true, hint: "'all' to scan cluster-wide" },
      { key: "cpu_idle_threshold",  label: "CPU Idle % (below)", placeholder: "5",             type: "number", required: true, validation: { min: 1, max: 20 } },
      { key: "idle_duration",       label: "Idle Duration (hr)", placeholder: "24",            type: "number", required: true, validation: { min: 1, max: 168 } },
      { key: "cost_threshold",      label: "Cost Spike (%)",     placeholder: "150",           type: "number", required: false, validation: { min: 110, max: 1000 } },
      { key: "schedule",            label: "Schedule",           placeholder: "weekly",        type: "select", required: true, options: ["daily", "weekly", "monthly"] },
      { key: "dry_run",             label: "Dry Run",            placeholder: "true",          type: "select", required: true, options: ["true", "false"], hint: "Always start with dry_run=true" },
      { key: "notify_channel",      label: "Notify Channel",     placeholder: "platform-cost", type: "text",   required: true },
      { key: "environment",         label: "Environment",        placeholder: "production",    type: "select", required: true, options: ["production", "staging", "development", "all"] },
    ],
    safetyConstraints: ["Always dry-run first", "Never delete running pods with active traffic", "Max 20 resources deleted per run", "60s drain window before termination"],
    rollbackLogic: "N/A — deletion is permanent. Dry-run mode available. Snapshot PVC data before deletion.",
    popularity: 4,
    teams: 27,
    env: "all",
    estimatedRuntime: "~10m",
  },
];

// ─── Category metadata ────────────────────────────────────────────────────────

const CAT_META: Record<TemplateCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  scaling:    { label: "Scaling",     icon: <TrendingUp className="w-4 h-4" />,  color: "text-primary",     bg: "bg-primary/10 border-primary/20"       },
  deployment: { label: "Deployment",  icon: <GitBranch className="w-4 h-4" />,   color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20"  },
  monitoring: { label: "Monitoring",  icon: <Activity className="w-4 h-4" />,    color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20"  },
  security:   { label: "Security",    icon: <Shield className="w-4 h-4" />,      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20"        },
  cost:       { label: "Cost",        icon: <DollarSign className="w-4 h-4" />,  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280] italic mb-2">{children}</p>
);

const CategoryPill = ({ cat, active, count, onClick }: { cat: TemplateCategory; active: boolean; count: number; onClick: () => void }) => {
  const m = CAT_META[cat];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
        active ? cn(m.bg, "border-current shadow-sm", m.color) : "border-transparent text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/[0.03]"
      )}
    >
      <span className={cn("shrink-0", active ? m.color : "text-[#4B5563]")}>{m.icon}</span>
      <span className={cn("flex-1 text-[10px] font-black uppercase tracking-widest italic", active ? m.color : "")}>{m.label}</span>
      <span className={cn("text-[9px] font-bold tabular-nums", active ? m.color : "text-[#4B5563]")}>{count}</span>
    </button>
  );
};

const PopularityDots = ({ value }: { value: number }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i <= value ? "bg-primary" : "bg-white/10")} />
    ))}
  </div>
);

// ─── Config Form ──────────────────────────────────────────────────────────────

const ConfigForm = ({
  template,
  onGenerate,
  onClose,
}: {
  template: WorkflowTemplate;
  onGenerate: (output: GeneratedOutput) => void;
  onClose: () => void;
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = CAT_META[template.category];

  const set = (key: string, val: string) => {
    setValues((p) => ({ ...p, [key]: val }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    template.requiredInputs.forEach((inp) => {
      const val = values[inp.key]?.trim();
      if (inp.required && !val) { errs.push(`${inp.label} is required`); return; }
      if (val && inp.type === "number" && inp.validation) {
        const n = parseFloat(val);
        if (isNaN(n)) { errs.push(`${inp.label} must be a number`); return; }
        if (inp.validation.min !== undefined && n < inp.validation.min)
          errs.push(`${inp.label} must be ≥ ${inp.validation.min}`);
        if (inp.validation.max !== undefined && n > inp.validation.max)
          errs.push(`${inp.label} must be ≤ ${inp.validation.max}`);
      }
    });
    return errs;
  };

  const generate = () => {
    const errs = validate();
    if (errs.length > 0) {
      // mark field errors
      const fieldErrs: Record<string, string> = {};
      errs.forEach((e) => {
        const inp = template.requiredInputs.find((i) => e.startsWith(i.label));
        if (inp) fieldErrs[inp.key] = e;
      });
      setErrors(fieldErrs);
    }

    // build resolved steps
    const resolvedSteps = template.steps.map((step) => {
      let s = step;
      Object.entries(values).forEach(([k, v]) => {
        s = s.replaceAll(`{{${k}}}`, v || `<${k}>`);
      });
      return s;
    });

    const svc = values["service_name"] || template.name;
    const env = values["environment"] || "production";

    const output: GeneratedOutput = {
      template: template.name,
      inputs: { ...values },
      generated_workflow: {
        name: `[${env.toUpperCase()}] ${svc} — ${template.name}`,
        steps: resolvedSteps,
      },
      validation: {
        status: errs.length === 0 ? "valid" : "invalid",
        errors: errs,
      },
    };

    onGenerate(output);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-[#1F2937] shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest italic mb-1", m.color)}>
              {m.icon}{m.label}
            </div>
            <h3 className="text-[13px] font-bold text-[#E5E7EB]">{template.name}</h3>
            <p className="text-[10px] italic text-[#6B7280] mt-0.5">{template.description}</p>
          </div>
          <button onClick={onClose} className="text-[#4B5563] hover:text-[#9CA3AF] text-lg font-black shrink-0">×</button>
        </div>
        {/* Safety note */}
        <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 flex items-start gap-2">
          <Info className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-[9px] italic text-yellow-300/70">Templates are not executed directly — inputs generate a workflow saved to My Workflows.</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
        <SectionLabel>Required Inputs</SectionLabel>
        {template.requiredInputs.map((inp) => {
          const hasError = !!errors[inp.key];
          return (
            <div key={inp.key}>
              <label className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold italic text-[#9CA3AF]">{inp.label}</span>
                {inp.required && <span className="text-[8px] font-black text-red-400 italic">*required</span>}
                {inp.hint && <span className="text-[8px] italic text-[#4B5563]">({inp.hint})</span>}
              </label>
              {inp.type === "select" ? (
                <select
                  value={values[inp.key] || ""}
                  onChange={(e) => set(inp.key, e.target.value)}
                  className={cn(
                    "w-full h-9 bg-white/[0.03] border rounded-xl px-3 text-[11px] font-bold text-[#E5E7EB] italic outline-none transition-all appearance-none",
                    hasError ? "border-red-500/40 focus:border-red-500/60" : "border-[#1F2937] focus:border-primary/40"
                  )}
                >
                  <option value="" disabled>Select…</option>
                  {inp.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={inp.type === "number" ? "number" : "text"}
                  value={values[inp.key] || ""}
                  onChange={(e) => set(inp.key, e.target.value)}
                  placeholder={inp.placeholder}
                  className={cn(
                    "w-full h-9 bg-white/[0.03] border rounded-xl px-3 text-[11px] font-bold text-[#E5E7EB] italic outline-none transition-all placeholder:text-[#4B5563] placeholder:font-normal",
                    hasError ? "border-red-500/40 focus:border-red-500/60" : "border-[#1F2937] focus:border-primary/40"
                  )}
                />
              )}
              {hasError && <p className="text-[9px] italic text-red-400 mt-1">{errors[inp.key]}</p>}
            </div>
          );
        })}

        {/* Safety constraints */}
        <div className="pt-3 border-t border-[#1F2937]">
          <SectionLabel>Safety Constraints</SectionLabel>
          <div className="space-y-1.5">
            {template.safetyConstraints.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <Shield className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                <span className="text-[10px] italic text-[#6B7280]">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-[#1F2937]">
          <SectionLabel>Rollback Logic</SectionLabel>
          <p className="text-[10px] italic text-[#6B7280] leading-relaxed">{template.rollbackLogic}</p>
        </div>
      </div>

      {/* Generate button */}
      <div className="p-5 border-t border-[#1F2937] shrink-0">
        <Button
          onClick={generate}
          className="w-full h-10 bg-primary text-white hover:bg-primary/90 font-black uppercase text-[10px] tracking-[0.25em] italic rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 mr-2" />Generate Workflow
        </Button>
      </div>
    </div>
  );
};

// ─── Output Panel ─────────────────────────────────────────────────────────────

const OutputPanel = ({ output, onSave, onReset }: { output: GeneratedOutput; onSave: () => void; onReset: () => void }) => {
  const isValid = output.validation.status === "valid";

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    toast.success("JSON copied");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 border-b border-[#1F2937] shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-[#E5E7EB]/60">Generated Output</p>
          <p className="text-[8px] italic text-[#4B5563] mt-0.5">Strict JSON · Workflow blueprint</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyJSON} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest italic text-[#6B7280] hover:text-primary transition-colors">
            <Copy className="w-3 h-3" />Copy
          </button>
          <button onClick={onReset} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest italic text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
            <RotateCcw className="w-3 h-3" />Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
        {/* Validation status */}
        <div className={cn("p-4 rounded-xl border flex items-start gap-3",
          isValid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
        )}>
          {isValid
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest italic", isValid ? "text-emerald-400" : "text-red-400")}>
              Validation {output.validation.status}
            </p>
            {output.validation.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {output.validation.errors.map((e, i) => (
                  <li key={i} className="text-[10px] italic text-red-300/70">• {e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* template */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-1">
          <SectionLabel>template</SectionLabel>
          <p className="text-[11px] italic text-[#E5E7EB]/80 font-mono">{output.template}</p>
        </div>

        {/* inputs */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-2">
          <SectionLabel>inputs</SectionLabel>
          <div className="space-y-1.5">
            {Object.entries(output.inputs).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-primary/60 w-32 shrink-0">{k}</span>
                <span className="text-[10px] italic text-[#9CA3AF] truncate">"{v}"</span>
              </div>
            ))}
          </div>
        </div>

        {/* generated_workflow */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1F2937] space-y-3">
          <SectionLabel>generated_workflow</SectionLabel>
          <div className="mb-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#4B5563] italic mb-1">name</p>
            <p className="text-[11px] italic text-[#E5E7EB]/80 font-mono leading-snug">{output.generated_workflow.name}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-[#4B5563] italic mb-2">steps</p>
            <div className="space-y-1.5">
              {output.generated_workflow.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/15 border border-primary/25 text-primary text-[8px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-[10px] italic text-[#9CA3AF] leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="p-5 border-t border-[#1F2937] shrink-0 space-y-2">
        <Button
          onClick={onSave}
          disabled={!isValid}
          className={cn(
            "w-full h-10 font-black uppercase text-[10px] tracking-[0.25em] italic rounded-xl transition-all active:scale-[0.98]",
            isValid
              ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-white/5 text-[#4B5563] border border-[#1F2937] cursor-not-allowed"
          )}
        >
          <ArrowRight className="w-3.5 h-3.5 mr-2" />
          {isValid ? "Save to My Workflows" : "Fix Errors to Save"}
        </Button>
        {isValid && (
          <p className="text-[8px] text-center italic text-[#4B5563]">Workflow will appear in My Workflows → owned by current user</p>
        )}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const TemplateLibrary = () => {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [search, setSearch]                 = useState("");
  const [selected, setSelected]             = useState<WorkflowTemplate | null>(null);
  const [output, setOutput]                 = useState<GeneratedOutput | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const matchSearch = !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catCounts = (cat: TemplateCategory) => TEMPLATES.filter((t) => t.category === cat).length;

  const handleSave = () => {
    toast.success("Workflow saved to My Workflows");
    setSelected(null);
    setOutput(null);
  };

  return (
    <div className="flex h-full bg-[#0B1220] overflow-hidden">

      {/* ── Left: Category sidebar ────────────────────────────────────── */}
      <aside className="w-56 border-r border-[#1F2937] bg-[#0B1220] flex flex-col shrink-0">
        <div className="px-4 pt-5 pb-3 border-b border-[#1F2937] shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] italic text-[#6B7280]">Templates</span>
          </div>
          <p className="text-[8px] italic text-[#4B5563]">{TEMPLATES.length} blueprints available</p>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {/* All */}
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
              activeCategory === "all" ? "bg-primary/10 border-primary/20 text-primary" : "border-transparent text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/[0.03]"
            )}
          >
            <Layers className={cn("w-4 h-4 shrink-0", activeCategory === "all" ? "text-primary" : "text-[#4B5563]")} />
            <span className="flex-1 text-[10px] font-black uppercase tracking-widest italic">All</span>
            <span className={cn("text-[9px] font-bold tabular-nums", activeCategory === "all" ? "text-primary" : "text-[#4B5563]")}>{TEMPLATES.length}</span>
          </button>
          {(Object.keys(CAT_META) as TemplateCategory[]).map((cat) => (
            <CategoryPill key={cat} cat={cat} active={activeCategory === cat} count={catCounts(cat)} onClick={() => setActiveCategory(cat)} />
          ))}
        </div>

        {/* Info */}
        <div className="p-4 border-t border-[#1F2937] shrink-0 space-y-2">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] italic text-[#4B5563]">Template Engine</p>
          {[
            { icon: <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />, text: "Safety enforced" },
            { icon: <Lock className="w-2.5 h-2.5 text-primary/60" />,          text: "Rollback required" },
            { icon: <Users className="w-2.5 h-2.5 text-blue-400/60" />,        text: "Team-validated" },
          ].map((i, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {i.icon}
              <span className="text-[9px] italic text-[#4B5563]">{i.text}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Center: Template grid ─────────────────────────────────────── */}
      <div className={cn("flex flex-col min-w-0 overflow-hidden transition-all", selected ? "flex-1" : "flex-1")}>
        {/* Search bar */}
        <div className="h-12 border-b border-[#1F2937] flex items-center px-6 gap-4 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full h-8 bg-white/[0.03] border border-[#1F2937] rounded-xl pl-9 pr-3 text-[11px] font-bold italic text-[#E5E7EB] outline-none focus:border-primary/30 transition-all placeholder:text-[#4B5563] placeholder:font-normal"
            />
          </div>
          <span className="text-[9px] italic text-[#4B5563] ml-auto">{filtered.length} templates</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((tpl, i) => {
              const m = CAT_META[tpl.category];
              const isSelected = selected?.id === tpl.id;
              return (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setSelected(isSelected ? null : tpl); setOutput(null); }}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all group hover:shadow-lg",
                    isSelected ? cn(m.bg, "shadow-md") : "bg-white/[0.02] border-[#1F2937] hover:border-[#374151] hover:bg-white/[0.035]"
                  )}
                >
                  {/* Category + popularity */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest italic", m.color, m.bg)}>
                      {m.icon}{m.label}
                    </div>
                    <PopularityDots value={tpl.popularity} />
                  </div>

                  {/* Name + desc */}
                  <h3 className={cn("text-[12px] font-black italic leading-snug mb-1", isSelected ? m.color : "text-[#E5E7EB]")}>{tpl.name}</h3>
                  <p className="text-[10px] italic text-[#6B7280] leading-relaxed mb-4">{tpl.description}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 border-t border-white/[0.05] pt-3">
                    <div className="flex items-center gap-1.5 text-[9px] italic text-[#4B5563]">
                      <Users className="w-3 h-3" />{tpl.teams} teams
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] italic text-[#4B5563]">
                      <Clock className="w-3 h-3" />{tpl.estimatedRuntime}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] italic text-[#4B5563]">
                      <Terminal className="w-3 h-3" />{tpl.steps.length} steps
                    </div>
                    <div className="ml-auto">
                      <ChevronRight className={cn("w-4 h-4 transition-all", isSelected ? m.color : "text-[#374151] group-hover:text-[#6B7280]")} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Config / Output panel ──────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 380 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 border-l border-[#1F2937] bg-[#0B1220] overflow-hidden"
            style={{ width: 380 }}
          >
            {output ? (
              <OutputPanel output={output} onSave={handleSave} onReset={() => setOutput(null)} />
            ) : (
              <ConfigForm template={selected} onGenerate={setOutput} onClose={() => { setSelected(null); setOutput(null); }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateLibrary;
