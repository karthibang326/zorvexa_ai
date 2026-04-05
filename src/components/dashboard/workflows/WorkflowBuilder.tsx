import React, { useEffect, useMemo, useRef, useState } from "react";
import { 
  Plus, Zap, Brain, 
  Terminal, Globe, Database, 
  ChevronRight, Play, Save, 
  RotateCcw, Trash2, Maximize2, 
  Settings, ZoomIn, ZoomOut, Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDeployStatus } from "@/lib/workflows";
import { useWorkflow } from "@/hooks/useWorkflow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withContextQuery } from "@/lib/context";

const Node = ({ type, label, icon: Icon, active = false, status = "Success" }: any) => (
  <motion.div 
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    whileHover={{ scale: 1.05 }}
    className={cn(
      "w-52 bg-[#111827] border rounded-2xl p-4 shadow-[0_14px_34px_rgba(2,6,23,0.45)] relative group cursor-pointer transition-all duration-200",
      active ? "border-primary/60 shadow-[0_0_0_1px_rgba(37,99,235,0.4),0_18px_40px_rgba(37,99,235,0.25)]" : "border-white/10 hover:border-white/30"
    )}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={cn(
        "p-2 rounded-xl border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground group-hover:bg-white/10 group-hover:text-white"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic">{type}</span>
        <span className="text-[11px] font-bold text-foreground/90 leading-tight">{label}</span>
      </div>
    </div>
    
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full shadow-sm",
          status === "Success" ? "bg-emerald-400 shadow-glow-emerald" : "bg-yellow-400 animate-pulse shadow-[0_0_14px_rgba(234,179,8,0.6)]"
        )} />
      <span className={status === "Success" ? "text-emerald-400" : "text-yellow-300"}>{status}</span>
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </div>

    {/* Port markers */}
    <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-card border-2 border-border-subtle z-10" />
    <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-primary-foreground z-10" />
  </motion.div>
);

const Connector = ({ orientation = "vertical", status = "Active" }: any) => (
  <div className={cn(
    "flex items-center justify-center relative",
    orientation === "vertical" ? "h-20 w-px bg-white/15" : "w-20 h-px bg-white/15"
  )}>
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "absolute",
        orientation === "vertical" 
          ? "w-1 h-3/4 left-1/2 -translate-x-1/2 rounded-full" 
          : "h-1 w-3/4 top-1/2 -translate-y-1/2 rounded-full",
        status === "Active" ? "bg-primary/40 blur-[2px]" : "bg-muted"
      )}
    />
    <div className="absolute p-1 bg-[#0E0F12] border border-white/20 rounded-full cursor-pointer hover:border-primary transition-all">
      <Plus className="w-2.5 h-2.5 text-muted-foreground" />
    </div>
  </div>
);

const WorkflowBuilder = ({
  workflowId,
  initialContext,
}: {
  workflowId: string;
  initialContext?: { filter?: string };
}) => {
  const filterLabel = initialContext?.filter ? String(initialContext.filter) : "all";
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [workflowVersion, setWorkflowVersion] = useState<string>("v2.4");
  const [aiMode, setAiMode] = useState<"manual" | "assist" | "auto">("assist");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [maxActionsPerHour, setMaxActionsPerHour] = useState<number>(12);
  const [approvalRequired, setApprovalRequired] = useState<boolean>(true);
  const [executionEvents, setExecutionEvents] = useState<Array<{ ts: string; type: string; text: string }>>([]);
  const [lastSimulation, setLastSimulation] = useState<string>("");
  const [optimizationNotes, setOptimizationNotes] = useState<string>("");
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);

  const [reverting, setReverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const [deployRolloutName, setDeployRolloutName] = useState("");
  const [deployNamespace, setDeployNamespace] = useState("");
  const [deployStrategy, setDeployStrategy] = useState<"canary" | "rolling">("canary");
  const [revertVersion, setRevertVersion] = useState<string>("1");
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const { loadWorkflow, save, revert, deploy, executeAi, simulateAi, optimizeAi } = useWorkflow();


  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [deploymentMessage, setDeploymentMessage] = useState<string | null>(null);

  const lastSavedText = useMemo(() => {
    if (!lastSavedAt) return "—";
    const ms = Date.now() - lastSavedAt.getTime();
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 30) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }, [lastSavedAt]);

  const iconForNodeType = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("trigger")) return Globe;
    if (t.includes("ai")) return Brain;
    if (t.includes("operation")) return Play;
    if (t.includes("action")) return Zap;
    return Terminal;
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const wf = await loadWorkflow(workflowId);
        if (cancelled) return;
        setNodes(Array.isArray(wf.nodes) ? wf.nodes : []);
        setEdges(Array.isArray(wf.edges) ? wf.edges : []);
        setWorkflowVersion(wf.version || "v2.4");
        setLastSavedAt(wf.updatedAt ? new Date(wf.updatedAt) : new Date());
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load workflow";
        toast.error(msg);
        setNodes([]);
        setEdges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  useEffect(() => {
    if (!deploymentId) return;

    let cancelled = false;
    const startedAt = Date.now();
    const maxMs = 180_000; // 3 minutes

    const interval = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > maxMs) {
        clearInterval(interval);
        setDeploying(false);
        setDeploymentMessage("Timed out waiting for rollout to complete.");
        return;
      }

      try {
        const s = await getDeployStatus(deploymentId);
        setDeploymentStatus(s.status);
        setDeploymentMessage(s.message ?? null);

        const done =
          s.status === "SUCCEEDED" ||
          s.status === "FAILED" ||
          s.status === "ROLLOUT_HEALTHY" ||
          s.status === "ROLLOUT_FAILED";
        if (done) {
          clearInterval(interval);
          setDeploying(false);
        }
      } catch (e) {
        // Retry by leaving interval running.
        const msg = e instanceof Error ? e.message : "Failed to poll deployment status";
        setDeploymentMessage(msg);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deploymentId]);

  useEffect(() => {
    if (!workflowId) return;
    const es = new EventSource(withContextQuery(`/api/workflows/stream?workflowId=${encodeURIComponent(workflowId)}`));
    const onEvent = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data) as Record<string, unknown>;
        const type = String(parsed.type ?? "update");
        const payload = parsed.payload as Record<string, unknown> | undefined;
        const text =
          payload?.status
            ? `${type}: ${String(payload.status)}`
            : payload?.reason
              ? `${type}: ${String(payload.reason)}`
              : JSON.stringify(payload ?? parsed);
        setExecutionEvents((prev) => [{ ts: new Date().toLocaleTimeString(), type, text }, ...prev].slice(0, 80));
      } catch {
        setExecutionEvents((prev) => [{ ts: new Date().toLocaleTimeString(), type: "update", text: ev.data }, ...prev].slice(0, 80));
      }
    };
    es.addEventListener("run_started", onEvent as EventListener);
    es.addEventListener("node_started", onEvent as EventListener);
    es.addEventListener("node_retry", onEvent as EventListener);
    es.addEventListener("node_success", onEvent as EventListener);
    es.addEventListener("run_finished", onEvent as EventListener);
    return () => es.close();
  }, [workflowId]);

  useEffect(() => {
    if (paletteRef.current) paletteRef.current.scrollTop = 0;
    if (contextRef.current) contextRef.current.scrollTop = 0;
  }, [workflowId]);

  const clampZoom = (v: number) => Math.max(0.5, Math.min(2.0, v));
  const zoomIn = () => setZoomLevel((z) => clampZoom(Math.round((z + 0.1) * 10) / 10));
  const zoomOut = () => setZoomLevel((z) => clampZoom(Math.round((z - 0.1) * 10) / 10));
  const resetZoom = () => setZoomLevel(1);

  async function handleRevertConfirm() {
    if (!workflowId) return;
    try {
      setReverting(true);
      const selectedVersion = Number.parseInt(revertVersion, 10);
      if (Number.isNaN(selectedVersion) || selectedVersion < 1) {
        toast.error("Enter a valid version number.");
        return;
      }
      const old = await revert(workflowId, selectedVersion);
      setNodes(Array.isArray(old.nodes) ? old.nodes : []);
      setEdges(Array.isArray(old.edges) ? old.edges : []);
      setWorkflowVersion(old.version || "v2.4");
      setLastSavedAt(new Date());
      setIsRevertOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to revert workflow";
      toast.error(msg);
    } finally {
      setReverting(false);
    }
  }

  async function handleSave() {
    if (!workflowId) return;
    try {
      setSaving(true);
      const saved = await save(workflowId, nodes, edges);
      setWorkflowVersion(saved.version || "v2.4");
      setLastSavedAt(saved.updatedAt ? new Date(saved.updatedAt) : new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save workflow";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeployLogic() {
    if (!workflowId) return;
    const rolloutName = deployRolloutName.trim();
    const namespace = deployNamespace.trim();
    if (!rolloutName || !namespace || !deployStrategy) {
      toast.error("Deploy requires rollout name, namespace, and strategy.");
      return;
    }

    try {
      setDeploying(true);
      setDeploymentId(null);
      setDeploymentStatus(null);
      setDeploymentMessage(null);

      const res = await deploy(workflowId, {
        rolloutName,
        namespace,
        strategy: deployStrategy,
      });

      setDeploymentId(res.deploymentId);
      setDeploymentStatus(res.status);
      setDeploymentMessage("Starting rollout...");
      toast.success("Deployment started.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start deployment";
      toast.error(msg);
      setDeploying(false);
    }
  }

  async function handleAiExecute() {
    if (!workflowId) return;
    try {
      const out = await executeAi(workflowId, aiMode, {
        environment: "prod",
        namespace: deployNamespace.trim() || "prod",
        strategy: deployStrategy,
        maxActionsPerHour,
        approvalRequired,
      });
      const highRisk = out.steps.some((s) => (s.reason ?? "").toLowerCase().includes("high"));
      setRiskLevel(highRisk ? "HIGH" : out.status === "PENDING_APPROVAL" ? "MEDIUM" : "LOW");
      setExecutionEvents((prev) => [{ ts: new Date().toLocaleTimeString(), type: "execute", text: `Run ${out.runId} → ${out.status}` }, ...prev].slice(0, 80));
    } catch {
      // toast in hook
    }
  }

  async function handleAiSimulate() {
    if (!workflowId) return;
    try {
      const out = await simulateAi(workflowId, aiMode, {
        environment: "prod",
        namespace: deployNamespace.trim() || "prod",
        strategy: deployStrategy,
        maxActionsPerHour,
        approvalRequired,
      });
      setRiskLevel(out.simulation.risk === "high" ? "HIGH" : out.simulation.risk === "medium" ? "MEDIUM" : "LOW");
      setLastSimulation(
        `Latency ${out.simulation.predicted_latency}, CPU ${out.simulation.cpu_reduction}, Cost ${out.simulation.cost_increase}, Risk ${out.simulation.risk.toUpperCase()}`
      );
      setExecutionEvents((prev) => [{ ts: new Date().toLocaleTimeString(), type: "simulate", text: "Simulation completed" }, ...prev].slice(0, 80));
    } catch {
      // toast in hook
    }
  }

  async function handleAiOptimize() {
    if (!workflowId) return;
    try {
      const out = await optimizeAi(workflowId);
      setOptimizationNotes(out.suggestions.join(" "));
      setExecutionEvents((prev) => [
        {
          ts: new Date().toLocaleTimeString(),
          type: "optimize",
          text: `Latency -${out.estimatedLatencyReductionPct}% | Cost -${out.estimatedCostReductionPct}%`,
        },
        ...prev,
      ].slice(0, 80));
    } catch {
      // toast in hook
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0E0F12] overflow-hidden">
      <div className="min-h-[88px] border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between px-6 py-3 shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
             <h2 className="text-[13px] font-black uppercase tracking-tight text-white/90 italic flex items-center gap-3">
               Auto-Scale Prod v2 <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono text-[9px] not-italic border border-amber-500/20">DRAFT</span>
             </h2>
             <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest italic opacity-60">Last saved: {lastSavedText}</span>
             <span className="text-[9px] text-white/25 uppercase font-bold tracking-widest italic opacity-60 mt-1">
               Create context: {filterLabel}
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as any)}
              className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-[10px] font-black uppercase tracking-widest text-white/80"
              title="AI Mode"
            >
              <option value="manual">MANUAL</option>
              <option value="assist">ASSIST</option>
              <option value="auto">AUTO</option>
            </select>
            <span className={cn(
              "h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest inline-flex items-center",
              riskLevel === "HIGH" ? "border-red-500/30 text-red-300 bg-red-500/10" : riskLevel === "MEDIUM" ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/10" : "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
            )}>
              Risk {riskLevel}
            </span>
            <input
              value={String(maxActionsPerHour)}
              onChange={(e) => setMaxActionsPerHour(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-20 rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 text-[11px] text-white/80"
              title="Max actions per hour"
            />
            <label className="h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white/60 inline-flex items-center gap-2">
              Approval
              <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
            </label>
          </div>
          <div className="flex items-center bg-black/40 border border-white/[0.05] rounded-xl p-1 shadow-inner">
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
               aria-label="Zoom in"
               onClick={zoomIn}
               disabled={loading}
             >
               <ZoomIn className="w-4 h-4" />
             </Button>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
               aria-label="Zoom out"
               onClick={zoomOut}
               disabled={loading}
             >
               <ZoomOut className="w-4 h-4" />
             </Button>
             <div className="h-4 w-[1px] bg-white/[0.1] mx-1" />
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
               aria-label="Reset zoom"
               onClick={resetZoom}
             >
               <Maximize2 className="w-4 h-4" />
             </Button>
             <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-white/45">{Math.round(zoomLevel * 100)}%</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/[0.05] bg-white/[0.02] text-white/60 text-[10px] font-black uppercase hover:bg-white/[0.05] hover:text-white transition-all rounded-xl shadow-md disabled:opacity-50 shrink-0"
            disabled={loading || reverting}
            onClick={() => setIsRevertOpen(true)}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2 opacity-60" /> {reverting ? "Reverting..." : "Revert"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/[0.05] bg-white/[0.02] text-white/60 text-[10px] font-black uppercase hover:bg-white/[0.05] hover:text-white transition-all rounded-xl shadow-md disabled:opacity-50 shrink-0"
            disabled={loading || saving}
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5 mr-2 opacity-60" /> {saving ? "Saving..." : `Save ${workflowVersion}`}
          </Button>
          <Button
            size="sm"
            className="h-9 bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-glow-emerald rounded-xl px-4 disabled:opacity-50 shrink-0"
            disabled={loading || deploying}
            onClick={handleDeployLogic}
          >
            <Play className="w-4 h-4 mr-2" /> {deploying ? "Deploying..." : "Deploy Logic"}
          </Button>
          <Button
            size="sm"
            className="h-9 bg-indigo-500 text-white hover:bg-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 shrink-0"
            disabled={loading}
            onClick={() => void handleAiSimulate()}
          >
            Simulate Workflow
          </Button>
          <Button
            size="sm"
            className="h-9 bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 shrink-0"
            disabled={loading}
            onClick={() => void handleAiExecute()}
          >
            AI Execute
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-primary/40 text-primary hover:bg-primary/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 shrink-0"
            disabled={loading}
            onClick={() => void handleAiOptimize()}
          >
            AI Optimize Workflow
          </Button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]"
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoomLevel((z) => clampZoom(Math.round((z + delta) * 10) / 10));
        }}
      >
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="absolute inset-0 flex flex-col items-center py-20 overflow-y-auto custom-scrollbar">
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center", width: "fit-content" }}
          >
            {loading ? (
              <div className="text-white/50 text-sm font-bold text-center mt-10">Loading workflow...</div>
            ) : nodes.length === 0 ? (
              <div className="text-white/50 text-sm font-bold text-center mt-10">
                Canvas is empty. Use Save to persist nodes/edges.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 pb-10">
                {nodes.map((n, idx) => {
                  const nodeType = String(n?.type ?? "");
                  const nodeLabel = String(n?.label ?? "Untitled");
                  const status = String(n?.status ?? "Wait");
                  const active = Boolean(n?.active ?? false);
                  const icon = iconForNodeType(nodeType);

                  const edge = edges[idx];
                  const connectorOrientation = String(edge?.orientation ?? "vertical");
                  const connectorStatus = String(edge?.status ?? "Active");

                  return (
                    <React.Fragment key={`${nodeType}-${idx}`}>
                      <Node type={nodeType} label={nodeLabel} icon={icon} active={active} status={status} />
                      {idx < nodes.length - 1 && <Connector orientation={connectorOrientation} status={connectorStatus} />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Execution Context */}
        <div
          ref={contextRef}
          className="absolute right-4 top-4 bottom-4 bg-black/30 border border-white/[0.06] rounded-2xl p-4 z-30 w-[320px] max-w-[calc(100%-1rem)] overflow-y-auto custom-scrollbar"
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3 italic">Execution Context</div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Rollout Name</span>
              <input
                value={deployRolloutName}
                onChange={(e) => setDeployRolloutName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-white/80 text-[12px] outline-none focus:border-primary"
                placeholder="api-gateway"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Namespace</span>
              <input
                value={deployNamespace}
                onChange={(e) => setDeployNamespace(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-white/80 text-[12px] outline-none focus:border-primary"
                placeholder="prod"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Strategy</span>
              <select
                value={deployStrategy}
                onChange={(e) => setDeployStrategy(e.target.value as any)}
                className="mt-1 w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-white/80 text-[12px] outline-none focus:border-primary"
              >
                <option value="canary">canary</option>
                <option value="rolling">rolling</option>
              </select>
            </label>
          </div>

          {deploymentId && (
            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold italic">Deployment</div>
              <div className="text-[12px] font-bold text-white/80 mt-1 break-all">{deploymentId}</div>
              <div className="text-[12px] font-bold text-white/80 mt-2">
                {deploymentStatus ? `Status: ${deploymentStatus}` : "Status: —"}
              </div>
              {deploymentMessage && (
                <div className="text-[11px] text-white/50 mt-2 leading-relaxed">
                  {deploymentMessage}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold italic">AI Insights</div>
            <div className="text-[11px] text-white/70 mt-2">
              Mode {aiMode.toUpperCase()} · Risk {riskLevel} · Max actions/hr {maxActionsPerHour}
            </div>
            <div className="text-[11px] text-white/50 mt-1">
              {lastSimulation || "Run simulation to view predicted latency/cost impact."}
            </div>
          </div>
        </div>

        {/* Toolbar - Floating */}
        <aside
          ref={paletteRef}
          className="absolute left-4 top-4 bottom-4 w-64 bg-[#141518]/85 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-4 shadow-2xl z-20 flex flex-col pointer-events-auto overflow-y-auto custom-scrollbar"
        >
           <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-6 italic border-b border-white/[0.05] pb-2">Node Palette</h3>
           <div className="space-y-3">
              <div className="group bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 hover:border-primary transition-all cursor-move shadow-sm hover:shadow-glow-primary/10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF]"><Zap className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                       <span className="text-[11px] font-bold text-white/90">Triggers</span>
                       <span className="text-[9px] text-white/30 uppercase font-black italic">Webhooks, Cron</span>
                    </div>
                 </div>
              </div>
              <div className="group bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 hover:border-primary transition-all cursor-move shadow-sm hover:shadow-glow-primary/10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><Brain className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                       <span className="text-[11px] font-bold text-white/90">AI Primitives</span>
                       <span className="text-[9px] text-white/30 uppercase font-black italic">LLM, Classification</span>
                    </div>
                 </div>
              </div>
              <div className="group bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 hover:border-primary transition-all cursor-move shadow-sm hover:shadow-glow-primary/10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Terminal className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                       <span className="text-[11px] font-bold text-white/90">Executors</span>
                       <span className="text-[9px] text-white/30 uppercase font-black italic">HTTP, SSH, SQL</span>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="pt-6 border-t border-white/[0.05] mt-4">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
                 <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-3 h-3 text-primary animate-spin-slow" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">DAG Optimization</span>
                 </div>
                 <p className="text-[10px] text-white/50 leading-relaxed font-bold italic">AI suggests compressing these 3 S3 nodes into a single worker group for 40ms lower latency.</p>
                 {optimizationNotes ? (
                   <p className="text-[10px] text-primary/80 leading-relaxed font-bold italic mt-2">{optimizationNotes}</p>
                 ) : null}
              </div>
           </div>
        </aside>

        {/* Floating Controls */}
        <div className="absolute right-8 bottom-8 flex gap-3">
           <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl bg-[#141518]/80 backdrop-blur-xl border border-white/[0.06] shadow-xl text-white/60 hover:text-white hover:border-white/20">
              <Move className="w-5 h-5" />
           </Button>
           <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl bg-[#141518]/80 backdrop-blur-xl border border-white/[0.06] shadow-xl text-white/60 hover:text-white hover:border-white/20">
              <Settings className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <div className="h-44 shrink-0 border-t border-white/[0.08] bg-[#0B1220] px-6 py-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 italic">Execution Logs + AI Decisions</div>
        <div className="h-[calc(100%-22px)] overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 space-y-1.5 text-[11px] font-mono custom-scrollbar">
          {executionEvents.length === 0 ? (
            <div className="text-white/35">No execution events yet. Run simulate or execute.</div>
          ) : (
            executionEvents.map((e, i) => (
              <div key={`${e.ts}-${i}`} className="grid grid-cols-[90px_130px_1fr] gap-2 text-white/75">
                <span className="text-white/35">{e.ts}</span>
                <span className="uppercase text-primary/80">{e.type}</span>
                <span className="truncate">{e.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isRevertOpen} onOpenChange={setIsRevertOpen}>
        <DialogContent className="bg-[#111827] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">Revert Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/60">Version Number</label>
            <input
              value={revertVersion}
              onChange={(e) => setRevertVersion(e.target.value)}
              className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-white/90 text-sm outline-none focus:border-primary"
              placeholder="e.g. 2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevertOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRevertConfirm} disabled={reverting}>
              {reverting ? "Reverting..." : "Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowBuilder;
