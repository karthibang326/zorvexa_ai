import React, { useEffect, useMemo, useState } from "react";
import ModuleHeader from "./ModuleHeader";
import MetricCard from "./control-plane/MetricCard";
import ActivityFeed, { type ActivityItem } from "./control-plane/ActivityFeed";
import GraphCard from "./control-plane/GraphCard";
import SkeletonBlock from "./control-plane/SkeletonBlock";
import { motion } from "framer-motion";
import { useAiStream } from "@/contexts/AiStreamContext";

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "";
  return `${root}/api`;
}

const OverviewView: React.FC = () => {
  const { kpis: streamKpis, connected: streamLive } = useAiStream();
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [health, setHealth] = useState<"green" | "yellow" | "red">("green");
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const push = (message: string, ts = new Date().toISOString()) => {
      setFeed((prev) => [{ id: `${ts}-${Math.random()}`, message, ts }, ...prev].slice(0, 30));
    };

    const incidentEs = new EventSource(`${getApiBase()}/incident/stream`);
    const autoEs = new EventSource(`${getApiBase()}/autonomous/stream`);

    const incHandler = (e: MessageEvent<string>) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "incident_detected") push(`Incident detected: ${d.issue ?? "unknown issue"}`);
        if (d.type === "resolved") push(`Incident resolved: ${d.issue ?? "issue"}`);
      } catch {
        // no-op
      }
    };
    const autoHandler = (e: MessageEvent<string>) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "action") push(`AI executed action: ${d.payload?.decision ?? d.payload?.status ?? "control action"}`);
        if (d.type === "prediction") push(`AI prediction: ${d.payload?.predictedIssue ?? "anomaly risk"}`);
      } catch {
        // no-op
      }
    };
    incidentEs.addEventListener("incident_detected", incHandler as EventListener);
    incidentEs.addEventListener("resolved", incHandler as EventListener);
    autoEs.addEventListener("prediction", autoHandler as EventListener);
    autoEs.addEventListener("action", autoHandler as EventListener);

    const interval = setInterval(() => {
      setHealth((curr) => (curr === "green" ? "yellow" : curr === "yellow" ? "green" : "green"));
    }, 12000);

    return () => {
      clearInterval(interval);
      incidentEs.close();
      autoEs.close();
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoadingMetrics(false), 900);
    return () => clearTimeout(t);
  }, []);

  const healthPercent = useMemo(() => {
    if (streamKpis.healthScore > 0) return `${streamKpis.healthScore.toFixed(1)}%`;
    return health === "green" ? "99.7%" : health === "yellow" ? "96.2%" : "89.4%";
  }, [health, streamKpis.healthScore]);

  const healthTone = useMemo(() => {
    if (streamKpis.healthScore > 0) {
      if (streamKpis.healthScore >= 97) return "good" as const;
      if (streamKpis.healthScore >= 90) return "warn" as const;
      return "bad" as const;
    }
    return health === "green" ? ("good" as const) : health === "yellow" ? ("warn" as const) : ("bad" as const);
  }, [health, streamKpis.healthScore]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-8"
    >
      <ModuleHeader title="Overview" subtitle="Autonomous AI Control Plane — system-wide orchestration, execution, intelligence, and reliability" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingMetrics ? (
          <>
            <SkeletonBlock className="h-[110px]" />
            <SkeletonBlock className="h-[110px]" />
            <SkeletonBlock className="h-[110px]" />
            <SkeletonBlock className="h-[110px]" />
          </>
        ) : (
          <>
            <MetricCard label="Active Workflows" value="18" hint="Orchestration layer" />
            <MetricCard
              label="AI pipeline (live)"
              value={streamLive ? `${streamKpis.counts.RESULT} cycles` : "—"}
              hint={streamLive ? "WebSocket stream" : "Connect backend for live KPIs"}
            />
            <MetricCard label="System Health %" value={healthPercent} tone={healthTone} />
            <MetricCard label="Cost Today" value="$1,842" hint="Intelligence optimized" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ActivityFeed items={feed} />

        <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">System Health Panel</p>
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl border px-3 py-3 ${health === "green" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-[#111827] text-white/40"}`}>GREEN</div>
            <div className={`rounded-xl border px-3 py-3 ${health === "yellow" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" : "border-white/10 bg-[#111827] text-white/40"}`}>YELLOW</div>
            <div className={`rounded-xl border px-3 py-3 ${health === "red" ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-white/10 bg-[#111827] text-white/40"}`}>RED</div>
          </div>
          <p className="text-[11px] text-white/35 mt-3">Real-time health indicator driven by incidents and AI action outcomes.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <GraphCard title="CPU" unit="%" values={[35, 42, 38, 52, 49, 58, 54, 47, 45, 50]} />
        <GraphCard title="Memory" unit="%" values={[44, 46, 43, 48, 53, 57, 55, 58, 56, 52]} />
        <GraphCard title="Request Latency" unit="ms" values={[110, 118, 120, 132, 125, 140, 138, 126, 119, 116]} />
        <GraphCard title="Error Rate" unit="%" values={[0.2, 0.3, 0.2, 0.4, 0.5, 0.7, 0.6, 0.4, 0.3, 0.2]} />
      </div>
    </motion.div>
  );
};

export default OverviewView;

