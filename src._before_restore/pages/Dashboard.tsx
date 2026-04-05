import React, { Suspense, lazy, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
const NewDeploymentModal = lazy(() => import("@/components/dashboard/NewDeploymentModal"));
const CommandPalette = lazy(() => import("@/components/dashboard/CommandPalette"));
const EmbeddedAIChat = lazy(() => import("@/components/dashboard/EmbeddedAIChat"));
const SettingsView = lazy(() => import("@/components/dashboard/SettingsView"));
const BillingPanel = lazy(() => import("@/components/billing/BillingPanel"));
const IntegrationsView = lazy(() => import("@/components/dashboard/IntegrationsView"));
const OptimizationView = lazy(() => import("@/components/dashboard/OptimizationView"));
const OrganizationView = lazy(() => import("@/components/dashboard/OrganizationView"));
const HybridControlPlaneView = lazy(() => import("@/components/dashboard/HybridControlPlaneView"));
const WorkloadLocationView = lazy(() => import("@/components/dashboard/WorkloadLocationView"));
const FailoverView = lazy(() => import("@/components/dashboard/FailoverView"));
const InfraHealthView = lazy(() => import("@/components/dashboard/InfraHealthView"));
import { useRun } from "@/hooks/useRun";
import { useOrchestrationStore } from "@/store/orchestration";
import { getDeploymentHistory, postAutoDeploy, postRollbackDeploy } from "@/lib/workflows";
import { useWorkflow } from "@/hooks/useWorkflow";
import { getAICeoStatus, postDisableAICeo, postEnableAICeo } from "@/lib/ai-ceo";
import { useContextStore } from "@/store/context";
import { getContextOptions, postSwitchContext } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StandardPageShell from "@/components/dashboard/layout/StandardPageShell";
import { getTabStandardMeta } from "@/components/dashboard/layout/tabStandards";

interface DashboardProps {
  initialTab?: string;
}

const CONTROL_PLANE_TABS: Array<{ id: string; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "workflows", label: "Workflows" },
  { id: "runs", label: "Runs" },
  { id: "deployments", label: "Deployments" },
  { id: "optimization", label: "Optimization" },
  { id: "organization", label: "Organization" },
  { id: "ai-control", label: "AI Control" },
  { id: "incidents", label: "Incidents" },
  { id: "monitoring", label: "Monitoring" },
];

const Dashboard: React.FC<DashboardProps> = ({ initialTab = "overview" }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState<string | null>(null);
  const [copilotNonce, setCopilotNonce] = useState(0);
  const [aiCeoEnabled, setAiCeoEnabled] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [aiMode, setAiMode] = useState<"manual" | "assist" | "auto">("assist");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [maxActionsPerHour, setMaxActionsPerHour] = useState(12);
  const [riskLevel] = useState<"LOW" | "MED" | "HIGH">("MED");
  const [workflowCreateNonce, setWorkflowCreateNonce] = useState(0);
  const { orgId, projectId, envId, setContext } = useContextStore();
  const [contextOptions, setContextOptions] = useState<Awaited<ReturnType<typeof getContextOptions>>["organizations"]>([]);

  const activeWorkflowId = useOrchestrationStore((s) => s.activeWorkflowId);
  const activeRun = useOrchestrationStore((s) => s.activeRun);
  const triggerLoading = useOrchestrationStore((s) => s.loading.trigger);
  const { trigger, openRun } = useRun();
  const { createDefaultWorkflow } = useWorkflow();

  const contentFallback = (
    <div className="h-full w-full rounded-2xl border border-white/10 bg-[#0B1220] animate-pulse" />
  );

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

  const handleDeployWorkflow = async ({
    repositoryId,
    branch,
    serviceName,
    rolloutName,
    namespace,
    strategy,
    autoDeployOnPush,
  }: {
    repositoryId: string;
    branch: string;
    serviceName: string;
    rolloutName: string;
    namespace: string;
    strategy: "canary" | "rolling";
    autoDeployOnPush: boolean;
  }) => {
    try {
      const started = await postAutoDeploy({
        repositoryId,
        branch,
        serviceName,
        rolloutName,
        namespace,
        strategy,
        autoDeployOnPush,
      });
      setActiveTab("deployments");
      return started;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deploy");
      throw e;
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
    void getContextOptions()
      .then((data) => setContextOptions(data.organizations))
      .catch(() => {
        // ignore context options preload errors
      });
  }, []);

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
      case "optimization": return <OptimizationView />;
      case "organization": return <OrganizationView />;
      // Operate
      case "deployments": return <DeploymentsView />;
      case "workflows":
      case "runs":
      case "templates":
        return <WorkflowsView activeView={activeTab} createTrigger={workflowCreateNonce} />;
      // Platform
      case "infrastructure": return <InfrastructureView />;
      case "hybrid-control":    return <HybridControlPlaneView />;
      case "workload-location": return <WorkloadLocationView />;
      case "failover":          return <FailoverView />;
      case "infra-health":      return <InfraHealthView />;
      case "integrations": return <IntegrationsView />;
      case "billing": return <BillingPanel />;
      case "settings": return <SettingsView />;
      // Security
      case "security": return <SecurityView />;
      case "audit": return <AuditLogsView />;
      default: return <AIWorkspaceView activePanel={activeTab} />;
    }
  };

  const tabMeta = getTabStandardMeta(activeTab);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden selection:bg-primary/20">
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
            onSearchSubmit={handleSearchSubmit}
            onRunWorkflow={handleRunWorkflow}
            onOpenDeployModal={() => setDeployDialogOpen(true)}
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
              toast.info("Settings opened");
            }}
            onOpenProfile={() => {
              setActiveTab("settings");
              toast.info("Profile opened");
            }}
            onLogout={handleSignOut}
            context={{
              orgId,
              projectId,
              envId,
              organizations: contextOptions,
            }}
            onSwitchContext={async (next) => {
              setContext(next);
              try {
                const out = await postSwitchContext(next);
                setContext({
                  orgId: out.context.orgId,
                  projectId: out.context.projectId,
                  envId: out.context.envId,
                  role: out.context.role,
                });
                setContextVersion((v) => v + 1);
                window.dispatchEvent(new CustomEvent("astraops:context-changed"));
                toast.success(`Context switched to ${out.context.orgId}/${out.context.projectId}/${out.context.envId}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Context switch failed");
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
          "flex-1 transition-all duration-500 overflow-y-auto custom-scrollbar",
          activeTab === "chat" ? "p-4 md:p-6" : "p-6 md:p-7"
        )}>
           <div className="mb-5 rounded-2xl border border-white/10 bg-[#0B1220] p-2 flex flex-wrap gap-2">
             {CONTROL_PLANE_TABS.map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={cn(
                   "h-9 px-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                   activeTab === tab.id
                     ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
                     : "text-white/55 hover:text-white hover:bg-white/5"
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
                     controls={
                      activeTab === "deployments" ? (
                        <div className="w-full flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Deployments · Real-time lifecycle</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="h-8">Run with AI</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setAiMode("manual")}>Manual</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAiMode("assist")}>Assist</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAiMode("auto")}>Auto</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Badge variant="secondary">Mode: {aiMode.toUpperCase()}</Badge>
                            <Badge variant={riskLevel === "HIGH" ? "destructive" : "secondary"}>Risk: {riskLevel}</Badge>
                            <label className="h-8 px-2 rounded-md border border-white/10 inline-flex items-center gap-2 text-xs text-muted-foreground">
                              Approval
                              <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="h-9">Run with AI</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => setAiMode("manual")}>Manual</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAiMode("assist")}>Assist</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAiMode("auto")}>Auto</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Badge variant="secondary">Mode: {aiMode.toUpperCase()}</Badge>
                          <Badge variant={riskLevel === "HIGH" ? "destructive" : "secondary"}>Risk: {riskLevel}</Badge>
                          <label className="h-9 px-3 rounded-md border border-white/10 inline-flex items-center gap-2 text-xs text-muted-foreground">
                            Approval
                            <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                          </label>
                          <label className="h-9 px-3 rounded-md border border-white/10 inline-flex items-center gap-2 text-xs text-muted-foreground">
                            Max/hr
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={maxActionsPerHour}
                              onChange={(e) => setMaxActionsPerHour(Math.max(1, Number(e.target.value || 1)))}
                              className="w-14 bg-transparent outline-none text-foreground"
                            />
                          </label>
                        </>
                      )
                     }
                     main={renderContent()}
                     rightPanel={tabMeta.right}
                     bottomPanel={tabMeta.bottom}
                    hideTitleSection={activeTab === "deployments"}
                    hideBottomSection={activeTab === "deployments"}
                   />
                 </Suspense>
               </motion.div>
             </AnimatePresence>
           </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <NewDeploymentModal
          open={deployDialogOpen}
          onOpenChange={setDeployDialogOpen}
          onConfirm={handleDeployWorkflow}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNavigate={setActiveTab}
          onCreateWorkflow={async () => {
            await createDefaultWorkflow();
            setActiveTab("workflows");
            toast.success("Workflow created");
          }}
          onExecuteWorkflow={async () => {
            await handleRunWorkflow({ environment: "Production", region: "US-East-1" });
          }}
          onDeploy={() => setDeployDialogOpen(true)}
          onRollback={async () => {
            const items = await getDeploymentHistory();
            const target = items.find((x) => String(x.status).toUpperCase().includes("SUCCEEDED")) ?? items[0];
            if (!target) throw new Error("No deployment found to rollback");
            await postRollbackDeploy(target.id);
            setActiveTab("deployments");
            toast.success("Rollback triggered");
          }}
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
  );
};

export default Dashboard;
