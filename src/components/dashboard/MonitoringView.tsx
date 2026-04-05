import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Cpu, HardDrive, AlertTriangle, CheckCircle2,
  Loader2, Brain, Zap, TrendingUp, TrendingDown, RotateCcw,
  Play, Search, ChevronDown, Layers, Sparkles,
  Clock, Shield, Server, ArrowRight, AlertCircle, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ModuleHeader from "./ModuleHeader";
import { AIExecutiveSummary, ExecutiveBlockCard, GlobalAIControl } from "./ai-ceo/ExecutiveBlocks";

// ─── Types (strict JSON contract) ─────────────────────────────────────────────

type HealthStatus = "healthy" | "degraded" | "critical";
type Severity     = "low" | "medium" | "high" | "critical";
type Priority     = "low" | "medium" | "high";
type ActionType   = "scale" | "restart" | "rollback" | "investigate";
type MetricType   = "memory" | "cpu" | "latency";

interface SystemHealth   { status: HealthStatus; score: number; }
interface Anomaly {
  service: string; issue: string; severity: Severity;
  root_cause: string; impact: string; confidence: string;
}
interface Prediction {
  metric: MetricType; forecast: string; timeframe: string;
}
interface RecommendedAction {
  action: ActionType; target: string; reason: string; priority: Priority;
}
interface SREResponse {
  system_health: SystemHealth;
  summary: string;
  anomalies: Anomaly[];
  predictions: Prediction[];
  recommended_actions: RecommendedAction[];
}

interface Service {
  name: string; status: HealthStatus;
  cpu: number; memory: number;
  latency: string; p99: string;
  errorRate: string; rps: string; uptime: string;
  cluster: string;
}

// ─── Static telemetry data ────────────────────────────────────────────────────

const SERVICES: Service[] = [
  { name: "api-gateway",    status: "healthy",  cpu: 34, memory: 58, latency: "12ms",  p99: "28ms",  errorRate: "0.1%",  rps: "2.4K/s",  uptime: "99.99%", cluster: "prod-eks-us-east-1" },
  { name: "auth-service",   status: "degraded", cpu: 88, memory: 74, latency: "142ms", p99: "310ms", errorRate: "2.4%",  rps: "890/s",   uptime: "99.91%", cluster: "prod-eks-us-east-1" },
  { name: "worker-pool",    status: "critical", cpu: 97, memory: 96, latency: "890ms", p99: "1.4s",  errorRate: "11.2%", rps: "210/s",   uptime: "98.70%", cluster: "prod-eks-us-east-1" },
  { name: "ml-inference",   status: "degraded", cpu: 78, memory: 63, latency: "340ms", p99: "890ms", errorRate: "1.8%",  rps: "340/s",   uptime: "99.82%", cluster: "prod-eks-us-east-1" },
  { name: "data-pipeline",  status: "healthy",  cpu: 45, memory: 52, latency: "23ms",  p99: "61ms",  errorRate: "0.0%",  rps: "5.6K/s",  uptime: "99.98%", cluster: "prod-eks-us-east-1" },
  { name: "cdn-edge",       status: "healthy",  cpu: 12, memory: 28, latency: "3ms",   p99: "9ms",   errorRate: "0.0%",  rps: "18K/s",   uptime: "100%",   cluster: "prod-eks-us-east-1" },
];

const CLUSTER = {
  id: "prod-eks-us-east-1",
  region: "us-east-1",
  sla: "99.95%",
  env: "production",
};

// ─── SRE AI engine (deterministic simulation) ─────────────────────────────────

function runSREEngine(): SREResponse {
  const critical = SERVICES.filter(s => s.status === "critical");
  const degraded  = SERVICES.filter(s => s.status === "degraded");
  const healthy   = SERVICES.filter(s => s.status === "healthy");

  const status: HealthStatus =
    critical.length > 0 ? "critical" :
    degraded.length > 1 ? "degraded" : "healthy";

  const score = Math.max(
    0,
    100 - critical.length * 25 - degraded.length * 10
  );

  const anomalies: Anomaly[] = [
    {
      service: "worker-pool",
      issue: "CPU at 97% and memory at 96% — both saturated simultaneously",
      severity: "critical",
      root_cause: "Runaway batch job consuming unbounded resources without concurrency limits",
      impact: "Error rate elevated to 11.2%, p99 latency at 1.4s — SLA breach imminent",
      confidence: "96%",
    },
    {
      service: "auth-service",
      issue: "Latency spike to 142ms (p99: 310ms), error rate 2.4%",
      severity: "high",
      root_cause: "CPU saturation (88%) from upstream traffic surge caused by worker-pool retries flooding auth",
      impact: "Login flows degraded — cascading impact on api-gateway latency",
      confidence: "91%",
    },
    {
      service: "ml-inference",
      issue: "p99 latency at 890ms — 3× baseline",
      severity: "medium",
      root_cause: "GPU memory pressure from concurrent model loads; no request queue backpressure",
      impact: "Inference response time degraded for ~340 RPS — user-facing AI features slowed",
      confidence: "84%",
    },
  ];

  const predictions: Prediction[] = [
    {
      metric: "memory",
      forecast: "worker-pool memory will OOMKill in ~6 minutes at current allocation rate",
      timeframe: "next 6 minutes",
    },
    {
      metric: "cpu",
      forecast: "auth-service CPU will exceed 95% threshold as worker-pool retries increase",
      timeframe: "next 4 minutes",
    },
    {
      metric: "latency",
      forecast: "api-gateway p99 will exceed SLA (200ms) due to auth-service cascade",
      timeframe: "next 8 minutes",
    },
  ];

  const recommended_actions: RecommendedAction[] = [
    {
      action: "restart",
      target: "worker-pool",
      reason: "Terminate runaway batch process and restore resource bounds immediately",
      priority: "high",
    },
    {
      action: "scale",
      target: "auth-service",
      reason: "Add replicas to absorb retry flood from worker-pool before CPU ceiling is hit",
      priority: "high",
    },
    {
      action: "investigate",
      target: "ml-inference",
      reason: "Profile active model loads and enable request queue to control GPU pressure",
      priority: "medium",
    },
    {
      action: "rollback",
      target: "worker-pool",
      reason: "If restart does not recover — last stable deployment had clean resource usage",
      priority: "medium",
    },
  ];

  return {
    system_health: { status, score },
    summary: `${critical.length} critical + ${degraded.length} degraded services detected. worker-pool resource saturation is triggering a cascade into auth-service and API latency. Immediate intervention required to prevent SLA breach.`,
    anomalies,
    predictions,
    recommended_actions,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const HealthBadge = ({ status }: { status: HealthStatus }) => (
  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest italic",
    status === "healthy"  && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    status === "degraded" && "bg-yellow-500/10  border-yellow-500/20  text-yellow-400",
    status === "critical" && "bg-red-500/10     border-red-500/20     text-red-400",
  )}>
    <span className={cn("w-1.5 h-1.5 rounded-full",
      status === "healthy"  && "bg-emerald-400 animate-pulse",
      status === "degraded" && "bg-yellow-400",
      status === "critical" && "bg-red-400 animate-pulse",
    )} />
    {status}
  </span>
);

const SeverityPill = ({ severity }: { severity: Severity }) => (
  <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border italic",
    severity === "critical" && "bg-red-500/15    text-red-400    border-red-500/25",
    severity === "high"     && "bg-orange-500/15 text-orange-400 border-orange-500/25",
    severity === "medium"   && "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    severity === "low"      && "bg-white/5       text-white/40   border-white/10",
  )}>{severity}</span>
);

const PriorityDot = ({ priority }: { priority: Priority }) => (
  <div className={cn("w-2 h-2 rounded-full",
    priority === "high"   && "bg-red-400",
    priority === "medium" && "bg-yellow-400",
    priority === "low"    && "bg-emerald-400",
  )} />
);

const MetricBar = ({ value, warn = 70, crit = 90 }: { value: number; warn?: number; crit?: number }) => (
  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn("h-full rounded-full",
        value >= crit  ? "bg-red-400"    :
        value >= warn  ? "bg-yellow-400" : "bg-emerald-400"
      )}
    />
  </div>
);

const ActionIcon = ({ action }: { action: ActionType }) => {
  const icons: Record<ActionType, React.ReactNode> = {
    scale:       <TrendingUp  className="w-3.5 h-3.5" />,
    restart:     <RotateCcw   className="w-3.5 h-3.5" />,
    rollback:    <ArrowRight  className="w-3.5 h-3.5 rotate-180" />,
    investigate: <Search      className="w-3.5 h-3.5" />,
  };
  return <>{icons[action]}</>;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const MonitoringView: React.FC = () => {
  const [loading, setLoading]       = useState(true);
  const [sre, setSre]               = useState<SREResponse | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<number | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [resolvedActions, setResolvedActions] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<"anomalies" | "predictions" | "actions">("anomalies");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showRaw, setShowRaw]       = useState(false);
  const [aiMode, setAiMode] = useState<"assist" | "semi-auto" | "full-auto">("assist");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [approvalOn, setApprovalOn] = useState(true);

  const analyze = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setSre(runSREEngine());
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { analyze(); }, [analyze]);

  const executeAction = async (action: RecommendedAction) => {
    const key = `${action.action}-${action.target}`;
    setExecutingAction(key);
    await new Promise(r => setTimeout(r, 1800));
    setExecutingAction(null);
    setResolvedActions(prev => [...prev, key]);
  };

  const scoreColor = (score: number) =>
    score >= 85 ? "text-emerald-400" : score >= 65 ? "text-yellow-400" : "text-red-400";

  const scoreBg = (status: HealthStatus) =>
    status === "healthy" ? "from-emerald-500/10" :
    status === "degraded" ? "from-yellow-500/10" : "from-red-500/10";

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <ModuleHeader
          title="Monitoring"
          subtitle="AI-powered observability · Autonomous SRE"
        />
        <div className="flex items-center gap-2 -mt-10">
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/8 text-[10px] font-black uppercase tracking-widest italic text-white/40 hover:text-white/70 hover:border-white/15 transition-all disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
            {loading ? "Analyzing..." : "Re-analyze"}
          </button>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/8 border border-indigo-500/15 text-[10px] font-black uppercase tracking-widest italic text-indigo-400">
            <Sparkles className="w-3 h-3 animate-pulse" />
            SRE Engine Active
          </div>
        </div>
      </div>
      <AIExecutiveSummary
        tone={sre?.system_health.status === "critical" ? "critical" : sre?.system_health.status === "degraded" ? "degrading" : "healthy"}
        happened={[sre?.summary ?? "Observability pipeline is continuously evaluating platform signals."]}
        actions={["AI identified anomalies, executed autoscaling guard actions, and prepared short-horizon predictions."]}
        impact="Performance risk reduced while maintaining service continuity and cost control."
        nextAction="Pre-scale critical services before projected latency increase window."
      />
      <GlobalAIControl mode={aiMode} setMode={setAiMode} risk={risk} setRisk={setRisk} approvalOn={approvalOn} setApprovalOn={setApprovalOn} />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        <ExecutiveBlockCard
          title="System Health Matrix"
          lines={[
            "API: Healthy",
            "DB: Slight latency",
            "Worker: Stable",
          ]}
        />
        <ExecutiveBlockCard
          title="Anomaly Detection"
          lines={[
            "Detected: CPU spike",
            "AI Insight: Traffic surge from one region",
            "Action: Auto-scaled hot nodes",
          ]}
        />
        <ExecutiveBlockCard
          title="Prediction Engine"
          lines={[
            "Next 30 min: latency increase probability",
            "Confidence: 72%",
            "Action: Pre-scale infrastructure",
          ]}
        />
        <ExecutiveBlockCard
          title="Cost + Performance"
          lines={[
            "Cost: +12% increase",
            "Reason: Temporary over-scaling",
            "AI Fix: Reduce idle pods and rebalance workloads",
          ]}
        />
      </div>

      {/* ── System Health Score ──────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />
          <p className="text-[12px] text-white/30 italic font-medium">Running telemetry analysis across {SERVICES.length} services...</p>
        </div>
      )}

      {sre && !loading && (
        <>
          {/* Health overview row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Score card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={cn("col-span-1 rounded-2xl border p-5 bg-gradient-to-br to-transparent",
                scoreBg(sre.system_health.status),
                sre.system_health.status === "critical" ? "border-red-500/20" :
                sre.system_health.status === "degraded" ? "border-yellow-500/20" : "border-emerald-500/20"
              )}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30 italic mb-3">System Health</p>
              <div className="flex items-end gap-2 mb-3">
                <span className={cn("text-5xl font-black italic tabular-nums", scoreColor(sre.system_health.score))}>
                  {sre.system_health.score}
                </span>
                <span className="text-white/30 text-[12px] mb-1.5 font-bold">/100</span>
              </div>
              <HealthBadge status={sre.system_health.status} />
              <p className="text-[9px] text-white/20 mt-3 italic">
                Last: {lastRefresh.toLocaleTimeString()}
              </p>
            </motion.div>

            {/* Summary + cluster */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="col-span-3 bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <Brain className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[13px] text-white/75 leading-relaxed font-medium">{sre.summary}</p>
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                {[
                  { label: "Cluster",     value: CLUSTER.id                                    },
                  { label: "Region",      value: CLUSTER.region                                },
                  { label: "Environment", value: CLUSTER.env                                   },
                  { label: "SLA Target",  value: CLUSTER.sla                                   },
                  { label: "Anomalies",   value: sre.anomalies.length.toString(), color: "text-red-400"    },
                  { label: "Predictions", value: sre.predictions.length.toString(), color: "text-yellow-400" },
                ].map(m => (
                  <div key={m.label} className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 italic">{m.label}</span>
                    <span className={cn("text-[12px] font-black italic", m.color || "text-white/60")}>{m.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Service telemetry table ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#0B1220] border border-white/5 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <span className="text-[11px] font-black uppercase tracking-widest italic text-white/50 flex items-center gap-2">
                <Server className="w-3.5 h-3.5" /> Service Telemetry
              </span>
              <span className="text-[10px] text-white/20 font-mono italic">{SERVICES.length} services · {CLUSTER.id}</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {["Service", "Status", "CPU", "Memory", "Latency", "p99", "Error Rate", "RPS", "Uptime"].map((h, i) => (
                    <th key={i} className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white/20 italic whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SERVICES.map((svc, i) => (
                  <motion.tr
                    key={svc.name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className={cn(
                      "border-b border-white/[0.04] transition-colors",
                      svc.status === "critical" ? "bg-red-500/[0.03] hover:bg-red-500/[0.05]" :
                      svc.status === "degraded" ? "bg-yellow-500/[0.02] hover:bg-yellow-500/[0.04]" :
                      "hover:bg-white/[0.02]"
                    )}
                  >
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-bold text-white/80 font-mono">{svc.name}</span>
                    </td>
                    <td className="px-5 py-3"><HealthBadge status={svc.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 w-20">
                        <span className={cn("text-[11px] font-bold tabular-nums",
                          svc.cpu >= 90 ? "text-red-400" : svc.cpu >= 70 ? "text-yellow-400" : "text-white/60"
                        )}>{svc.cpu}%</span>
                        <MetricBar value={svc.cpu} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 w-20">
                        <span className={cn("text-[11px] font-bold tabular-nums",
                          svc.memory >= 90 ? "text-red-400" : svc.memory >= 70 ? "text-yellow-400" : "text-white/60"
                        )}>{svc.memory}%</span>
                        <MetricBar value={svc.memory} />
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-[11px] text-white/50 font-mono">{svc.latency}</span></td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-mono",
                        parseInt(svc.p99) > 500 ? "text-red-400" : parseInt(svc.p99) > 200 ? "text-yellow-400" : "text-white/50"
                      )}>{svc.p99}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-mono font-bold",
                        parseFloat(svc.errorRate) > 5 ? "text-red-400" : parseFloat(svc.errorRate) > 1 ? "text-yellow-400" : "text-emerald-400/60"
                      )}>{svc.errorRate}</span>
                    </td>
                    <td className="px-5 py-3"><span className="text-[11px] text-white/40 font-mono">{svc.rps}</span></td>
                    <td className="px-5 py-3"><span className="text-[11px] text-white/40">{svc.uptime}</span></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* ── Intelligence Panel ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-[#0B1220] border border-white/5 rounded-2xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-white/5 px-2 pt-2">
              {([
                { key: "anomalies",   label: "Anomalies",   count: sre.anomalies.length          },
                { key: "predictions", label: "Predictions",  count: sre.predictions.length        },
                { key: "actions",     label: "Actions",      count: sre.recommended_actions.length },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key)}
                  className={cn(
                    "px-5 py-3 text-[11px] font-bold transition-all border-b-2 flex items-center gap-2",
                    selectedTab === tab.key
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-white/30 hover:text-white/60"
                  )}
                >
                  {tab.label}
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-black tabular-nums",
                    tab.key === "anomalies" && sre.anomalies.some(a => a.severity === "critical")
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/8 text-white/30"
                  )}>{tab.count}</span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 pb-2 pr-2">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-[9px] font-black uppercase tracking-widest italic text-white/20 hover:text-white/40 transition-colors px-2 py-1 rounded border border-white/5 hover:border-white/10"
                >
                  {showRaw ? "Hide" : "Raw"} JSON
                </button>
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Raw JSON */}
                {showRaw && (
                  <motion.pre
                    key="raw"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-[#060d18] border border-white/5 rounded-xl p-4 text-[10px] font-mono text-emerald-400/80 overflow-auto max-h-80 custom-scrollbar"
                  >
                    {JSON.stringify(sre, null, 2)}
                  </motion.pre>
                )}

                {/* Anomalies */}
                {!showRaw && selectedTab === "anomalies" && (
                  <motion.div key="anomalies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {sre.anomalies.map((a, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveAnomaly(activeAnomaly === i ? null : i)}
                        className={cn(
                          "border rounded-xl overflow-hidden cursor-pointer transition-all",
                          a.severity === "critical" ? "border-red-500/20 bg-red-500/[0.04]" :
                          a.severity === "high"     ? "border-orange-500/15 bg-orange-500/[0.03]" :
                          "border-yellow-500/15 bg-yellow-500/[0.02]"
                        )}
                      >
                        <div className="flex items-start gap-4 px-5 py-4">
                          <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5",
                            a.severity === "critical" ? "text-red-400" :
                            a.severity === "high"     ? "text-orange-400" : "text-yellow-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-bold text-white font-mono">{a.service}</span>
                              <SeverityPill severity={a.severity} />
                              <span className="text-[10px] text-white/25 ml-auto italic">{a.confidence} confidence</span>
                            </div>
                            <p className="text-[12px] text-white/60 leading-relaxed">{a.issue}</p>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-white/20 shrink-0 transition-transform", activeAnomaly === i && "rotate-180")} />
                        </div>

                        <AnimatePresence>
                          {activeAnomaly === i && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                              className="overflow-hidden border-t border-white/5"
                            >
                              <div className="px-5 py-4 grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic mb-1.5">Root Cause</p>
                                  <p className="text-[11px] text-white/60 leading-relaxed">{a.root_cause}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic mb-1.5">Impact</p>
                                  <p className="text-[11px] text-white/60 leading-relaxed">{a.impact}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Predictions */}
                {!showRaw && selectedTab === "predictions" && (
                  <motion.div key="predictions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {sre.predictions.map((p, i) => (
                      <div key={i} className="flex items-start gap-4 px-5 py-4 bg-[#111827] border border-white/5 rounded-xl">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          p.metric === "memory"  ? "bg-red-500/10 text-red-400" :
                          p.metric === "cpu"     ? "bg-orange-500/10 text-orange-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        )}>
                          {p.metric === "memory" ? <HardDrive className="w-3.5 h-3.5" /> :
                           p.metric === "cpu"    ? <Cpu className="w-3.5 h-3.5" /> :
                           <Activity className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest italic text-white/30">{p.metric}</span>
                            <span className="flex items-center gap-1 text-[9px] text-yellow-400/70 italic">
                              <Clock className="w-2.5 h-2.5" />{p.timeframe}
                            </span>
                          </div>
                          <p className="text-[12px] text-white/65 leading-relaxed">{p.forecast}</p>
                        </div>
                        <TrendingUp className="w-4 h-4 text-red-400/50 shrink-0 mt-1" />
                      </div>
                    ))}

                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-indigo-300/75 leading-relaxed italic">
                        Cascade pattern detected: worker-pool failure is the origin event. Resolving it will relieve pressure on auth-service and prevent API SLA breach.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                {!showRaw && selectedTab === "actions" && (
                  <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {sre.recommended_actions.map((act, i) => {
                      const key = `${act.action}-${act.target}`;
                      const isExecuting = executingAction === key;
                      const isResolved  = resolvedActions.includes(key);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-4 px-5 py-4 border rounded-xl transition-all",
                            isResolved ? "border-emerald-500/20 bg-emerald-500/[0.04] opacity-60" :
                            act.priority === "high" ? "border-red-500/15 bg-red-500/[0.03]" :
                            "border-white/5 bg-white/[0.01]"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            act.action === "restart"     ? "bg-orange-500/10 text-orange-400" :
                            act.action === "scale"       ? "bg-blue-500/10   text-blue-400"   :
                            act.action === "rollback"    ? "bg-red-500/10    text-red-400"    :
                            "bg-white/5 text-white/40"
                          )}>
                            <ActionIcon action={act.action} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[12px] font-bold text-white capitalize">{act.action}</span>
                              <span className="text-[10px] font-mono text-white/40">→ {act.target}</span>
                              <PriorityDot priority={act.priority} />
                              <span className="text-[9px] text-white/20 italic uppercase tracking-widest">{act.priority}</span>
                            </div>
                            <p className="text-[11px] text-white/45 leading-relaxed">{act.reason}</p>
                          </div>
                          <button
                            onClick={() => !isResolved && executeAction(act)}
                            disabled={isExecuting || isResolved}
                            className={cn(
                              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all shrink-0",
                              isResolved
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                                : "bg-white/5 border border-white/10 text-white/50 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/25 active:scale-95"
                            )}
                          >
                            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> :
                             isResolved  ? <CheckCircle2 className="w-3 h-3" /> :
                             <Zap className="w-3 h-3" />}
                            {isExecuting ? "Running..." : isResolved ? "Done" : "Execute"}
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-white/[0.015] border border-white/5 text-[10px] text-white/25 italic">
                      <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> All actions are logged to audit trail</span>
                      <span>{resolvedActions.length}/{sre.recommended_actions.length} executed</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default MonitoringView;
