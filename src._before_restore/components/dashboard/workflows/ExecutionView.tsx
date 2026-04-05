import React, { useEffect, useMemo, useState } from "react";
import { Brain, Play, RotateCcw, Sparkles, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRun } from "@/hooks/useRun";
import type { RunItem } from "@/store/orchestration";
import SkeletonBlock from "../control-plane/SkeletonBlock";
import EmptyState from "../control-plane/EmptyState";
import ExecutionTimeline, { type PredictedExecutionItem } from "./ExecutionTimeline";
import SimulationModal from "./SimulationModal";
import AIReasoningPanel from "./AIReasoningPanel";

type TriggerSource = "AI" | "Schedule" | "Manual" | "Anomaly";
type FeedTone = "green" | "yellow" | "red" | "blue";

interface RunMeta {
  triggerSource: TriggerSource;
  aiReason: string;
}

interface LiveFeedItem {
  id: string;
  ts: string;
  label: string;
  tone: FeedTone;
}

const ExecutionView: React.FC = () => {
  const { runs, activeRun, refreshRuns, openRun, trigger, retry } = useRun();
  const [workflowId, setWorkflowId] = useState("");
  const [version, setVersion] = useState("1");
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [runMeta, setRunMeta] = useState<Record<string, RunMeta>>({});
  const [feed, setFeed] = useState<LiveFeedItem[]>([
    { id: "f-1", ts: "Now", label: "AI-triggered execution queued", tone: "blue" },
    { id: "f-2", ts: "2m", label: "Self-heal retry completed", tone: "green" },
  ]);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [autoRetried, setAutoRetried] = useState<Record<string, boolean>>({});
  const [aiModeEnabled, setAiModeEnabled] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState(4);
  const [safetyLimit, setSafetyLimit] = useState(80);

  useEffect(() => {
    void refreshRuns().finally(() => setLoadingRuns(false));
  }, [refreshRuns]);

  useEffect(() => {
    const ensureMeta = (r: RunItem): RunMeta => {
      const existing = runMeta[r.id];
      if (existing) return existing;
      const source: TriggerSource =
        r.status === "FAILED" ? "Anomaly" : r.status === "QUEUED" || r.status === "RUNNING" ? "AI" : "Schedule";
      const reason =
        source === "Anomaly"
          ? "Failure recovery"
          : source === "AI"
          ? "CPU spike predicted"
          : "Cost optimization";
      return { triggerSource: source, aiReason: reason };
    };
    setRunMeta((prev) => {
      const next = { ...prev };
      for (const r of runs) {
        if (!next[r.id]) next[r.id] = ensureMeta(r);
      }
      return next;
    });
  }, [runs]);

  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = (event) => {
      let message = "AI execution update";
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        message = String(data.message ?? data.action ?? data.event ?? message);
      } catch {
        message = event.data || message;
      }
      const tone: FeedTone =
        message.toLowerCase().includes("failed") || message.toLowerCase().includes("rollback")
          ? "red"
          : message.toLowerCase().includes("retry") || message.toLowerCase().includes("restart")
          ? "yellow"
          : message.toLowerCase().includes("scale") || message.toLowerCase().includes("success")
          ? "green"
          : "blue";
      setFeed((prev) => [{ id: `${Date.now()}`, ts: "Now", label: message, tone }, ...prev].slice(0, 8));
      void refreshRuns();
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [refreshRuns]);

  useEffect(() => {
    const failedAutoRuns = runs.filter((r) => {
      const source = runMeta[r.id]?.triggerSource;
      return r.status === "FAILED" && source !== "Manual" && !autoRetried[r.id];
    });
    if (failedAutoRuns.length === 0) return;

    void Promise.all(
      failedAutoRuns.map(async (r) => {
        setAutoRetried((prev) => ({ ...prev, [r.id]: true }));
        setFeed((prev) => [
          { id: `${Date.now()}-${r.id}`, ts: "Now", label: `Self-heal retry queued for ${r.id}`, tone: "yellow" },
          ...prev,
        ].slice(0, 8));
        try {
          await retry(r.id);
          setFeed((prev) => [
            { id: `${Date.now()}-${r.id}-ok`, ts: "Now", label: `Recovery retry triggered for ${r.id}`, tone: "green" },
            ...prev,
          ].slice(0, 8));
        } catch {
          setFeed((prev) => [
            { id: `${Date.now()}-${r.id}-err`, ts: "Now", label: `Auto-retry failed for ${r.id}`, tone: "red" },
            ...prev,
          ].slice(0, 8));
        }
      })
    );
  }, [runs, runMeta, autoRetried, retry]);

  const stats = useMemo(() => {
    const success = runs.filter((r) => r.status === "SUCCESS").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const running = runs.filter((r) => r.status === "RUNNING" || r.status === "QUEUED").length;
    const predicted = runs.filter((r) => runMeta[r.id]?.triggerSource === "AI" || runMeta[r.id]?.triggerSource === "Anomaly").length;
    return { success, failed, running, predicted };
  }, [runs, runMeta]);

  const predictedRuns: PredictedExecutionItem[] = useMemo(() => {
    const source = runs.slice(0, 3);
    return source.map((run, idx) => ({
      id: `pred-${run.id}`,
      workflowId: run.workflowId,
      startsIn: idx === 0 ? "5 min" : idx === 1 ? "10 min" : "30 min",
      reason:
        idx === 0
          ? "Traffic spike predicted"
          : idx === 1
          ? "Auto-execution planned (failure risk detected)"
          : "Scheduled execution by optimization policy",
      triggerType: idx === 0 ? "ai" : idx === 1 ? "anomaly" : "scheduled",
      riskScore: idx === 0 ? 72 : idx === 1 ? 68 : 44,
    }));
  }, [runs]);

  const getRunProgress = (run: RunItem) => {
    const steps = run.steps ?? [];
    if (!steps.length) return run.status === "SUCCESS" ? 100 : run.status === "RUNNING" ? 45 : run.status === "FAILED" ? 70 : 0;
    const done = steps.filter((s) => s.status === "SUCCESS" || s.status === "FAILED").length;
    return Math.max(4, Math.min(100, Math.round((done / steps.length) * 100)));
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1220]">
      <div className="flex items-center gap-6 px-8 py-3 border-b border-[#1F2937] shrink-0 bg-[#030712]/90">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
          <Brain className="w-3.5 h-3.5" />
          AI execution active
        </div>
        <div className="text-yellow-300 text-sm font-bold">Running executions: {stats.running}</div>
        <div className="text-indigo-300 text-sm font-bold">Predicted executions: {stats.predicted}</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[11px] text-white/70">
            <input type="checkbox" checked={aiModeEnabled} onChange={(e) => setAiModeEnabled(e.target.checked)} className="accent-emerald-500" />
            AI Mode
          </label>
          <input
            value={String(maxConcurrent)}
            onChange={(e) => setMaxConcurrent(Number(e.target.value) || 1)}
            className="w-16 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
            title="Max concurrent executions"
          />
          <input
            value={String(safetyLimit)}
            onChange={(e) => setSafetyLimit(Number(e.target.value) || 50)}
            className="w-16 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
            title="Safety limit %"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-white/15 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setSimulationOpen(true)}
          >
            Simulate Execution
          </Button>
          <Button
            size="sm"
            className="h-8 bg-white/10 hover:bg-white/20 text-white"
            onClick={() => {
              void trigger({ workflowId: workflowId.trim(), version: Number.parseInt(version, 10) });
              setFeed((prev) => [{ id: `${Date.now()}-manual`, ts: "Now", label: `Manual run queued for ${workflowId.trim()}`, tone: "blue" }, ...prev].slice(0, 8));
            }}
            disabled={!workflowId.trim()}
          >
            <Play className="w-3 h-3 mr-1" />
            Trigger Run
          </Button>
        </div>
      </div>

      <div className="px-8 py-2 border-b border-[#1F2937] bg-[#020617] flex items-center gap-3 text-[11px] text-white/60">
        <span>Max concurrent: <span className="text-white/85">{maxConcurrent}</span></span>
        <span>Safety limit: <span className="text-white/85">{safetyLimit}%</span></span>
        <span>Auto-retry: <span className="text-emerald-300">{aiModeEnabled ? "ON" : "OFF"}</span></span>
      </div>

      <div className="border-b border-[#1F2937] px-8 py-3 bg-[#020617]/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Live Execution Feed</p>
        <div className="space-y-1">
          {feed.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px] text-white/80">
              {item.tone === "green" && <Sparkles className="w-3 h-3 text-emerald-400" />}
              {item.tone === "yellow" && <RotateCcw className="w-3 h-3 text-yellow-400" />}
              {item.tone === "red" && <XCircle className="w-3 h-3 text-red-400" />}
              {item.tone === "blue" && <Wrench className="w-3 h-3 text-sky-400" />}
              <span className="text-white/40 font-mono">{item.ts}</span>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loadingRuns ? (
          <div className="space-y-2">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<Brain className="w-5 h-5" />}
            title="Autonomous execution ready"
            description="AI will automatically execute workflows based on system intelligence"
          />
        ) : (
          <ExecutionTimeline
            runs={runs}
            predicted={predictedRuns}
            onSelectRun={(runId) => void openRun(runId)}
            onSelectPrediction={(item) => {
              setWorkflowId(item.workflowId);
              setSimulationOpen(true);
              setFeed((prev) => [{ id: `${Date.now()}-pred`, ts: "Now", label: `Prediction selected for ${item.workflowId}`, tone: "blue" }, ...prev].slice(0, 8));
            }}
            getRunProgress={getRunProgress}
          />
        )}
      </div>

      <div className="px-6 pb-6">
        <AIReasoningPanel
          run={activeRun}
          triggerSource={activeRun ? runMeta[activeRun.id]?.triggerSource : undefined}
          reason={activeRun ? runMeta[activeRun.id]?.aiReason : undefined}
        />
      </div>

      <SimulationModal
        open={simulationOpen}
        onOpenChange={setSimulationOpen}
        defaultWorkflowId={workflowId}
      />
    </div>
  );
};

export default ExecutionView;

