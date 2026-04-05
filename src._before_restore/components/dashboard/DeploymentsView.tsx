import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Gauge, ListTree, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDeploymentHistory, type DeploymentHistoryItem } from "@/lib/workflows";
import { withContextQuery } from "@/lib/context";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type StatusTone = "success" | "failed" | "running";

interface DeploymentLogEvent {
  message: string;
  status?: string;
  event?: string;
  ts: string;
}

function mapTone(status: string): StatusTone {
  const s = status.toUpperCase();
  if (s.includes("FAIL")) return "failed";
  if (s.includes("SUCCEEDED") || s.includes("DEPLOYED")) return "success";
  return "running";
}

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const DeploymentsView: React.FC = () => {
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeploymentLogEvent[]>([]);

  const [riskLevel] = useState<"Low" | "Medium" | "High">("Medium");
  const [logsOpen, setLogsOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getDeploymentHistory();
      setHistory(items);
      if (items.length > 0) setSelectedId((curr) => (curr && items.some((i) => i.id === curr) ? curr : items[0].id));
      if (items.length === 0) setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!selectedId) return;
    setLogs([]);
    const stream = new EventSource(withContextQuery(`${getApiBase()}/deploy/${encodeURIComponent(selectedId)}/stream`));
    const pushEvent = (raw: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(raw.data) as DeploymentLogEvent;
        setLogs((prev) => [...prev, parsed].slice(-400));
      } catch {
        // ignore malformed stream events
      }
    };
    stream.addEventListener("deploy_started", pushEvent as EventListener);
    stream.addEventListener("build_started", pushEvent as EventListener);
    stream.addEventListener("build_completed", pushEvent as EventListener);
    stream.addEventListener("deploy_in_progress", pushEvent as EventListener);
    stream.addEventListener("deploy_success", pushEvent as EventListener);
    stream.addEventListener("deploy_failed", pushEvent as EventListener);
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [selectedId]);

  const selectedDeployment = useMemo(() => history.find((h) => h.id === selectedId) ?? null, [history, selectedId]);
  const currentTone = selectedDeployment ? mapTone(selectedDeployment.status) : "running";
  const decision = currentTone === "failed" ? "Rollback" : currentTone === "running" ? "Hold" : "Proceed";
  const confidence = currentTone === "failed" ? 62 : currentTone === "running" ? 78 : 91;
  const aiAction = currentTone === "failed" ? "Prepare rollback and protect user paths" : currentTone === "running" ? "Stabilize canary and monitor" : "Continue rollout";
  const health = currentTone === "failed" ? "Critical" : currentTone === "running" ? "Degrading" : "Healthy";
  const summary = currentTone === "failed"
    ? "Deployment risk is elevated. AI is containing impact."
    : currentTone === "running"
      ? "Release is active with controlled risk."
      : "Deployment is stable and safe.";
  const nextAction = currentTone === "failed" ? "Rollback now." : currentTone === "running" ? "Hold and validate SLOs." : "Complete rollout.";

  const timeline = useMemo(() => {
    if (!selectedDeployment) return [];
    return [
      `Started ${selectedDeployment.service ?? "service"} ${selectedDeployment.versionLabel ?? `v${selectedDeployment.version}`}.`,
      "Canary rollout started for controlled traffic.",
      currentTone === "running" ? "AI detected drift and applied stabilization policy." : "Service health stayed inside guardrails.",
      currentTone === "failed" ? "Rollback window opened by AI decision engine." : "Release remains on-track.",
    ];
  }, [selectedDeployment, currentTone]);

  return (
    <div className="space-y-4 pb-2">
      <section className="rounded-2xl bg-[#0B1220] h-[92px] px-5 py-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn("border", currentTone === "success" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : currentTone === "failed" ? "bg-red-500/15 text-red-300 border-red-500/20" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/20")}>
            {health}
          </Badge>
          <Badge variant="secondary">Risk: {riskLevel}</Badge>
          <Badge variant="secondary">Confidence: {confidence}%</Badge>
          <p className="text-sm text-white/80 max-w-md line-clamp-2">{summary} AI stabilized latency spike.</p>
          <p className="text-sm font-medium text-white">→ {nextAction}</p>
        </div>
        <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
          <SheetTrigger asChild>
            <button type="button" className="h-8 px-3 rounded-lg bg-white/5 text-xs text-white/80 hover:bg-white/10">Open Logs</button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-[#0B1220] border-white/10 text-white w-[560px] max-w-[80vw]">
            <SheetHeader>
              <SheetTitle>Deployment Logs</SheetTitle>
            </SheetHeader>
            <div className="mt-4 max-h-[84vh] overflow-auto space-y-1">
              {(logs.length ? logs : [{ message: "No technical events streamed for current selection.", ts: new Date().toISOString() }]).map((row, idx) => (
                <p key={`log-${idx}`} className="text-xs text-white/65">
                  [{new Date(row.ts).toLocaleTimeString()}] {row.message}
                </p>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[70%_30%] gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-2xl bg-[#0B1220] p-4 space-y-2 h-[170px] overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-white/45 inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Deployment Decision</p>
          <p className="text-base font-semibold">{decision}</p>
          <p className="text-sm text-white/70">Risk: {riskLevel}</p>
          <p className="text-sm text-white/80">AI Action: {aiAction}</p>
          <p className="text-sm text-white/60 line-clamp-2">Reason: Release safety and customer impact guardrails.</p>
        </article>

        <article className="rounded-2xl bg-[#0B1220] p-4 space-y-2 h-[170px] overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-white/45 inline-flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Stability Engine</p>
          <p className="text-base font-semibold">State: {health}</p>
          <p className="text-sm text-white/80 line-clamp-2">Issues: {currentTone === "failed" ? "Error spike with regression risk." : currentTone === "running" ? "Minor latency drift in canary." : "No critical issue detected."}</p>
          <p className="text-sm text-white/80 line-clamp-2">AI Actions: Scale, restart, and traffic-balancing policies applied.</p>
          <p className="text-sm text-emerald-300">Recovery: {currentTone === "failed" ? "In progress" : "Stable"}</p>
        </article>

        <article className="rounded-2xl bg-[#0B1220] p-4 space-y-2 h-[170px] overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-white/45 inline-flex items-center gap-2"><Gauge className="w-4 h-4" />Optimization Engine</p>
          <p className="text-sm text-white/80">Performance Gain: +18%</p>
          <p className="text-sm text-white/80">Cost Optimization: -11%</p>
          <p className="text-sm text-white/80 line-clamp-2">AI Recommendation: Keep adaptive autoscaling and trim idle capacity.</p>
        </article>
        </div>
        <aside className="rounded-2xl bg-[#0B1220] p-4 h-[170px] overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-white/45 inline-flex items-center gap-2"><ListTree className="w-4 h-4" />Timeline</p>
          <div className="mt-2 space-y-1">
            {timeline.map((item, idx) => (
              <p key={`timeline-${idx}`} className="text-xs text-white/75 line-clamp-2">{item}</p>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-2xl bg-[#0B1220] p-2">
        <div className="flex gap-2 overflow-x-auto h-10 items-center">
          {loading ? <p className="text-sm text-white/60">Loading deployments...</p> : history.map((dep) => (
            <button
              key={dep.id}
              type="button"
              onClick={() => setSelectedId(dep.id)}
              className={cn("shrink-0 rounded-lg px-3 py-2 text-xs", dep.id === selectedId ? "bg-white/15 text-white" : "bg-white/5 text-white/70")}
            >
              {(dep.service ?? "service")} {dep.versionLabel ?? `v${dep.version}`}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DeploymentsView;
