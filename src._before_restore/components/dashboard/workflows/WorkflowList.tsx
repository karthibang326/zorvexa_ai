import React, { useEffect, useMemo, useState } from "react";
import {
  Play, MoreHorizontal, ChevronRight,
  AlertCircle, Activity, Zap, User,
  Server, Bot, Shield,
  Lock, Edit2, Eye, ZapOff, Rocket, Workflow, Cpu, MemoryStick, Timer, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import SkeletonBlock from "../control-plane/SkeletonBlock";
import EmptyState from "../control-plane/EmptyState";
import PredictiveTimeline, { type PredictiveTimelineEvent } from "./PredictiveTimeline";
import AIExplanationPanel, { type ExplainableWorkflow } from "./AIExplanationPanel";
import { listWorkflows, type WorkflowListApiItem } from "@/lib/workflows";
import { withContextQuery } from "@/lib/context";
import { toast } from "sonner";

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const DEV_USER_ID = (import.meta.env.VITE_DEV_USER_ID as string | undefined) || "";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkflowType   = "system" | "user" | "agent";
type WorkflowStatus = "Active" | "Pausing" | "Failed" | "Draft";
type FilterKey      = "all" | "mine" | "system" | "agent";

interface Workflow {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  type: WorkflowType;
  status: WorkflowStatus;
  reliability: number;
  last_execution: string;
  invocation_count: number;
  description: string;
  prediction?: string;
  predicted_load?: string;
  ai_action?: string;
  automation?: "on" | "off";
  risk?: "high" | "medium" | "stable";
  failure_probability?: number;
  cpu?: number;
  memory?: number;
  latency?: number;
  ai_analysis?: string;
  root_cause?: string;
  recommendation?: string;
  confidence_score?: number;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function mapApiToWorkflow(w: WorkflowListApiItem): Workflow {
  const st = w.status.toUpperCase();
  let status: WorkflowStatus = "Active";
  if (st === "DRAFT") status = "Draft";
  else if (st.includes("FAIL")) status = "Failed";
  else if (st.includes("PAUSE")) status = "Pausing";

  const type: WorkflowType = w.type === "system" ? "system" : w.type === "user" ? "user" : "agent";

  return {
    id: w.id,
    name: w.name,
    owner_id: w.createdBy,
    owner_name: w.createdBy.includes("@") ? w.createdBy.split("@")[0]! : w.createdBy,
    type,
    status,
    reliability: 0,
    last_execution: formatRelative(w.updatedAt),
    invocation_count: 0,
    description: `Version ${w.version} · ${formatRelative(w.updatedAt)}`,
    prediction: undefined,
    predicted_load: undefined,
    ai_action: "Monitor",
    automation: "off",
    risk: "stable",
    failure_probability: undefined,
    cpu: undefined,
    memory: undefined,
    latency: undefined,
    ai_analysis: undefined,
    root_cause: undefined,
    recommendation: undefined,
    confidence_score: undefined,
  };
}

// ─── Meta maps ────────────────────────────────────────────────────────────────

const TYPE_META: Record<WorkflowType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  system: { label: "System",  icon: <Server className="w-3 h-3" />, color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"    },
  user:   { label: "User",    icon: <User className="w-3 h-3" />,   color: "text-[#9CA3AF]",   bg: "bg-white/5 border-white/10"           },
  agent:  { label: "Agent",   icon: <Bot className="w-3 h-3" />,    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
};

const STATUS_META: Record<WorkflowStatus, { dot: string; text: string; bg: string; pulse: boolean }> = {
  Active:  { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", pulse: true  },
  Pausing: { dot: "bg-yellow-400",  text: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  pulse: false },
  Failed:  { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",        pulse: false },
  Draft:   { dot: "bg-[#4B5563]",   text: "text-[#9CA3AF]",   bg: "bg-white/5 border-white/10",             pulse: false },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "All Workflows" },
  { key: "mine",   label: "My Workflows"  },
  { key: "system", label: "System"        },
  { key: "agent",  label: "Agent"         },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: WorkflowType }) => {
  const m = TYPE_META[type];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic", m.color, m.bg)}>
      {m.icon}{m.label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: WorkflowStatus }) => {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-tight", m.text, m.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot, m.pulse && "animate-pulse")} />
      {status.toUpperCase()}
    </span>
  );
};

const OwnerBadge = ({ workflow }: { workflow: Workflow }) => {
  const isMe     = DEV_USER_ID.length > 0 && workflow.owner_id === DEV_USER_ID;
  const isSystem = workflow.owner_id === "system";
  if (isMe) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest italic text-indigo-400/80">
      <User className="w-2.5 h-2.5" />You
    </span>
  );
  if (isSystem) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest italic text-blue-400/60">
      <Lock className="w-2.5 h-2.5" />System
    </span>
  );
  return (
    <span className="text-[10px] text-[#6B7280] italic">{workflow.owner_name}</span>
  );
};

const ReliabilityBar = ({ rate }: { rate: number }) => {
  if (rate === 0) return <span className="text-[11px] text-[#4B5563] italic">—</span>;
  const color = rate > 95 ? "bg-emerald-400" : rate > 85 ? "bg-yellow-400" : "bg-red-400";
  const text  = rate > 95 ? "text-emerald-400" : rate > 85 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex flex-col gap-1 w-[90px]">
      <span className={cn("text-[12px] font-bold tabular-nums", text)}>{rate}%</span>
      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full", color)}
        />
      </div>
    </div>
  );
};

const EditabilityIcon = ({ workflow }: { workflow: Workflow }) => {
  if (workflow.type === "system") return <span title="Read-only"><Lock className="w-3 h-3 text-[#374151]" /></span>;
  if (DEV_USER_ID.length > 0 && workflow.owner_id === DEV_USER_ID) return <span title="Editable"><Edit2 className="w-3 h-3 text-indigo-400/60" /></span>;
  if (workflow.type === "agent") return <span title="Partially editable"><Eye className="w-3 h-3 text-violet-400/50" /></span>;
  return <span title="View only"><Eye className="w-3 h-3 text-[#374151]" /></span>;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const WorkflowList = ({
  onSelect,
  onFilterChange,
}: {
  onSelect: (id: string) => void;
  onFilterChange?: (filter: FilterKey) => void;
}) => {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [automation, setAutomation] = useState<Record<string, boolean>>({});
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [aiFeed, setAiFeed] = useState<Array<{ id: string; ts: string; label: string; tone: "green" | "yellow" | "red" | "blue" }>>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    root: true,
    signals: true,
    decision: true,
  });
  const [highlightedWorkflowId, setHighlightedWorkflowId] = useState<string | null>(null);
  const deriveTone = (message: string): "green" | "yellow" | "red" | "blue" => {
    const m = message.toLowerCase();
    if (m.includes("rollback")) return "red";
    if (m.includes("restart")) return "yellow";
    if (m.includes("scale") || m.includes("optimized")) return "green";
    return "blue";
  };

  useEffect(() => {
    onFilterChange?.(filter);
  }, [filter, onFilterChange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const items = await listWorkflows();
        if (cancelled) return;
        setWorkflows(items.map(mapApiToWorkflow));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load workflows");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":   return DEV_USER_ID.length > 0 ? workflows.filter((w) => w.owner_id === DEV_USER_ID) : [];
      case "system": return workflows.filter((w) => w.type === "system");
      case "agent":  return workflows.filter((w) => w.type === "agent");
      default:       return workflows;
    }
  }, [filter, workflows]);

  const stats = {
    active:  workflows.filter((w) => w.status === "Active").length,
    failed:  workflows.filter((w) => w.status === "Failed").length,
    agents:  workflows.filter((w) => w.type === "agent").length,
    avgRel: (() => {
      const withRel = workflows.filter((w) => w.reliability > 0);
      if (!withRel.length) return 0;
      return Math.round((withRel.reduce((a, w) => a + w.reliability, 0) / withRel.length) * 10) / 10;
    })(),
    total:   workflows.reduce((a, w) => a + w.invocation_count, 0),
  };
  const activeAiActions = workflows.filter((w) => (w.ai_action ?? "").toLowerCase() !== "monitor").length;
  const predictionsActive = workflows.filter((w) => (w.risk ?? "stable") !== "stable").length;
  const lastAiDecision = aiFeed[0]?.label ?? "No recent decision";
  const systemHealth = stats.failed > 1 ? "degraded" : stats.failed === 1 ? "warning" : "healthy";
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId) ?? null;
  const timelineEvents: PredictiveTimelineEvent[] = useMemo(() => {
    const source = selectedWorkflow ?? workflows[0];
    if (!source) return [];
    if (source.reliability === 0 && source.cpu == null) return [];
    return [
      {
        id: `${source.id}-t1`,
        workflowId: source.id,
        offsetLabel: "+5 min",
        title: "CPU spike expected",
        detail: `CPU may reach ${(source.cpu ?? 45) + 12}%`,
        tone: (source.risk ?? "stable") === "high" ? "red" : "yellow",
      },
      {
        id: `${source.id}-t2`,
        workflowId: source.id,
        offsetLabel: "+10 min",
        title: "Scale recommendation",
        detail: "Scale +2 nodes recommended",
        tone: "yellow",
      },
      {
        id: `${source.id}-t3`,
        workflowId: source.id,
        offsetLabel: "+30 min",
        title: "Failure probability",
        detail: `Risk ${Math.round((source.failure_probability ?? 0) * 100)}%`,
        tone: (source.risk ?? "stable") === "high" ? "red" : "green",
      },
    ];
  }, [selectedWorkflow, workflows]);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/autonomous/stream`));
    const handleStreamEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        if (payload.type === "heartbeat" || payload.type === "autonomous_stream_ready") return;
        const message = String(payload.message ?? payload.action ?? payload.event ?? "AI event");
        const workflowId = typeof payload.workflowId === "string" ? payload.workflowId : null;
        const status = typeof payload.status === "string" ? payload.status as WorkflowStatus : null;
        const action = typeof payload.action === "string" ? payload.action : undefined;
        const risk = typeof payload.risk === "string" ? payload.risk as Workflow["risk"] : undefined;
        const load = typeof payload.loadForecast === "string" ? payload.loadForecast : undefined;

        setAiFeed((prev) => [
          {
            id: `${Date.now()}`,
            ts: "Now",
            label: message,
            tone: deriveTone(message),
          },
          ...prev,
        ].slice(0, 6));

        if (workflowId) {
          setWorkflows((prev) =>
            prev.map((w) =>
              w.id === workflowId
                ? {
                    ...w,
                    status: status ?? w.status,
                    ai_action: action ?? w.ai_action,
                    risk: risk ?? w.risk,
                    predicted_load: load ?? w.predicted_load,
                    last_execution: "Now",
                  }
                : w
            )
          );
          setHighlightedWorkflowId(workflowId);
        }
      } catch {
        setAiFeed((prev) => [{ id: `${Date.now()}`, ts: "Now", label: event.data || "AI stream update", tone: "blue" as const }, ...prev].slice(0, 6));
      }
    };
    es.addEventListener("message", handleStreamEvent as EventListener);
    es.addEventListener("update", handleStreamEvent as EventListener);
    es.addEventListener("heartbeat", handleStreamEvent as EventListener);
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0B1220]">

      {/* ── Autonomous status bar ───────────────────────────────────── */}
      <div className="px-8 py-3 border-b border-[#1F2937] bg-[#030712]/90 shrink-0">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-black uppercase tracking-wider",
              systemHealth === "healthy" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              systemHealth === "warning" && "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
              systemHealth === "degraded" && "border-red-500/30 bg-red-500/10 text-red-300"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", systemHealth === "healthy" ? "bg-emerald-400" : systemHealth === "warning" ? "bg-yellow-400" : "bg-red-400")} />
            {systemHealth === "healthy" ? "Healthy" : systemHealth === "warning" ? "Warning" : "Degraded"}
          </span>
          <span className="text-[#9CA3AF]">{activeAiActions} AI actions running</span>
          <span className="text-[#9CA3AF]">{predictionsActive} predictions active</span>
          <span className="text-white/60">Last: {lastAiDecision}</span>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-8 py-3 border-b border-[#1F2937] shrink-0">
        {[
          { label: "Active",            value: stats.active,                   color: "text-emerald-400" },
          { label: "Failed",            value: stats.failed,                   color: "text-red-400"     },
          { label: "Agent Workflows",   value: stats.agents,                   color: "text-violet-400"  },
          { label: "Avg Reliability",   value: `${stats.avgRel}%`,             color: "text-indigo-400"  },
          { label: "Total Invocations", value: stats.total.toLocaleString(),   color: "text-[#E5E7EB]"   },
        ].map((s, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic">{s.label}</span>
            <span className={cn("text-[14px] font-black italic tabular-nums", s.color)}>{s.value}</span>
          </div>
        ))}

        {/* Filter pills */}
        <div className="ml-auto flex items-center gap-1">
          {FILTERS.map((f) => {
            const count = f.key === "all"
              ? workflows.length
              : f.key === "mine"
              ? (DEV_USER_ID.length > 0 ? workflows.filter((w) => w.owner_id === DEV_USER_ID).length : 0)
              : workflows.filter((w) => w.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-7 px-3 rounded-lg border text-[10px] font-bold tracking-tight transition-all",
                  filter === f.key
                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                    : "border-[#1F2937] text-[#6B7280] hover:text-[#E5E7EB] hover:border-[#374151]"
                )}
              >
                {f.label}
                <span className={cn(
                  "ml-1.5 text-[9px] tabular-nums",
                  filter === f.key ? "text-indigo-400/70" : "text-[#4B5563]"
                )}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── AI Activity Feed ──────────────────────────────────────────── */}
      <div className="border-b border-[#1F2937] px-8 py-3 shrink-0 grid grid-cols-1 lg:grid-cols-[1.3fr_2fr] gap-4 bg-[#020617]/60">
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic">
            AI Activity Feed
          </p>
          <p className="text-[11px] text-[#9CA3AF]">
            Live autonomous decisions via real-time stream.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-[11px] text-[#9CA3AF]">
          {aiFeed.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              {e.tone === "green" && <Zap className="w-3 h-3 text-emerald-400" />}
              {e.tone === "yellow" && <Shield className="w-3 h-3 text-yellow-400" />}
              {e.tone === "red" && <AlertCircle className="w-3 h-3 text-red-400" />}
              {e.tone === "blue" && <Sparkles className="w-3 h-3 text-blue-400" />}
              <span className="text-[#6B7280] font-mono text-[10px]">{e.ts}</span>
              <span className="truncate">{e.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <PredictiveTimeline
        currentLabel={selectedWorkflow?.name ?? "Control Plane"}
        events={timelineEvents}
        onSelectEvent={(workflowId) => {
          setSelectedWorkflowId(workflowId);
          setHighlightedWorkflowId(workflowId);
          onSelect(workflowId);
        }}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="h-11 border-b border-[#1F2937] flex items-center justify-between px-8 shrink-0">
        <span className="text-[11px] font-semibold text-[#9CA3AF]">
          {filtered.length} workflow{filtered.length !== 1 ? "s" : ""}
          {filter !== "all" && (
            <span className="text-[#6B7280]"> · {FILTERS.find(f => f.key === filter)?.label}</span>
          )}
        </span>
      </div>

      {/* ── Table + Context ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[1fr_340px]">
      <div className="overflow-auto custom-scrollbar border-r border-[#1F2937]">
        {loading ? (
          <div className="p-6 space-y-3">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F2937]">
              {["Workflow", "Status", "Reliability", "Prediction", "AI Action", "Automation", "Last Run", ""].map((h, i) => (
                <th key={i} className={cn(
                  "px-6 py-3 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap",
                  i === 7 && "text-right"
                )}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filtered.map((wf, i) => (
                <motion.tr
                  key={wf.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => {
                    setSelectedWorkflowId(wf.id);
                    onSelect(wf.id);
                  }}
                  className={cn(
                    "group border-b border-[#1F2937] hover:bg-white/[0.025] transition-colors cursor-pointer",
                    wf.status === "Active" && "hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]",
                    selectedWorkflowId === wf.id && "bg-white/[0.03]",
                    highlightedWorkflowId === wf.id && "shadow-[inset_0_0_0_1px_rgba(79,70,229,0.45)]"
                  )}
                >
                  {/* Workflow name */}
                  <td className="px-6 py-4 max-w-[300px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-semibold text-[#E5E7EB] group-hover:text-white transition-colors leading-none">{wf.name}</span>
                      <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
                        <span className="inline-flex items-center gap-1"><Cpu className="w-3 h-3 text-sky-400" />{wf.cpu ?? 0}%</span>
                        <span className="inline-flex items-center gap-1"><MemoryStick className="w-3 h-3 text-violet-400" />{wf.memory ?? 0}%</span>
                        <span className="inline-flex items-center gap-1"><Timer className="w-3 h-3 text-amber-400" />{wf.latency ?? 0}ms</span>
                      </div>
                      <span className="text-[10px] text-[#4B5563] italic leading-snug line-clamp-1">{wf.description}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={wf.status} />
                  </td>

                  {/* Reliability */}
                  <td className="px-6 py-4">
                    <ReliabilityBar rate={wf.reliability} />
                  </td>

                  {/* Prediction */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                        (wf.risk ?? "stable") === "high"
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : (wf.risk ?? "stable") === "medium"
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkflowId(wf.id);
                        setHighlightedWorkflowId(wf.id);
                        onSelect(wf.id);
                      }}
                      >
                        <Activity className="w-3 h-3" />
                        {wf.prediction ?? "Stable"}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        Failure {(Math.round((wf.failure_probability ?? 0) * 100))}% • Load {wf.predicted_load ?? "0%"}
                      </span>
                    </div>
                  </td>

                  {/* AI Action */}
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkflowId(wf.id);
                        onSelect(wf.id);
                      }}
                      className="text-[11px] text-[#9CA3AF] hover:text-white transition-colors"
                    >
                      {wf.ai_action ?? (wf.type === "agent" ? "Auto-heal & scale" : "Monitor only")}
                    </button>
                  </td>

                  {/* Automation */}
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutomation((prev) => {
                          const currentEnabled = prev[wf.id] ?? (wf.automation === "on");
                          const nextEnabled = !currentEnabled;
                          setWorkflows((prevWorkflows) =>
                            prevWorkflows.map((item) =>
                              item.id === wf.id ? { ...item, automation: nextEnabled ? "on" : "off" } : item
                            )
                          );
                          return { ...prev, [wf.id]: nextEnabled };
                        });
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
                        (automation[wf.id] ?? (wf.automation === "on"))
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-[#020617] border-white/10 text-[#9CA3AF]"
                      )}
                    >
                      {(automation[wf.id] ?? (wf.automation === "on")) ? (
                        <>
                          <Zap className="w-3 h-3" />
                          ON
                        </>
                      ) : (
                        <>
                          <ZapOff className="w-3 h-3" />
                          OFF
                        </>
                      )}
                    </button>
                  </td>

                  {/* Last execution */}
                  <td className="px-6 py-4">
                    <span className="text-[12px] text-[#9CA3AF]">{wf.last_execution}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditabilityIcon workflow={wf} />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        {wf.type !== "system" && DEV_USER_ID.length > 0 && wf.owner_id === DEV_USER_ID && (
                          <Button variant="ghost" size="icon" title="Execute" className="h-7 w-7 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]">
                            <Play className="w-3 h-3" />
                          </Button>
                        )}                        
                        <Button variant="ghost" size="icon" title="Deploy" className="h-7 w-7 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]">
                          <Rocket className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Pause AI" className="h-7 w-7 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 rounded-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]">
                          <AlertCircle className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-[#374151] ml-1" />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={<Workflow className="w-5 h-5" />}
            title="No workflows yet"
            description="Create your first workflow to start orchestrating autonomous operations."
          />
        )}
      </div>
      <AIExplanationPanel
        workflow={selectedWorkflow as ExplainableWorkflow | null}
        expandedSections={expandedSections}
        onToggleSection={(section) =>
          setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
        }
      />
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="h-9 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between px-8 text-[8px] font-mono font-black uppercase tracking-[0.25em] shrink-0 italic">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Execution Engine: <span className="text-white/70">Active</span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Filter: <span className="text-white/70">{filter.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <Zap className="w-2.5 h-2.5 text-violet-400" />
            Showing: <span className="text-violet-400/80">{filtered.length} / {workflows.length} Workflows</span>
          </div>
        </div>
        <div className="text-white/20">backend: GET /workflows?filter={filter}</div>
      </div>
    </div>
  );
};

export default WorkflowList;
