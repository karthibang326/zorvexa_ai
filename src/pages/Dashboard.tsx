import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
const OverviewView = lazy(() => import("@/components/dashboard/OverviewView"));
const AIWorkspaceView = lazy(() => import("@/components/dashboard/AIWorkspaceView"));
const AIControlCenterView = lazy(() => import("@/components/dashboard/ai-control-center/AIControlCenterView"));
const MonitoringView = lazy(() => import("@/components/dashboard/MonitoringView"));
const InfrastructureView = lazy(() => import("@/components/dashboard/InfrastructureView"));
const DeploymentsView = lazy(() => import("@/components/dashboard/DeploymentsView"));
const SecurityView = lazy(() => import("@/components/dashboard/SecurityView"));
const CostIntelligenceView = lazy(() => import("@/components/dashboard/CostIntelligenceView"));
const WorkflowsView = lazy(() => import("@/components/dashboard/WorkflowsView"));
const AuditLogsView = lazy(() => import("@/components/dashboard/AuditLogsView"));
const PerformanceView = lazy(() => import("@/components/dashboard/PerformanceView"));
const IncidentsView = lazy(() => import("@/components/dashboard/IncidentsView"));
const ChaosView = lazy(() => import("@/components/dashboard/ChaosView"));
const CommandPalette = lazy(() => import("@/components/dashboard/CommandPalette"));
const EmbeddedAIChat = lazy(() => import("@/components/dashboard/EmbeddedAIChat"));
const SettingsView = lazy(() => import("@/components/dashboard/SettingsView"));
const IntegrationsView = lazy(() => import("@/components/dashboard/IntegrationsView"));
const OrganizationView = lazy(() => import("@/components/dashboard/OrganizationView"));
const HybridControlPlaneView = lazy(() => import("@/components/dashboard/HybridControlPlaneView"));
const TenantConsoleView = lazy(() => import("@/components/dashboard/TenantConsoleView"));
const AiLearningDashboardView = lazy(() => import("@/components/dashboard/AiLearningDashboardView"));
const WorkloadLocationView = lazy(() => import("@/components/dashboard/WorkloadLocationView"));
const GovernanceView = lazy(() => import("@/components/dashboard/GovernanceView"));
const AISimulationView = lazy(() => import("@/components/dashboard/AISimulationView"));
const AstraOpsPipelineView = lazy(() => import("@/components/dashboard/AstraOpsPipelineView"));
const BillingDashboard = lazy(() => import("@/pages/billing/BillingDashboard").then(module => ({ default: module.BillingDashboard })));
import { SimulationPreviewProvider } from "@/contexts/SimulationPreviewContext";
import { AiStreamProvider } from "@/contexts/AiStreamContext";
import { useRun } from "@/hooks/useRun";
import { useOrchestrationStore } from "@/store/orchestration";
import { useWorkflow } from "@/hooks/useWorkflow";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo } from "@/lib/ai-ceo";
import { useContextStore } from "@/store/context";
import { deleteOrganization, getContextOptions, postSwitchContext } from "@/lib/context";
import { ApiClientError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StandardPageShell from "@/components/dashboard/layout/StandardPageShell";
import AIDecisionPanel from "@/components/dashboard/layout/AIDecisionPanel";
import { AutonomousControlPlaneChrome, useNextEvalSeconds } from "@/components/dashboard/autonomous/AutonomousControlPlaneChrome";
import { CurrentAIDecisionCard } from "@/components/dashboard/autonomous/CurrentAIDecisionCard";
import { LifecycleActivityStream } from "@/components/dashboard/autonomous/LifecycleActivityStream";
import { getTabStandardMeta } from "@/components/dashboard/layout/tabStandards";
import AIExplainabilityPanel from "@/components/dashboard/AIExplainabilityPanel";
import { isDemoModeEnabled, setDemoModeEnabled } from "@/lib/demo-mode";
import type { MetricsState } from "@/lib/ai-ops-learning";
import { getOpsAutonomousLoopStatus, getOpsMemory, postOpsAutonomousRun } from "@/lib/ai-ops-learning";
import { approveK8sHighRiskAction, getK8sAutonomousStatus } from "@/lib/autonomous";
import {
  deriveImpactPercentFromObserved,
  formatLoopIssue,
  resolveAIDecisionPanelModel,
  riskLevelWithContext,
} from "@/lib/ai-dashboard-status";
import type { AutonomyMode } from "@/lib/launch";

interface DashboardProps {
  initialTab?: string;
}

function readAutonomyModeFromStorage(): AutonomyMode {
  try {
    const raw = localStorage.getItem("astraops_ai_control");
    if (raw) {
      const j = JSON.parse(raw) as { autonomyMode?: AutonomyMode };
      if (j.autonomyMode) return j.autonomyMode;
    }
  } catch {
    /* ignore */
  }
  return "assisted";
}

const CONTROL_PLANE_TABS: Array<{ id: string; label: string }> = [
  { id: "tenant-console", label: "Tenant" },
  { id: "hybrid-control", label: "AI Control Plane" },
  { id: "ai-learning", label: "Learning" },
  { id: "astra-ops-pipeline", label: "Autonomous Loop" },
  { id: "ai-simulation", label: "Simulation" },
  { id: "workload-location", label: "Workloads" },
  { id: "incidents", label: "Incidents" },
  { id: "optimization", label: "Optimization" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "governance", label: "Governance" },
];

/**
 * Show AI Explainability (decision trace · signals · policy) only on operational / AI-acting surfaces.
 * Omit on admin, onboarding, chat, learning, and org-directory style tabs (progressive disclosure).
 */
const TAB_IDS_WITH_EXPLAINABILITY = new Set<string>([
  "hybrid-control",
  "astra-ops-pipeline",
  "ai-simulation",
  "workload-location",
  "incidents",
  "optimization",
  "cost",
  "infrastructure",
  "governance",
  "monitoring",
  "performance",
  "chaos",
  "deployments",
  "workflows",
  "runs",
  "templates",
  "security",
  "audit",
]);

const Dashboard: React.FC<DashboardProps> = ({ initialTab = "overview" }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState<string | null>(null);
  const [copilotNonce, setCopilotNonce] = useState(0);
  const [aiCeoEnabled, setAiCeoEnabled] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [workflowCreateNonce, setWorkflowCreateNonce] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [aiActivationBanner, setAiActivationBanner] = useState(false);
  const [runningTickNow, setRunningTickNow] = useState(false);
  /** Dev-only: /health is proxied by Vite to the Fastify backend (port 5002). */
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [loopStatus, setLoopStatus] = useState<{
    running: boolean;
    lastRunAt?: string | null;
    action?: string;
    confidence?: number;
    execStatus?: string;
    successRatePct?: number | null;
    issue?: string;
    resource?: string;
    reason?: string;
    loopFailures?: number;
    lastLoopError?: string | null;
    correlationId?: string;
    metricsSource?: "live" | "synthetic";
    executionProfile?: {
      cloudLiveExecution: boolean;
      k8sDryRun: boolean;
      simulationMode: boolean;
      opsMetricsUrlConfigured: boolean;
    };
  } | null>(null);
  const [explainTrace, setExplainTrace] = useState<{
    findings?: string[];
    observedState?: MetricsState;
    alternatives?: Array<{ option: string; rejectedBecause: string }>;
    learningInsight?: string;
    memoryCount?: number;
    avgReward?: number;
    successRatePct?: number;
    correlationId?: string;
    metricsSource?: "live" | "synthetic";
    reasoning?: string;
  } | null>(null);
  const [k8sStatus, setK8sStatus] = useState<{
    running: boolean;
    dryRun: boolean;
    lastCycleAt: string | null;
    lastIssues: Array<{ type: string; reason: string; confidence: number; namespace?: string; pod?: string; node?: string }>;
    lastActions: Array<{
      id?: string;
      ts?: string;
      action: string;
      target: string;
      outcome: string;
      confidence: number;
      risk?: "LOW" | "MEDIUM" | "HIGH";
    }>;
    pendingApprovals: Array<{ id: string; risk?: "LOW" | "MEDIUM" | "HIGH" }>;
  } | null>(null);
  const { orgId, projectId, envId, setContext } = useContextStore();
  const [contextOptions, setContextOptions] = useState<Awaited<ReturnType<typeof getContextOptions>>["organizations"]>([]);
  /** False when /api/context/options returned no orgs — AI stream is still global/simulation, not tenant-scoped. */
  const [workspaceLinked, setWorkspaceLinked] = useState<boolean | null>(null);

  const activeWorkflowId = useOrchestrationStore((s) => s.activeWorkflowId);
  const activeRun = useOrchestrationStore((s) => s.activeRun);
  const triggerLoading = useOrchestrationStore((s) => s.loading.trigger);
  const { trigger, openRun } = useRun();
  const { createDefaultWorkflow } = useWorkflow();

  const contentFallback = (
    <div className="h-full w-full rounded-2xl border border-white/10 bg-[#0B1220] animate-pulse" />
  );

  const aiDecision = useMemo(
    () => resolveAIDecisionPanelModel(loopStatus, k8sStatus),
    [loopStatus, k8sStatus]
  );

  const nextEvalSeconds = useNextEvalSeconds(loopStatus?.lastRunAt ?? undefined);
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(readAutonomyModeFromStorage);
  const [approvingDecision, setApprovingDecision] = useState(false);

  useEffect(() => {
    const h = () => setAutonomyMode(readAutonomyModeFromStorage());
    window.addEventListener("zorvexa:autonomy-mode", h as EventListener);
    return () => window.removeEventListener("zorvexa:autonomy-mode", h as EventListener);
  }, []);

  const decisionRisk = useMemo((): "LOW" | "MED" | "HIGH" => {
    const p = k8sStatus?.pendingApprovals?.[0];
    if (p?.risk === "HIGH") return "HIGH";
    if ((k8sStatus?.lastIssues?.length ?? 0) > 1) return "HIGH";
    if ((k8sStatus?.lastIssues?.length ?? 0) > 0) return "MED";
    return "LOW";
  }, [k8sStatus]);

  const decisionImpactPct = useMemo(
    () => deriveImpactPercentFromObserved(explainTrace?.observedState),
    [explainTrace?.observedState]
  );

  const bottomLogsPanel = useMemo(() => {
    const lines: string[] = [];
    if (loopStatus?.lastRunAt) {
      lines.push(
        `${new Date(loopStatus.lastRunAt).toLocaleTimeString()} · loop.status · ${
          loopStatus.running ? "running" : "idle"
        }`
      );
    }
    if (loopStatus?.issue) {
      lines.push(`${new Date().toLocaleTimeString()} · detect.findings · ${loopStatus.issue}`);
    }
    if (loopStatus?.action) {
      lines.push(
        `${new Date().toLocaleTimeString()} · decision.action · ${loopStatus.action}${
          loopStatus.resource ? ` (${loopStatus.resource})` : ""
        }`
      );
    }
    if (loopStatus?.execStatus) {
      lines.push(`${new Date().toLocaleTimeString()} · execution.result · ${loopStatus.execStatus}`);
    }
    if (k8sStatus?.lastActions?.length) {
      k8sStatus.lastActions.slice(0, 4).forEach((a) => {
        lines.push(
          `${new Date().toLocaleTimeString()} · k8s.${a.action} · ${a.target} · ${a.outcome}`
        );
      });
    }
    if (k8sStatus?.lastIssues?.length) {
      k8sStatus.lastIssues.slice(0, 3).forEach((i) => {
        lines.push(
          `${new Date().toLocaleTimeString()} · k8s.signal · ${i.type} · ${i.reason}`
        );
      });
    }

    return (
      <div className="space-y-2">
        <p className="text-sm text-white/65">Streamed logs, run traces, and decision records.</p>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
          {lines.length ? (
            <pre className="text-[11px] leading-relaxed text-white/75 whitespace-pre-wrap">
              {lines.join("\n")}
            </pre>
          ) : (
            <p className="text-[11px] text-white/45">No logs yet — run one AI loop tick to populate details.</p>
          )}
        </div>
      </div>
    );
  }, [loopStatus, k8sStatus]);

  const refreshK8sSnapshot = async () => {
    try {
      const out = await getK8sAutonomousStatus();
      setK8sStatus({
        running: Boolean(out.running),
        dryRun: Boolean(out.dryRun),
        lastCycleAt: out.lastCycleAt ?? null,
        lastIssues: (out.lastIssues ?? []).slice(0, 3),
        lastActions: (out.lastActions ?? []).slice(0, 4).map((a) => ({
          id: a.id,
          ts: a.ts,
          action: a.action,
          target: a.target,
          outcome: a.outcome,
          confidence: a.confidence,
          risk: a.risk,
        })),
        pendingApprovals: (out.pendingApprovals ?? []).slice(0, 4).map((p) => ({ id: p.id, risk: p.risk })),
      });
    } catch {
      // ignore transient k8s status polling errors
    }
  };

  const refreshOpsInsights = async () => {
    try {
      const [out, mem] = await Promise.all([getOpsAutonomousLoopStatus(), getOpsMemory(40)]);
      const fromLoop = out.lastSummary?.memoryStats?.successRate;
      const fromMem = mem.stats?.successRate;
      const successRatePct =
        typeof fromMem === "number"
          ? fromMem
          : typeof fromLoop === "number"
            ? fromLoop
            : null;
      const issue = formatLoopIssue(out.lastSummary?.findings, out.lastSummary?.decision?.reason);
      setLoopStatus({
        running: Boolean(out.running),
        lastRunAt: out.lastRunAt ?? null,
        action: out.lastSummary?.decision?.action,
        confidence: out.lastSummary?.decision?.confidence,
        execStatus: out.lastSummary?.execution?.status,
        successRatePct,
        issue: issue || undefined,
        resource: out.lastSummary?.decision?.resource,
        reason: out.lastSummary?.decision?.reason,
        loopFailures: typeof out.failures === "number" ? out.failures : undefined,
        lastLoopError: out.lastError ?? undefined,
        correlationId: out.lastSummary?.correlationId,
        metricsSource: out.metricsSource ?? out.lastSummary?.metricsSource,
        executionProfile: out.executionProfile,
      });
      setExplainTrace({
        findings: out.lastSummary?.findings ?? [],
        observedState: out.lastSummary?.observedState,
        alternatives: out.lastSummary?.alternatives ?? [],
        learningInsight: out.lastSummary?.learningInsight,
        memoryCount: mem.stats?.count ?? 0,
        avgReward: mem.stats?.avgReward,
        successRatePct: successRatePct ?? undefined,
        correlationId: out.lastSummary?.correlationId,
        metricsSource: out.metricsSource ?? out.lastSummary?.metricsSource,
        reasoning: (out.lastSummary as { reasoning?: string })?.reasoning,
      });
    } catch {
      // ignore transient status polling errors
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const handleSearchSubmit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setCopilotQuery(q);
    setCopilotNonce((n) => n + 1);
    setActiveTab("chat");
    toast.success(`Search queued for Copilot: “${q}”`);
  };

  const handleRunWorkflow = async ({
    environment,
    region,
  }: {
    environment: "Production" | "Staging";
    region: "US-East-1" | "EU-West-1";
  }) => {
    if (!activeWorkflowId) {
      toast.error("Select a workflow first (open Workflows).");
      return;
    }
    try {
      const run = await trigger({ workflowId: activeWorkflowId });
      setActiveTab("runs");
      // Stream run details immediately for a “click-to-execute” feel.
      await openRun(run.id);
    } catch (e) {
      // `useRun` already toasts; keep fallback error here.
      toast.error(e instanceof Error ? e.message : "Failed to trigger run");
    }
  };

  useEffect(() => {
    void getAICeoStatus()
      .then((s) => setAiCeoEnabled(Boolean(s.enabled)))
      .catch(() => {
        // ignore status prefetch failures
      });
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    const ping = async () => {
      try {
        const r = await fetch("/health", { method: "GET", cache: "no-store" });
        if (!cancelled) setApiReachable(r.ok);
      } catch {
        if (!cancelled) setApiReachable(false);
      }
    };
    void ping();
    const id = window.setInterval(() => void ping(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    void refreshK8sSnapshot();
    const t = window.setInterval(() => void refreshK8sSnapshot(), 10000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get("demo") === "1";
    if (fromQuery) setDemoModeEnabled(true);
    setDemoMode(isDemoModeEnabled() || fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
    if (searchParams.get("aiActive") === "1") {
      setAiActivationBanner(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("aiActive");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  /** Deep-link from Launch Mode: sync org/project/env into persisted context, then drop query params. */
  useEffect(() => {
    const launchOrg = searchParams.get("launchOrg");
    const launchProject = searchParams.get("launchProject");
    const launchEnv = searchParams.get("launchEnv");
    if (launchOrg && launchProject && launchEnv) {
      setContext({ orgId: launchOrg, projectId: launchProject, envId: launchEnv });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("launchOrg");
          next.delete("launchProject");
          next.delete("launchEnv");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, setContext]);

  useEffect(() => {
    const isManualAction = (label: string) => {
      const normalized = label.trim().toLowerCase();
      if (!normalized) return false;
      return [
        "stabilize security",
        "optimize system",
        "optimize cost",
        "apply all recommendations",
        "run with ai",
        "run multi-agent rca",
        "execute fix",
        "apply fix",
        "simulate fix",
        "fix now",
      ].some((token) => normalized.includes(token));
    };

    const hideManualButtons = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const button of buttons) {
        const text = button.textContent ?? "";
        if (isManualAction(text)) {
          (button as HTMLButtonElement).style.display = "none";
          button.setAttribute("data-ai-hidden-manual-action", "true");
        }
      }
    };

    hideManualButtons();
    const observer = new MutationObserver(() => hideManualButtons());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    void getContextOptions()
      .then((data) => {
        setContextOptions(data.organizations);
        setWorkspaceLinked(data.organizations.length > 0);
      })
      .catch(() => {
        setWorkspaceLinked(null);
      });
  }, []);

  useEffect(() => {
    void refreshOpsInsights();
    const t = window.setInterval(() => void refreshOpsInsights(), 10000);
    return () => window.clearInterval(t);
  }, []);

  const handleRunTickNow = async () => {
    if (runningTickNow) return;
    setRunningTickNow(true);
    try {
      const fallbackMetrics: MetricsState = {
        cpu: 74,
        memory: 67,
        latency: 172,
        traffic: 120,
        errorRate: 1.6,
        cost: 63,
      };
      await postOpsAutonomousRun({
        signal: {
          metrics: explainTrace?.observedState ?? fallbackMetrics,
        },
      });
      await Promise.all([refreshOpsInsights(), refreshK8sSnapshot()]);
      toast.success("AI loop tick executed and insights refreshed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run AI tick.");
    } finally {
      setRunningTickNow(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      // AI Control
      case "overview":
        return <OverviewView />;
      case "chat":
        return (
          <AIWorkspaceView
            activePanel={activeTab}
            prefillQuery={activeTab === "chat" ? copilotQuery : null}
            prefillNonce={copilotNonce}
          />
        );
      case "ai-control":
        return <AIControlCenterView />;
      // Observe
      case "monitoring": return <MonitoringView />;
      case "performance": return <PerformanceView />;
      case "incidents": return <IncidentsView />;
      case "chaos": return <ChaosView />;
      // Optimize
      case "cost": return <CostIntelligenceView />;
      case "optimization": return <CostIntelligenceView />;
      case "organization": return <OrganizationView />;
      // Operate
      case "deployments": return <DeploymentsView />;
      case "workflows":
      case "runs":
      case "templates":
        return <WorkflowsView activeView={activeTab} createTrigger={workflowCreateNonce} />;
      // Platform
      case "infrastructure": return <InfrastructureView />;
      case "tenant-console": return <TenantConsoleView />;
      case "hybrid-control":    return <HybridControlPlaneView />;
      case "ai-learning":       return <AiLearningDashboardView />;
      case "astra-ops-pipeline": return <AstraOpsPipelineView />;
      case "ai-simulation":     return <AISimulationView />;
      case "workload-location": return <WorkloadLocationView />;
      case "governance":        return <GovernanceView />;
      case "integrations": return <IntegrationsView />;
      case "billing": return <BillingDashboard />;
      case "settings": return <SettingsView />;
      // Security
      case "security": return <SecurityView />;
      case "audit": return <AuditLogsView />;
      default: return <AIWorkspaceView activePanel={activeTab} />;
    }
  };

  const tabMeta = getTabStandardMeta(activeTab);

  return (
    <SimulationPreviewProvider>
    <AiStreamProvider>
    <div className="flex h-screen w-screen bg-[#0d1018] overflow-hidden selection:bg-primary/20">
      <AppSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={user}
        signOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <div className="sticky top-0 z-40">
          <AppHeader
            user={user}
            onSearchSubmit={handleSearchSubmit}
            onRunWorkflow={handleRunWorkflow}
            onOpenDeployModal={() => {}}
            runLoading={triggerLoading}
            aiCeoEnabled={aiCeoEnabled}
            onToggleAICeoMode={async (enabled) => {
              if (enabled) {
                await postEnableAICeo();
                setAiCeoEnabled(true);
                toast.success("AI CEO Mode enabled");
              } else {
                await postDisableAICeo();
                setAiCeoEnabled(false);
                toast.info("AI CEO Mode disabled");
              }
            }}
            onOpenSettings={() => {
              setActiveTab("settings");
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("zorvexa:open-settings"));
              }, 80);
              toast.info("AI Governance opened");
            }}
            onLogout={handleSignOut}
            activeTab={activeTab}
            tenantWorkspaceLinked={workspaceLinked}
            context={{
              orgId,
              projectId,
              envId,
              organizations: contextOptions,
            }}
            onSwitchContext={async (next) => {
              try {
                const out = await postSwitchContext(next);
                setContext({
                  orgId: out.context.orgId,
                  projectId: out.context.projectId,
                  envId: out.context.envId,
                  role: out.context.role,
                });
                setContextVersion((v) => v + 1);
                void getContextOptions()
                  .then((data) => {
                    setContextOptions(data.organizations);
                    setWorkspaceLinked(data.organizations.length > 0);
                  })
                  .catch(() => {});
                window.dispatchEvent(new CustomEvent("zorvexa:context-changed"));
                toast.success(`Workspace · ${out.context.orgId} / ${out.context.projectId} / ${out.context.envId}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Context switch failed");
              }
            }}
            onDeleteWorkspace={async (deletedOrgId) => {
              try {
                await deleteOrganization(deletedOrgId);
                const data = await getContextOptions();
                setContextOptions(data.organizations);
                setWorkspaceLinked(data.organizations.length > 0);
                window.dispatchEvent(new CustomEvent("zorvexa:context-changed"));
                const deletedCurrent = deletedOrgId === orgId;
                if (!data.organizations.length) {
                  navigate("/launch-setup");
                  toast.success("Workspace deleted. Create a new one to continue.");
                  return;
                }
                if (deletedCurrent) {
                  const o = data.organizations[0];
                  const p = o.projects[0];
                  const e = p?.environments[0];
                  if (p && e) {
                    const out = await postSwitchContext({ orgId: o.id, projectId: p.id, envId: e.id });
                    setContext({
                      orgId: out.context.orgId,
                      projectId: out.context.projectId,
                      envId: out.context.envId,
                      role: out.context.role,
                    });
                    setContextVersion((v) => v + 1);
                    toast.success("Workspace deleted — switched to your remaining workspace.");
                  }
                } else {
                  toast.success("Workspace deleted.");
                }
              } catch (e) {
                const msg =
                  e instanceof ApiClientError
                    ? String((e.details as { error?: string })?.error ?? e.message)
                    : e instanceof Error
                      ? e.message
                      : "Could not delete workspace";
                toast.error(msg);
              }
            }}
            compact
            primaryAction={
              activeTab === "workflows" || activeTab === "runs"
                ? {
                    label: "Create Workflow",
                    onClick: () => {
                      if (activeTab !== "workflows") setActiveTab("workflows");
                      setWorkflowCreateNonce((n) => n + 1);
                    },
                  }
                : null
            }
          />
        </div>
        <main className={cn(
          "flex-1 transition-all duration-500 overflow-y-auto custom-scrollbar relative",
          activeTab === "chat" ? "p-6 md:p-8" : "p-6 md:p-8"
        )}>
           {import.meta.env.DEV && apiReachable === false ? (
             <div
               className="relative z-10 mb-4 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-50/95"
               role="status"
             >
               <p className="font-medium text-amber-100">Backend API is not reachable</p>
               <p className="mt-1 text-[13px] text-amber-100/85 leading-relaxed">
                 The UI proxies <code className="rounded bg-black/30 px-1 py-0.5 text-xs">/api</code> to{" "}
                 <code className="rounded bg-black/30 px-1 py-0.5 text-xs">127.0.0.1:5002</code>. Start the server from the repo root:{" "}
                 <code className="rounded bg-black/30 px-1 py-0.5 text-xs">npm run dev</code> — or in a second terminal:{" "}
                 <code className="rounded bg-black/30 px-1 py-0.5 text-xs">npm run dev:api</code>
               </p>
             </div>
           ) : null}
           {workspaceLinked === false ? (
             <div
               className="relative z-10 mb-4 rounded-xl border border-sky-500/35 bg-sky-950/40 px-4 py-3 text-sm text-sky-50/95"
               role="status"
             >
               <p className="font-medium text-sky-100">No tenant workspace linked</p>
               <p className="mt-1 text-[13px] text-sky-100/85 leading-relaxed">
                 The stream is labeled <strong>Simulation</strong> until an organization is linked — it is{" "}
                 <strong>not tenant-scoped</strong>. Use <strong>Launch Mode</strong> to register a company workspace so AI actions
                 and data apply to your tenant.
               </p>
             </div>
           ) : null}
           <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(79,70,229,0.10),transparent_45%)]" />
           {aiActivationBanner ? (
             <div
               data-testid="ai-control-activation-banner"
               className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-50/95"
             >
               <div>
                 <p className="font-semibold text-emerald-100">Zorvexa AI Control is active</p>
                 <p className="text-xs text-white/55 mt-0.5">
                   Control Plane is ready — AI follows your guardrails (observing vs acting depends on mode and signals).
                 </p>
               </div>
               <button
                 type="button"
                 onClick={() => setAiActivationBanner(false)}
                 className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
               >
                 Dismiss
               </button>
             </div>
           ) : null}
           <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md shadow-[0_8px_24px_rgba(2,8,23,0.35)] p-2 flex flex-wrap gap-1.5">
             {CONTROL_PLANE_TABS.map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={cn(
                   "h-9 px-4 rounded-[12px] text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border",
                   activeTab === tab.id
                     ? "bg-gradient-to-br from-[#3b66f5] to-[#6b46ef] text-white border-transparent shadow-[0_6px_20px_rgba(59,102,245,0.38)]"
                     : "text-white/55 border-white/[0.07] bg-white/[0.03] hover:text-white hover:bg-white/[0.06] hover:border-white/12"
                 )}
               >
                 {tab.label}
               </button>
             ))}
           </div>
           <div className={cn(
             "mx-auto h-full",
             "max-w-7xl"
           )}>
             <AnimatePresence mode="wait">
               <motion.div
                 key={`${activeTab}-${contextVersion}`}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.2 }}
                 className="h-full"
               >
                 <Suspense fallback={contentFallback}>
                   <StandardPageShell
                     title={tabMeta.title}
                     subtitle={tabMeta.subtitle}
                     topChrome={
                       activeTab === "hybrid-control" ? (
                         <AutonomousControlPlaneChrome
                           loopStatus={loopStatus}
                           k8sStatus={k8sStatus}
                           explainTrace={explainTrace}
                           onRefreshK8s={refreshK8sSnapshot}
                           onRunSimulation={() => setActiveTab("ai-simulation")}
                         />
                       ) : undefined
                     }
                     controls={
                      <div className="w-full flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1.5 min-w-0 max-w-3xl">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Risk posture</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  decisionRisk === "HIGH" ? "destructive" : decisionRisk === "MED" ? "secondary" : "outline"
                                }
                                className="border-white/15 shrink-0"
                              >
                                {riskLevelWithContext(decisionRisk).label}
                              </Badge>
                              <span className="text-sm text-white/55 leading-relaxed">
                                {riskLevelWithContext(decisionRisk).detail}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-xs text-white/40 space-y-1 max-w-[280px] leading-relaxed">
                            <div className="pb-1">
                              <Button
                                size="sm"
                                onClick={() => void handleRunTickNow()}
                                disabled={runningTickNow}
                                className="h-7 text-[10px] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                              >
                                {runningTickNow ? "Running tick..." : "Run AI tick now"}
                              </Button>
                            </div>
                            {demoMode ? <p className="text-cyan-200/70">Simulation workspace — signals are synthetic.</p> : null}
                            <p>
                              Control loop {loopStatus?.running ? "active" : "idle"}
                              {loopStatus?.lastRunAt ? ` · last tick ${new Date(loopStatus.lastRunAt).toLocaleTimeString()}` : ""}
                              {typeof loopStatus?.successRatePct === "number" ? ` · memory ${loopStatus.successRatePct.toFixed(1)}%` : ""}
                            </p>
                            <p>
                              Kubernetes AI {k8sStatus?.running ? "reconciling" : "idle"}
                              {k8sStatus?.dryRun ? " (dry-run)" : ""}
                              {k8sStatus?.lastCycleAt ? ` · ${new Date(k8sStatus.lastCycleAt).toLocaleTimeString()}` : ""}
                            </p>
                            {k8sStatus?.lastIssues?.[0] ? (
                              <p className="text-amber-200/75 text-left sm:text-right">
                                Cluster signal: {k8sStatus.lastIssues[0].type} — {k8sStatus.lastIssues[0].reason}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                     }
                     decisionPanel={
                       activeTab === "hybrid-control" ? (
                         <CurrentAIDecisionCard
                           source={aiDecision?.source}
                           issue={aiDecision?.issue}
                           action={aiDecision?.action}
                           reason={loopStatus?.reason}
                           confidence={aiDecision?.confidence}
                           result={aiDecision?.result}
                           resource={aiDecision?.resource}
                           riskLevel={decisionRisk}
                           latencyImpactPct={decisionImpactPct.latencyImpactPct ?? undefined}
                           costImpactPct={decisionImpactPct.costImpactPct ?? undefined}
                           autonomyMode={autonomyMode}
                           pendingApprovalId={k8sStatus?.pendingApprovals?.[0]?.id ?? null}
                           onApprove={async () => {
                             const id = k8sStatus?.pendingApprovals?.[0]?.id;
                             if (!id) return;
                             setApprovingDecision(true);
                             try {
                               await approveK8sHighRiskAction(id);
                               await refreshK8sSnapshot();
                               toast.success("Action approved");
                             } catch (e) {
                               toast.error(e instanceof Error ? e.message : "Approval failed");
                             } finally {
                               setApprovingDecision(false);
                             }
                           }}
                           onReject={() =>
                             toast.info("Rejection noted — this action will not execute without approval.")
                           }
                           approving={approvingDecision}
                           nextEvalSeconds={nextEvalSeconds}
                         />
                       ) : (
                         <AIDecisionPanel
                           source={aiDecision?.source}
                           issue={aiDecision?.issue}
                           action={aiDecision?.action}
                           confidence={aiDecision?.confidence}
                           result={aiDecision?.result}
                           resource={aiDecision?.resource}
                         />
                       )
                     }
                     main={renderContent()}
                    rightPanel={
                      TAB_IDS_WITH_EXPLAINABILITY.has(activeTab) ? (
                        <AIExplainabilityPanel
                          activeTab={activeTab}
                          loopStatus={loopStatus}
                          trace={explainTrace}
                          k8sStatus={k8sStatus}
                        />
                      ) : null
                    }
                     bottomPanel={bottomLogsPanel}
                    hideTitleSection={activeTab === "deployments" || activeTab === "hybrid-control"}
                    hideBottomSection={activeTab === "deployments"}
                    activityStreamOverride={
                      activeTab === "hybrid-control" ? (
                        <LifecycleActivityStream tenantWorkspaceLinked={workspaceLinked} />
                      ) : undefined
                    }
                   />
                 </Suspense>
               </motion.div>
             </AnimatePresence>
           </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNavigate={(id) => {
            if (["hybrid-control", "astra-ops-pipeline", "ai-simulation", "workload-location", "incidents", "optimization", "infrastructure", "governance"].includes(id)) {
              setActiveTab(id);
            }
          }}
          onCreateWorkflow={async () => toast.info("Manual workflows disabled in autonomous mode")}
          onExecuteWorkflow={async () => toast.info("Manual execution disabled in autonomous mode")}
          onDeploy={() => toast.info("Manual deploy disabled in autonomous mode")}
          onRollback={async () => toast.info("Manual rollback disabled in autonomous mode")}
          onAiPrompt={(prompt) => {
            setActiveTab("chat");
            setCopilotQuery(prompt);
            setCopilotNonce((n) => n + 1);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <EmbeddedAIChat
          context={{
            workflowId: activeWorkflowId,
            runId: activeRun?.id ?? null,
            activeTab,
          }}
        />
      </Suspense>
    </div>
    </AiStreamProvider>
    </SimulationPreviewProvider>
  );
};

export default Dashboard;
