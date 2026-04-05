import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Zap, Bell, Clock, Globe, Shield,
  ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Play, ArrowRight, Hash,
  Lock, Unlock, Activity, BarChart3,
  Database, GitBranch, Layers, Eye,
  TrendingUp, TrendingDown, RotateCcw,
  Server, Network, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion as m } from "framer-motion";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type TriggerType = "webhook" | "cloud_event" | "schedule";
type TriggerStatus = "active" | "failing" | "paused" | "degraded";
type TrustScore = "high" | "medium" | "low";

interface EventFlowStep {
  label: string;
  icon: any;
  latency_ms?: number;
}

interface ReliabilityConfig {
  retry: boolean;
  max_retries: number;
  retry_delay_ms: number;
  dlq: boolean;
  dlq_size: number;
  timeout_ms: number;
}

interface SecurityCtx {
  method: string;
  verified: boolean;
  trust_score: TrustScore;
  last_verified: string;
  anomaly_detected: boolean;
  anomaly_detail?: string;
}

interface MetricsRecord {
  success_rate: number;
  latency_p50: number;
  latency_p99: number;
  events_24h: number;
  failures_24h: number;
  dlq_count: number;
}

interface RecentEvent {
  id: string;
  ts: string;
  status: "success" | "failed" | "retried";
  latency_ms: number;
  payload_size: string;
}

interface IntegrationRecord {
  id: string;
  name: string;
  type: TriggerType;
  source: string;
  status: TriggerStatus;
  version: string;
  endpoint: string;
  connected_workflows: string[];
  flow: EventFlowStep[];
  metrics: MetricsRecord;
  reliability: ReliabilityConfig;
  security: SecurityCtx;
  recent_events: RecentEvent[];
  last_hit: string;
  insight: string;
}

interface IntegrationEngineResponse {
  engine_run_id: string;
  analyzed_at: string;
  summary: {
    total: number;
    active: number;
    failing: number;
    events_24h: number;
    avg_success_rate: number;
    dlq_total: number;
  };
  integrations: IntegrationRecord[];
  confidence: string;
}

// ─── Engine ───────────────────────────────────────────────────────────────────
function runIntegrationEngine(): IntegrationEngineResponse {
  return {
    engine_run_id: "int-eng-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    analyzed_at: "2026-03-30T14:30:00Z",
    summary: {
      total: 6,
      active: 5,
      failing: 1,
      events_24h: 48420,
      avg_success_rate: 98.7,
      dlq_total: 14,
    },
    integrations: [
      {
        id: "int-001",
        name: "Stripe Payment Success",
        type: "webhook",
        source: "Stripe",
        status: "active",
        version: "v2",
        endpoint: "/api/trig/stripe/payment-success",
        connected_workflows: ["billing-reconciliation", "invoice-dispatch"],
        flow: [
          { label: "Stripe Event", icon: Globe, latency_ms: 0 },
          { label: "Signature Verify", icon: Shield, latency_ms: 2 },
          { label: "Billing Workflow", icon: GitBranch, latency_ms: 45 },
          { label: "DB Update", icon: Database, latency_ms: 12 },
          { label: "Invoice Email", icon: Bell, latency_ms: 320 },
        ],
        metrics: { success_rate: 99.8, latency_p50: 118, latency_p99: 380, events_24h: 14200, failures_24h: 28, dlq_count: 0 },
        reliability: { retry: true, max_retries: 3, retry_delay_ms: 1000, dlq: true, dlq_size: 0, timeout_ms: 5000 },
        security: { method: "HMAC-SHA256 Signature", verified: true, trust_score: "high", last_verified: "42s ago", anomaly_detected: false },
        recent_events: [
          { id: "evt-a1", ts: "14:29:51", status: "success", latency_ms: 112, payload_size: "2.1kb" },
          { id: "evt-a2", ts: "14:28:04", status: "success", latency_ms: 98,  payload_size: "1.8kb" },
          { id: "evt-a3", ts: "14:26:17", status: "retried", latency_ms: 340, payload_size: "2.4kb" },
        ],
        last_hit: "42s ago",
        insight: "High reliability — 99.8% success rate. Consider upgrading to Stripe webhook v3 for lower latency.",
      },
      {
        id: "int-002",
        name: "GitHub Push Deploy",
        type: "webhook",
        source: "GitHub",
        status: "active",
        version: "v1",
        endpoint: "/api/trig/github/push",
        connected_workflows: ["ci-pipeline", "canary-deploy"],
        flow: [
          { label: "GitHub Push", icon: Globe, latency_ms: 0 },
          { label: "HMAC Verify", icon: Shield, latency_ms: 1 },
          { label: "CI Pipeline", icon: GitBranch, latency_ms: 180000 },
          { label: "Canary Deploy", icon: Layers, latency_ms: 30000 },
        ],
        metrics: { success_rate: 97.4, latency_p50: 220000, latency_p99: 480000, events_24h: 84, failures_24h: 2, dlq_count: 1 },
        reliability: { retry: false, max_retries: 0, retry_delay_ms: 0, dlq: true, dlq_size: 1, timeout_ms: 600000 },
        security: { method: "HMAC-SHA256 Signature", verified: true, trust_score: "high", last_verified: "3h ago", anomaly_detected: false },
        recent_events: [
          { id: "evt-b1", ts: "11:14:02", status: "success", latency_ms: 214000, payload_size: "8.4kb" },
          { id: "evt-b2", ts: "09:32:44", status: "failed",  latency_ms: 600001, payload_size: "6.1kb" },
        ],
        last_hit: "3h ago",
        insight: "1 event in DLQ — pipeline timeout on branch feature/auth-v2. Retry or increase timeout limit.",
      },
      {
        id: "int-003",
        name: "AWS CloudWatch Alarm",
        type: "cloud_event",
        source: "AWS",
        status: "active",
        version: "v1",
        endpoint: "arn:aws:events:us-east-1:123456789:rule/prod-cpu-alarm",
        connected_workflows: ["auto-scale-prod", "sre-alert-dispatch"],
        flow: [
          { label: "CloudWatch Alarm", icon: Activity, latency_ms: 0 },
          { label: "EventBridge Rule", icon: Zap, latency_ms: 10 },
          { label: "IAM Role Check", icon: Lock, latency_ms: 4 },
          { label: "Auto-Scale Workflow", icon: Server, latency_ms: 8000 },
          { label: "SRE Alert", icon: Bell, latency_ms: 200 },
        ],
        metrics: { success_rate: 100, latency_p50: 8200, latency_p99: 11000, events_24h: 12, failures_24h: 0, dlq_count: 0 },
        reliability: { retry: true, max_retries: 5, retry_delay_ms: 2000, dlq: true, dlq_size: 0, timeout_ms: 30000 },
        security: { method: "IAM Role + SigV4", verified: true, trust_score: "high", last_verified: "14m ago", anomaly_detected: false },
        recent_events: [
          { id: "evt-c1", ts: "14:14:00", status: "success", latency_ms: 8320, payload_size: "1.2kb" },
          { id: "evt-c2", ts: "13:40:00", status: "success", latency_ms: 7900, payload_size: "1.1kb" },
        ],
        last_hit: "14m ago",
        insight: "100% success rate. EventBridge rule fires reliably within SLO. No action needed.",
      },
      {
        id: "int-004",
        name: "GCP Pub/Sub Analytics",
        type: "cloud_event",
        source: "GCP",
        status: "degraded",
        version: "v2",
        endpoint: "projects/prod-infra/topics/analytics-events",
        connected_workflows: ["analytics-pipeline"],
        flow: [
          { label: "Pub/Sub Topic", icon: Network, latency_ms: 0 },
          { label: "OAuth 2.0 Verify", icon: Shield, latency_ms: 5 },
          { label: "Analytics Pipeline", icon: Cpu, latency_ms: 18000 },
          { label: "BigQuery Write", icon: Database, latency_ms: 42000 },
        ],
        metrics: { success_rate: 94.1, latency_p50: 18400, latency_p99: 62000, events_24h: 22100, failures_24h: 1298, dlq_count: 13 },
        reliability: { retry: true, max_retries: 3, retry_delay_ms: 5000, dlq: true, dlq_size: 13, timeout_ms: 120000 },
        security: { method: "OAuth 2.0 + Service Account", verified: true, trust_score: "medium", last_verified: "2m ago", anomaly_detected: true, anomaly_detail: "Unexpected 4.3× traffic spike from publisher analytics-collector-v1 — verify source" },
        recent_events: [
          { id: "evt-d1", ts: "14:28:00", status: "success", latency_ms: 18200, payload_size: "44kb" },
          { id: "evt-d2", ts: "14:27:55", status: "failed",  latency_ms: 62100, payload_size: "44kb" },
          { id: "evt-d3", ts: "14:27:50", status: "retried", latency_ms: 38400, payload_size: "44kb" },
        ],
        last_hit: "2m ago",
        insight: "13 messages in DLQ — BigQuery write timeouts under load spike. Investigate analytics-collector-v1 traffic anomaly.",
      },
      {
        id: "int-005",
        name: "Daily S3 Backup Sync",
        type: "schedule",
        source: "Cron",
        status: "active",
        version: "v1",
        endpoint: "0 0 * * * (UTC midnight)",
        connected_workflows: ["s3-backup-workflow"],
        flow: [
          { label: "Cron Trigger", icon: Clock, latency_ms: 0 },
          { label: "Internal Auth", icon: Lock, latency_ms: 0 },
          { label: "S3 Backup Workflow", icon: GitBranch, latency_ms: 134000 },
          { label: "Completion Alert", icon: Bell, latency_ms: 300 },
        ],
        metrics: { success_rate: 100, latency_p50: 134000, latency_p99: 210000, events_24h: 1, failures_24h: 0, dlq_count: 0 },
        reliability: { retry: true, max_retries: 2, retry_delay_ms: 300000, dlq: false, dlq_size: 0, timeout_ms: 900000 },
        security: { method: "Internal Service Token", verified: true, trust_score: "high", last_verified: "14h ago", anomaly_detected: false },
        recent_events: [
          { id: "evt-e1", ts: "00:00:00", status: "success", latency_ms: 134000, payload_size: "n/a" },
        ],
        last_hit: "14h ago",
        insight: "Reliable daily execution. Last run: 2.2 min — within expected range.",
      },
      {
        id: "int-006",
        name: "Kubernetes Pod Crash",
        type: "cloud_event",
        source: "Kubernetes",
        status: "failing",
        version: "v1",
        endpoint: "cluster.local/api/v1/events?fieldSelector=reason%3DCrashLoopBackOff",
        connected_workflows: ["pod-recovery-workflow"],
        flow: [
          { label: "K8s Event", icon: Activity, latency_ms: 0 },
          { label: "RBAC Verify", icon: Shield, latency_ms: 3 },
          { label: "Recovery Workflow", icon: GitBranch, latency_ms: 0 },
        ],
        metrics: { success_rate: 41.2, latency_p50: 0, latency_p99: 0, events_24h: 34, failures_24h: 20, dlq_count: 0 },
        reliability: { retry: true, max_retries: 3, retry_delay_ms: 500, dlq: false, dlq_size: 0, timeout_ms: 10000 },
        security: { method: "RBAC + ServiceAccount", verified: false, trust_score: "low", last_verified: "never (broken)", anomaly_detected: true, anomaly_detail: "RBAC ServiceAccount 'event-watcher' token expired 6 days ago — all events failing auth" },
        recent_events: [
          { id: "evt-f1", ts: "14:24:00", status: "failed", latency_ms: 0, payload_size: "0.8kb" },
          { id: "evt-f2", ts: "14:18:00", status: "failed", latency_ms: 0, payload_size: "0.8kb" },
          { id: "evt-f3", ts: "14:12:00", status: "failed", latency_ms: 0, payload_size: "0.8kb" },
        ],
        last_hit: "6m ago",
        insight: "CRITICAL: ServiceAccount token expired. Run: kubectl create token event-watcher -n monitoring to restore. All pod recovery actions are blind.",
      },
    ],
    confidence: "0.96",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<TriggerType, { label: string; icon: any; color: string; bg: string }> = {
  webhook:     { label: "Webhook",     icon: Globe,    color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30" },
  cloud_event: { label: "Cloud Event", icon: Zap,      color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  schedule:    { label: "Schedule",    icon: Clock,    color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
};

const STATUS_META: Record<TriggerStatus, { color: string; dot: string; label: string }> = {
  active:   { color: "text-primary border-primary/30 bg-primary/10",          dot: "bg-primary animate-pulse",    label: "ACTIVE" },
  degraded: { color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", dot: "bg-yellow-400 animate-pulse", label: "DEGRADED" },
  failing:  { color: "text-red-500 border-red-500/30 bg-red-500/10",          dot: "bg-red-500",                  label: "FAILING" },
  paused:   { color: "text-muted-foreground border-border bg-muted/10",       dot: "bg-muted-foreground",         label: "PAUSED" },
};

const TRUST_COLORS: Record<TrustScore, string> = {
  high:   "text-primary",
  medium: "text-yellow-400",
  low:    "text-red-500",
};

const EVENT_STATUS_COLORS = {
  success: "text-primary bg-primary/10 border-primary/20",
  failed:  "text-red-500 bg-red-500/10 border-red-500/20",
  retried: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

function formatLatency(ms: number): string {
  if (ms === 0) return "—";
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

// ─── Flow Visualizer ──────────────────────────────────────────────────────────
function FlowViz({ flow }: { flow: EventFlowStep[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {flow.map((step, i) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle">
                <Icon className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{step.label}</span>
              </div>
              {step.latency_ms !== undefined && step.latency_ms > 0 && (
                <span className="text-[8px] font-black text-muted-foreground/30 tabular-nums">{formatLatency(step.latency_ms)}</span>
              )}
            </div>
            {i < flow.length - 1 && <ChevronRight className="w-3 h-3 text-primary/40 shrink-0 mb-3" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Integration Card ──────────────────────────────────────────────────────────
const DETAIL_TABS = ["flow", "metrics", "reliability", "security", "events"] as const;
type DetailTab = typeof DETAIL_TABS[number];

function IntegrationCard({ item }: { item: IntegrationRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("flow");
  const [testing, setTesting] = useState(false);
  const [replaying, setReplaying] = useState<string | null>(null);

  const type = TYPE_META[item.type];
  const status = STATUS_META[item.status];
  const TypeIcon = type.icon;

  const testTrigger = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); toast.success(`Test event sent to ${item.name}`); }, 1600);
  };

  const replayEvent = (evtId: string) => {
    setReplaying(evtId);
    setTimeout(() => { setReplaying(null); toast.success(`Event ${evtId} replayed`); }, 1400);
  };

  return (
    <div className={`rounded-2xl border bg-background-elevated overflow-hidden transition-all ${
      item.status === "failing"  ? "border-red-500/40" :
      item.status === "degraded" ? "border-yellow-400/30" :
      "border-border-subtle hover:border-primary/20"
    }`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${type.bg}`}>
              <TypeIcon className={`w-4.5 h-4.5 ${type.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${type.bg} ${type.color}`}>
                  {type.label}
                </span>
                <span className="text-[8px] font-black uppercase text-muted-foreground/30 border border-border-subtle px-1.5 py-0.5 rounded">
                  {item.version}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{item.source}</span>
                <span className="text-muted-foreground/20">·</span>
                <span className="text-[9px] font-mono text-muted-foreground/30 truncate max-w-[180px]">{item.endpoint}</span>
              </div>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest shrink-0 ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Success", value: `${item.metrics.success_rate}%`, color: item.metrics.success_rate >= 99 ? "text-primary" : item.metrics.success_rate >= 95 ? "text-yellow-400" : "text-red-500" },
            { label: "p50", value: formatLatency(item.metrics.latency_p50) },
            { label: "24h Events", value: item.metrics.events_24h.toLocaleString() },
            { label: "DLQ", value: item.metrics.dlq_count, color: item.metrics.dlq_count > 0 ? "text-red-400" : "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-background border border-border-subtle">
              <p className={`text-xs font-black ${color || "text-foreground"}`}>{value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Anomaly banner */}
        {item.security.anomaly_detected && (
          <div className={`flex items-start gap-2 p-3 rounded-xl border mb-4 ${
            item.status === "failing" ? "border-red-500/30 bg-red-500/5" : "border-yellow-400/20 bg-yellow-400/5"
          }`}>
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${item.status === "failing" ? "text-red-400" : "text-yellow-400"}`} />
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{item.security.anomaly_detail}</p>
          </div>
        )}

        {/* Workflows + actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {item.connected_workflows.map(wf => (
              <span key={wf} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-background border border-border-subtle text-muted-foreground/50">
                {wf}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={testTrigger} disabled={testing}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle text-muted-foreground/60 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-40">
              {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Test
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle text-muted-foreground/60 hover:text-foreground hover:border-primary/30 transition-all"
            >
              Details {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle"
          >
            {/* Detail tabs */}
            <div className="flex gap-1 p-3 bg-background/50 border-b border-border-subtle overflow-x-auto">
              {DETAIL_TABS.map(t => (
                <button key={t}
                  onClick={() => setDetailTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    detailTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground/50 hover:text-foreground"
                  }`}>
                  {t === "reliability" ? "SLA" : t}
                </button>
              ))}
            </div>

            <div className="p-4">
              {detailTab === "flow" && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Event → Trigger → Workflow → Action → Result</p>
                  <FlowViz flow={item.flow} />
                  <div className="pt-3 border-t border-border-subtle">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">AI Insight</p>
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-1">{item.insight}</p>
                  </div>
                </div>
              )}

              {detailTab === "metrics" && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Success Rate", value: `${item.metrics.success_rate}%`, icon: TrendingUp },
                    { label: "Latency p50", value: formatLatency(item.metrics.latency_p50), icon: Activity },
                    { label: "Latency p99", value: formatLatency(item.metrics.latency_p99), icon: Activity },
                    { label: "Events (24h)", value: item.metrics.events_24h.toLocaleString(), icon: BarChart3 },
                    { label: "Failures (24h)", value: item.metrics.failures_24h, icon: XCircle },
                    { label: "DLQ Depth", value: item.metrics.dlq_count, icon: Database },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border-subtle">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
                        <p className="text-sm font-black text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "reliability" && (
                <div className="space-y-3">
                  {[
                    { label: "Retry Enabled", value: item.reliability.retry ? `Yes — ${item.reliability.max_retries}× max, ${item.reliability.retry_delay_ms}ms delay` : "Disabled" },
                    { label: "Dead Letter Queue", value: item.reliability.dlq ? `Enabled — ${item.reliability.dlq_size} messages` : "Disabled" },
                    { label: "Timeout", value: formatLatency(item.reliability.timeout_ms) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
                      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                      <span className="text-[10px] font-black text-muted-foreground/60">{value}</span>
                    </div>
                  ))}
                  {item.reliability.dlq && item.reliability.dlq_size > 0 && (
                    <button
                      onClick={() => toast.success(`Replaying ${item.reliability.dlq_size} DLQ messages for ${item.name}`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-background border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replay {item.reliability.dlq_size} DLQ Messages
                    </button>
                  )}
                </div>
              )}

              {detailTab === "security" && (
                <div className="space-y-3">
                  {[
                    { label: "Method", value: item.security.method },
                    { label: "Verified", value: item.security.verified ? "Yes" : "No — BROKEN", bad: !item.security.verified },
                    { label: "Trust Score", value: item.security.trust_score.toUpperCase(), color: TRUST_COLORS[item.security.trust_score] },
                    { label: "Last Verified", value: item.security.last_verified },
                  ].map(({ label, value, bad, color }) => (
                    <div key={label} className={`flex items-center justify-between p-3 rounded-xl border ${bad ? "border-red-500/20 bg-red-500/5" : "border-border-subtle bg-background"}`}>
                      <div className="flex items-center gap-2">
                        {bad ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                      </div>
                      <span className={`text-[10px] font-black ${color || (bad ? "text-red-400" : "text-muted-foreground/60")}`}>{value}</span>
                    </div>
                  ))}
                  {item.security.anomaly_detected && (
                    <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400/80 leading-relaxed">{item.security.anomaly_detail}</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "events" && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Recent Events — Click to Replay</p>
                  {item.recent_events.map(evt => (
                    <div key={evt.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border-subtle hover:border-primary/20 transition-all"
                    >
                      <span className="text-[9px] font-black text-muted-foreground/30 tabular-nums shrink-0">{evt.ts}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${EVENT_STATUS_COLORS[evt.status]}`}>
                        {evt.status}
                      </span>
                      <span className="text-[9px] font-black text-muted-foreground/40 shrink-0">{formatLatency(evt.latency_ms)}</span>
                      <span className="text-[9px] font-black text-muted-foreground/30 shrink-0">{evt.payload_size}</span>
                      <span className="text-[9px] font-mono text-muted-foreground/20 flex-1 truncate">{evt.id}</span>
                      <button
                        onClick={() => replayEvent(evt.id)}
                        disabled={replaying === evt.id}
                        className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded bg-background border border-border-subtle text-muted-foreground/40 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-40"
                      >
                        {replaying === evt.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />}
                        Replay
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const FILTER_TABS = ["all", "webhook", "cloud_event", "schedule", "failing"] as const;

const TriggerManagement = () => {
  const [report] = useState<IntegrationEngineResponse>(() => runIntegrationEngine());
  const [filter, setFilter] = useState<string>("all");

  const filtered = report.integrations.filter(i => {
    if (filter === "all") return true;
    if (filter === "failing") return i.status === "failing" || i.status === "degraded";
    return i.type === filter;
  });

  const { summary } = report;

  return (
    <div className="flex flex-col h-full bg-[#0B0C0E] overflow-hidden">
      {/* Top bar */}
      <div className="h-14 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Event Orchestration Engine</span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {summary.active} Active
          </span>
          {summary.failing > 0 && (
            <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 uppercase tracking-widest">
              {summary.failing} Failing
            </span>
          )}
        </div>
        <Button size="sm"
          className="h-8 px-4 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
          onClick={() => toast.success("New integration flow launched")}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Register
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        {/* Summary strip */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: summary.total, color: "text-foreground" },
            { label: "Active", value: summary.active, color: "text-primary" },
            { label: "Failing", value: summary.failing, color: summary.failing > 0 ? "text-red-500" : "text-muted-foreground" },
            { label: "Events 24h", value: summary.events_24h.toLocaleString(), color: "text-foreground" },
            { label: "Avg Success", value: `${summary.avg_success_rate}%`, color: "text-primary" },
            { label: "DLQ Total", value: summary.dlq_total, color: summary.dlq_total > 0 ? "text-yellow-400" : "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/25">{label}</span>
              <span className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04] w-fit">
          {FILTER_TABS.map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f ? "bg-primary text-primary-foreground" : "text-white/30 hover:text-white"
              }`}>
              {f === "cloud_event" ? "Cloud Event" : f}
            </button>
          ))}
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(item => (
            <IntegrationCard key={item.id} item={item} />
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 italic border-t border-white/[0.04] pt-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            ENGINE: ACTIVE
          </span>
          <span>RUN: {report.engine_run_id}</span>
          <span>CONFIDENCE: {(parseFloat(report.confidence) * 100).toFixed(0)}%</span>
          <span className="ml-auto">ANALYZED: {report.analyzed_at}</span>
        </div>
      </div>
    </div>
  );
};

export default TriggerManagement;
