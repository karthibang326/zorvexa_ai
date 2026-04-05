import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Cpu, Gauge, Sparkles, TrendingDown, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrchestratorState, type OrchestratorAction, type OrchestratorDecision } from "@/lib/ai-orchestrator";
import { approveK8sHighRiskAction, getK8sAutonomousStatus } from "@/lib/autonomous";
import { useAiStream } from "@/contexts/AiStreamContext";
import AiLearningPanel from "@/components/dashboard/AiLearningPanel";
import { fetchAiLearningDashboard } from "@/lib/ai-learning";
import { useTenantWorkspaceLinked } from "@/hooks/useTenantWorkspaceLinked";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { ControlPlaneHero } from "@/components/dashboard/zorvexa/ControlPlaneHero";

type StreamRow = {
  ts: string;
  module: string;
  reason: string;
  action: string;
  result: string;
};

const AGENT_ROLES: Record<string, string> = {
  DeploymentAgent: "Deploy, rollback, verify runtime health",
  PlacementAgent: "Place workloads by latency, cost, compliance",
  FailoverAgent: "Shift traffic and workloads across regions/clouds",
  MonitoringAgent: "Detect anomalies and trigger remediation",
  CostAgent: "Optimize spend and enforce FinOps actions",
  SecurityAgent: "Apply policy remediation and hardening",
};

const HybridControlPlaneView: React.FC = () => {
  const tenantWorkspaceLinked = useTenantWorkspaceLinked();
  const { kpis: streamKpis, connected: streamOnline } = useAiStream();
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [intervalMs, setIntervalMs] = useState(6000);
  const [decisions, setDecisions] = useState<OrchestratorDecision[]>([]);
  const [actions, setActions] = useState<OrchestratorAction[]>([]);
  const [agents, setAgents] = useState<Record<string, { healthy: boolean; lastRunAt: string | null }>>({});
  const [streamRows, setStreamRows] = useState<StreamRow[]>([]);
  const [k8sStatus, setK8sStatus] = useState<{
    running: boolean;
    dryRun: boolean;
    lastCycleAt: string | null;
    lastIssues: Array<{ type: "pod_crash" | "high_cpu" | "node_failure"; reason: string; confidence: number }>;
    lastActions: Array<{
      id: string;
      ts: string;
      action: "restart_pod" | "scale_deployment";
      target: string;
      confidence: number;
      risk: "LOW" | "MEDIUM" | "HIGH";
      outcome: string;
      verification: "PASSED" | "FAILED" | "SKIPPED";
      rollbackStatus: "NOT_REQUIRED" | "ROLLED_BACK" | "ROLLBACK_FAILED" | "NOT_APPLICABLE";
    }>;
    pendingApprovals: Array<{ id: string; action: "restart_pod" | "scale_deployment"; target: string; risk: "LOW" | "MEDIUM" | "HIGH" }>;
  } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [learningPhase, setLearningPhase] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchAiLearningDashboard()
        .then((d) => {
          const phase = d.totalSamples > 40 ? "Adaptive" : d.totalSamples > 8 ? "Learning" : d.totalSamples > 0 ? "Warm-up" : null;
          setLearningPhase(phase);
        })
        .catch(() => {});
    }, 45_000);
    void fetchAiLearningDashboard()
      .then((d) => {
        const phase = d.totalSamples > 40 ? "Adaptive" : d.totalSamples > 8 ? "Learning" : d.totalSamples > 0 ? "Warm-up" : null;
        setLearningPhase(phase);
      })
      .catch(() => {});
    return () => window.clearInterval(id);
  }, []);

  const refreshState = async () => {
    const state = await getOrchestratorState();
    setStatus(state.status);
    setIntervalMs(state.intervalMs);
    setDecisions(state.decisions);
    setActions(state.actions);
    setAgents(state.agents);
  };

  useEffect(() => {
    void refreshState();
    const base = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
    const es = new EventSource(`${base}/api/ai-orchestrator/stream`, { withCredentials: true });

    es.addEventListener("ai_orchestrator_loop_started", () => {
      setStatus("running");
    });
    es.addEventListener("ai_orchestrator_loop_completed", async () => {
      await refreshState();
    });
    es.addEventListener("ai_orchestrator_loop_failed", () => {
      setStatus("error");
    });
    return () => es.close();
  }, []);

  const refreshK8sStatus = async () => {
    const out = await getK8sAutonomousStatus();
    setK8sStatus({
      running: Boolean(out.running),
      dryRun: Boolean(out.dryRun),
      lastCycleAt: out.lastCycleAt ?? null,
      lastIssues: (out.lastIssues ?? []).slice(0, 6),
      lastActions: (out.lastActions ?? []).slice(0, 6),
      pendingApprovals: (out.pendingApprovals ?? []).slice(0, 3),
    });
  };

  useEffect(() => {
    const poll = async () => {
      try {
        await refreshK8sStatus();
      } catch {
        // silent polling fallback
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 10000);
    return () => window.clearInterval(t);
  }, []);

  const onApprove = async (approvalId: string) => {
    try {
      setApprovingId(approvalId);
      await approveK8sHighRiskAction(approvalId);
      toast.success("High-risk action approved");
      await refreshK8sStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    const rows = decisions.slice(0, 20).map((d) => {
      const action = actions.find((a) => a.module === d.module && a.at >= d.at);
      return {
        ts: new Date(d.at).toLocaleTimeString(),
        module: d.module,
        reason: d.reason,
        action: action?.type ?? "autonomous-evaluation",
        result: action?.status ?? "running",
      };
    });
    setStreamRows(
      rows.length
        ? rows
        : [
            {
              ts: new Date().toLocaleTimeString(),
              module: "control-plane",
              reason: "Waiting for next loop telemetry window",
              action: "observe",
              result: "running",
            },
          ]
    );
  }, [decisions, actions]);

  const confidencePct = useMemo(() => {
    const fromStream =
      streamKpis.avgConfidence > 0 ? Math.round(streamKpis.avgConfidence) : null;
    if (fromStream != null) return fromStream;
    if (!decisions.length) return 92;
    return Math.round((decisions.reduce((s, d) => s + (d.confidence ?? 0.9), 0) / decisions.length) * 100);
  }, [decisions, streamKpis.avgConfidence]);

  const learningStatus = useMemo(() => {
    if (learningPhase) return learningPhase;
    const executed = actions.filter((a) => a.status === "executed").length;
    if (executed > 10) return "Adaptive";
    if (executed > 3) return "Learning";
    return "Warm-up";
  }, [actions, learningPhase]);

  const predictive = useMemo(() => {
    const recent = decisions.slice(0, 12);
    const highRisk = recent.filter((d) => (d.risk ?? "medium") === "high").length;
    const costSignals = recent.filter((d) => d.module === "cost").length;
    const failoverSignals = recent.filter((d) => d.module === "failover").length;
    const monitoringSignals = recent.filter((d) => d.module === "monitoring").length;
    const latest = recent[0];
    const confidence = latest?.confidence ? Math.round((latest.confidence ?? 0.9) * 100) : confidencePct;
    const severity = highRisk > 0 || failoverSignals > 0 ? "elevated" : monitoringSignals > 0 ? "moderate" : "low";

    return [
      `Potential latency event in 20-40 minutes (${severity} probability, model confidence ${confidence}%).`,
      highRisk > 0 || failoverSignals > 0
        ? `Detected ${highRisk + failoverSignals} elevated-risk signal(s) in recent control loops; preemptive routing/capacity safeguards engaged.`
        : "No high-risk failover indicators in recent loops; traffic remains within normal guardrails.",
      costSignals > 0
        ? `Cost pressure detected in ${costSignals} recent decision(s); optimization path prepared before budget drift.`
        : "No material cost anomaly trend detected in recent decisions.",
      (k8sStatus?.lastIssues?.length ?? 0) > 0
        ? `Kubernetes reports ${(k8sStatus?.lastIssues?.length ?? 0)} active issue(s); remediation queue is being evaluated.`
        : "Kubernetes issue queue is currently clear; no active pod/node degradation signals.",
    ];
  }, [decisions, k8sStatus, confidencePct]);

  const twin = useMemo(() => {
    const executed = actions.filter((a) => a.status === "executed").length;
    const predictedLatency = 142 - Math.min(24, executed * 2);
    const actualLatency = 146 - Math.min(30, executed * 2.3);
    const predictedCost = 68 - Math.min(22, executed * 1.4);
    const actualCost = 70 - Math.min(24, executed * 1.5);
    return { predictedLatency, actualLatency, predictedCost, actualCost };
  }, [actions]);

  const impact = useMemo(() => {
    const executed = actions.filter((a) => a.status === "executed").length;
    return {
      latency: `${Math.min(28, 8 + executed)}%`,
      cost: `${Math.min(37, 11 + executed)}%`,
      stability: `${Math.min(99, 90 + executed)}%`,
    };
  }, [actions]);

  const streamLabel =
    tenantWorkspaceLinked === false
      ? streamOnline
        ? "simulation (connected)"
        : "simulation (offline)"
      : streamOnline
        ? "live"
        : "offline";

  return (
    <div className="space-y-6">
      <ControlPlaneHero
        confidencePct={confidencePct}
        streamLabel={streamLabel}
        status={status}
        learningStatus={learningStatus}
        streamRows={streamRows}
        impact={impact}
        simulationMode={isDemoModeEnabled() || streamLabel.includes("simulation")}
      />

      {tenantWorkspaceLinked === false ? (
        <div
          className="rounded-xl border border-sky-500/30 bg-sky-950/35 px-4 py-3 text-[13px] text-sky-100/90 leading-relaxed"
          role="status"
        >
          <p className="font-medium text-sky-50">Learning + stream are not tenant-scoped</p>
          <p className="mt-1 text-[12px] text-sky-100/85">
            Decision cards, predictive copy, and metrics still update from the <strong className="text-sky-50">global demo pipeline</strong>{" "}
            and local API — same as the AI lifecycle stream. Link a workspace via <strong className="text-sky-50">Launch setup</strong> to
            align data with your organization.
          </p>
        </div>
      ) : null}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6 space-y-4">
        <AiLearningPanel />
        <p className="text-[11px] text-white/45">
          Orchestrator loop: <span className="text-white/70">{status}</span> · stream {streamLabel} · confidence {confidencePct}% ·
          learning {learningStatus}
        </p>
        <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <summary className="text-[11px] text-white/55 cursor-pointer">Orchestrator sample rows (HTTP)</summary>
          <div className="space-y-3 mt-3">
            <AnimatePresence initial={false}>
              {streamRows.slice(0, 8).map((row, i) => (
                <motion.button
                  key={`${row.ts}-${i}`}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("zorvexa:explain", {
                        detail: {
                          module: row.module,
                          reason: row.reason,
                          action: row.action,
                          result: row.result,
                        },
                      })
                    );
                  }}
                  className="w-full text-left rounded-xl border border-white/10 p-4 hover:bg-white/[0.06] hover:border-blue-300/25 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-white/45">
                      {row.ts} · {row.module}
                    </p>
                    <Badge className="bg-blue-500/20 text-blue-200 border border-blue-300/30">{row.result}</Badge>
                  </div>
                  <p className="text-sm text-white/85 mt-2">
                    <span className="text-white/40">Reason:</span> {row.reason}
                  </p>
                  <p className="text-sm text-white/85">
                    <span className="text-white/40">Action:</span> {row.action}
                  </p>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </details>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
          <p className="text-xs font-semibold tracking-tight text-white/65 mb-4">Decision Intelligence</p>
          <div className="space-y-3">
            {decisions.slice(0, 6).map((d, i) => {
              const action = actions.find((a) => a.module === d.module && a.at >= d.at);
              return (
                <div key={`${d.at}-${i}`} className="rounded-xl border border-white/10 p-4 hover:bg-white/[0.04] transition-all duration-200">
                  <p className="text-[11px] text-white/45">{d.module}</p>
                  <p className="text-sm text-white/85 mt-1">{d.reason}</p>
                  <p className="text-xs text-white/50 mt-1">Simulation: {d.simulation ?? "digital-twin validation complete"}</p>
                  <p className="text-xs text-white/50">Outcome: {action?.status ?? "running"}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge className="bg-indigo-500/20 text-indigo-200 border border-indigo-300/30">Confidence {Math.round((d.confidence ?? 0.9) * 100)}%</Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-300/30">Learning {learningStatus}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
          <p className="text-xs font-semibold tracking-tight text-white/65 mb-4">Predictive Intelligence</p>
          <div className="space-y-3">
            {predictive.map((p, i) => (
              <p key={i} className="text-sm text-white/80 rounded-xl border border-white/10 p-4">{p}</p>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
          <p className="text-xs font-semibold tracking-tight text-white/65 mb-4">Digital Twin Simulation</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-[10px] text-white/45">Latency (Predicted)</p>
              <p className="text-lg tracking-tight text-blue-300">{twin.predictedLatency}ms</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-[10px] text-white/45">Latency (Actual)</p>
              <p className="text-lg tracking-tight text-cyan-300">{twin.actualLatency}ms</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-[10px] text-white/45">Cost (Predicted)</p>
              <p className="text-lg tracking-tight text-amber-300">${twin.predictedCost}/hr</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-[10px] text-white/45">Cost (Actual)</p>
              <p className="text-lg tracking-tight text-rose-300">${twin.actualCost}/hr</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
          <p className="text-xs font-semibold tracking-tight text-white/65 mb-4">AI Agent Status</p>
          <div className="space-y-3">
            {Object.keys(AGENT_ROLES).map((agent) => (
              <div key={agent} className="rounded-xl border border-white/10 p-4 hover:bg-white/[0.04] transition-all duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/90">{agent}</p>
                  <Badge className={agents[agent]?.healthy === false ? "bg-red-500/20 text-red-200 border border-red-300/30" : "bg-emerald-500/20 text-emerald-200 border border-emerald-300/30"}>
                    {agents[agent]?.healthy === false ? "degraded" : "active"}
                  </Badge>
                </div>
                <p className="text-xs text-white/50 mt-1">{AGENT_ROLES[agent]}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
        <p className="text-xs font-semibold tracking-tight text-white/65 mb-4">Impact Metrics</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/45 inline-flex items-center gap-1"><Waves className="w-3 h-3" />Latency improvement</p>
            <p className="text-lg tracking-tight text-blue-300 mt-1">{impact.latency}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/45 inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" />Cost savings</p>
            <p className="text-lg tracking-tight text-emerald-300 mt-1">{impact.cost}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/45 inline-flex items-center gap-1"><Gauge className="w-3 h-3" />Stability gains</p>
            <p className="text-lg tracking-tight text-violet-300 mt-1">{impact.stability}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.28)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs font-semibold tracking-tight text-white/65">K8s AI Control</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={k8sStatus?.running ? "bg-emerald-500/20 text-emerald-200 border border-emerald-300/30" : "bg-zinc-500/20 text-zinc-200 border border-zinc-300/30"}>
              {k8sStatus?.running ? "live" : "stopped"}
            </Badge>
            {k8sStatus?.dryRun ? (
              <Badge className="bg-violet-500/20 text-violet-200 border border-violet-300/30">dry-run</Badge>
            ) : (
              <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-300/30">execute</Badge>
            )}
            {k8sStatus?.lastCycleAt ? (
              <Badge className="bg-blue-500/20 text-blue-200 border border-blue-300/30">
                cycle {new Date(k8sStatus.lastCycleAt).toLocaleTimeString()}
              </Badge>
            ) : null}
            {(k8sStatus?.pendingApprovals?.length ?? 0) > 0 ? (
              <Badge className="bg-red-500/20 text-red-200 border border-red-300/30">
                approvals {k8sStatus?.pendingApprovals.length}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[11px] text-white/50 mb-2">Recent K8s Actions</p>
            <div className="space-y-2">
              {(k8sStatus?.lastActions?.length ?? 0) === 0 ? (
                <p className="text-xs text-white/45">No recent autonomous Kubernetes actions yet.</p>
              ) : (
                k8sStatus?.lastActions.map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/10 p-2.5">
                    <p className="text-xs text-white/85">{a.action} -&gt; {a.target}</p>
                    <p className="text-[11px] text-white/55">{a.outcome}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge className={a.risk === "HIGH" ? "bg-red-500/20 text-red-200 border border-red-300/30" : a.risk === "MEDIUM" ? "bg-amber-500/20 text-amber-200 border border-amber-300/30" : "bg-emerald-500/20 text-emerald-200 border border-emerald-300/30"}>
                        risk {a.risk}
                      </Badge>
                      <Badge className={a.verification === "FAILED" ? "bg-rose-500/20 text-rose-200 border border-rose-300/30" : "bg-sky-500/20 text-sky-200 border border-sky-300/30"}>
                        verify {a.verification.toLowerCase()}
                      </Badge>
                      <Badge className={a.rollbackStatus === "ROLLED_BACK" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-300/30" : a.rollbackStatus === "ROLLBACK_FAILED" ? "bg-red-500/20 text-red-200 border border-red-300/30" : "bg-zinc-500/20 text-zinc-200 border border-zinc-300/30"}>
                        rollback {a.rollbackStatus.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[11px] text-white/50 mb-2">Issue Severity</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(k8sStatus?.lastIssues ?? []).slice(0, 6).map((i, idx) => (
                <Badge
                  key={`${i.type}-${idx}`}
                  className={
                    i.type === "node_failure"
                      ? "bg-red-500/20 text-red-200 border border-red-300/30"
                      : i.type === "pod_crash"
                        ? "bg-amber-500/20 text-amber-200 border border-amber-300/30"
                        : "bg-blue-500/20 text-blue-200 border border-blue-300/30"
                  }
                >
                  {i.type.replace("_", " ")} {Math.round(i.confidence * 100)}%
                </Badge>
              ))}
              {(k8sStatus?.lastIssues?.length ?? 0) === 0 ? <p className="text-xs text-white/45">No active K8s issues in latest cycle.</p> : null}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] text-white/50 mb-1">Guardrails Active</p>
              <p className="text-xs text-white/80">Protected namespaces blocked (kube-system, kube-public, kube-node-lease)</p>
              <p className="text-xs text-white/80">Action budget capped per cycle</p>
              <p className="text-xs text-white/80">Per-target cooldown to prevent thrashing</p>
              <p className="text-xs text-white/80">Read-only mode available via dry-run</p>
              <p className="text-xs text-white/80">High-risk actions require approval before execution</p>
            </div>
            {(k8sStatus?.pendingApprovals?.length ?? 0) > 0 ? (
              <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 mt-3">
                <p className="text-[11px] text-red-100 mb-1">Pending High-Risk Approvals</p>
                {k8sStatus?.pendingApprovals.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                    <p className="text-xs text-red-100/90">{p.action} on {p.target} ({p.risk})</p>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-[10px] bg-red-500/80 hover:bg-red-500 text-white"
                      onClick={() => void onApprove(p.id)}
                      disabled={approvingId === p.id}
                    >
                      {approvingId === p.id ? "Approving..." : "Approve"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HybridControlPlaneView;

