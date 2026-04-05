import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const setContextMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u-1" }, signOut: vi.fn() }),
}));

vi.mock("@/components/layout/AppSidebar", () => ({
  default: () => <div>Sidebar</div>,
}));

vi.mock("@/components/layout/AppHeader", () => ({
  default: () => <div>Header</div>,
}));

vi.mock("@/components/dashboard/layout/StandardPageShell", () => ({
  default: ({ controls, main }: { controls?: React.ReactNode; main: React.ReactNode }) => (
    <div>
      {controls}
      {main}
    </div>
  ),
}));

vi.mock("@/components/dashboard/layout/tabStandards", () => ({
  getTabStandardMeta: () => ({ title: "T", subtitle: "S", right: null, bottom: null }),
}));

vi.mock("@/components/dashboard/AIExplainabilityPanel", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useRun", () => ({
  useRun: () => ({ trigger: vi.fn(), openRun: vi.fn() }),
}));

vi.mock("@/hooks/useWorkflow", () => ({
  useWorkflow: () => ({ createDefaultWorkflow: vi.fn() }),
}));

vi.mock("@/store/orchestration", () => ({
  useOrchestrationStore: (selector: (s: any) => any) =>
    selector({ activeWorkflowId: null, activeRun: null, loading: { trigger: false } }),
}));

vi.mock("@/store/context", () => ({
  useContextStore: () => ({ orgId: "org-1", projectId: "proj-1", envId: "prod", setContext: setContextMock }),
}));

vi.mock("@/lib/context", () => ({
  getContextOptions: vi.fn(async () => ({ organizations: [] })),
  postSwitchContext: vi.fn(async () => ({ context: { orgId: "org-1", projectId: "proj-1", envId: "prod", role: "owner" } })),
}));

vi.mock("@/lib/ai-ceo", () => ({
  getAICeoStatus: vi.fn(async () => ({ enabled: true })),
  postEnableAICeo: vi.fn(async () => ({})),
  postDisableAICeo: vi.fn(async () => ({})),
}));

vi.mock("@/lib/autonomous", () => ({
  getK8sAutonomousStatus: vi.fn(async () => ({
    running: false,
    dryRun: true,
    lastCycleAt: null,
    lastIssues: [],
    lastActions: [],
    pendingApprovals: [],
  })),
}));

vi.mock("@/lib/ai-ops-learning", () => ({
  getOpsAutonomousLoopStatus: vi.fn(async () => ({
    running: false,
    lastRunAt: null,
    lastSummary: null,
  })),
  getOpsMemory: vi.fn(async () => ({ stats: { successRate: null } })),
}));

vi.mock("@/lib/demo-mode", () => ({
  isDemoModeEnabled: () => false,
  setDemoModeEnabled: vi.fn(),
}));

vi.mock("@/contexts/AiStreamContext", () => ({
  AiStreamProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAiStream: () => ({
    events: [],
    connected: false,
    lastError: null,
    kpis: {
      counts: { DETECT: 0, DECISION: 0, ACTION: 0, RESULT: 0 },
      healthScore: 0,
      avgConfidence: 0,
    },
    reconnect: vi.fn(),
  }),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/dashboard/CommandPalette", () => ({ default: () => null }));
vi.mock("@/components/dashboard/EmbeddedAIChat", () => ({ default: () => null }));
vi.mock("@/components/dashboard/OverviewView", () => ({ default: () => <div>Overview</div> }));
vi.mock("@/components/dashboard/AIWorkspaceView", () => ({ default: () => <div>AI Workspace</div> }));
vi.mock("@/components/dashboard/ai-control-center/AIControlCenterView", () => ({ default: () => <div>AI Control</div> }));
vi.mock("@/components/dashboard/MonitoringView", () => ({ default: () => <div>Monitoring</div> }));
vi.mock("@/components/dashboard/InfrastructureView", () => ({ default: () => <div>Infrastructure</div> }));
vi.mock("@/components/dashboard/DeploymentsView", () => ({ default: () => <div>Deployments</div> }));
vi.mock("@/components/dashboard/SecurityView", () => ({ default: () => <div>Security</div> }));
vi.mock("@/components/dashboard/CostIntelligenceView", () => ({ default: () => <div>Cost</div> }));
vi.mock("@/components/dashboard/WorkflowsView", () => ({ default: () => <div>Workflows</div> }));
vi.mock("@/components/dashboard/AuditLogsView", () => ({ default: () => <div>Audit</div> }));
vi.mock("@/components/dashboard/PerformanceView", () => ({ default: () => <div>Performance</div> }));
vi.mock("@/components/dashboard/IncidentsView", () => ({ default: () => <div>Incidents</div> }));
vi.mock("@/components/dashboard/ChaosView", () => ({ default: () => <div>Chaos</div> }));
vi.mock("@/components/dashboard/SettingsView", () => ({ default: () => <div>Settings</div> }));
vi.mock("@/components/dashboard/IntegrationsView", () => ({ default: () => <div>Integrations</div> }));
vi.mock("@/components/dashboard/OrganizationView", () => ({ default: () => <div>Organization</div> }));
vi.mock("@/components/dashboard/HybridControlPlaneView", () => ({ default: () => <div>Hybrid</div> }));
vi.mock("@/components/dashboard/WorkloadLocationView", () => ({ default: () => <div>Workload</div> }));
vi.mock("@/components/dashboard/GovernanceView", () => ({ default: () => <div>Governance</div> }));

describe("Dashboard demo mode", () => {
  it("should show demo badge", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?demo=1"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Simulation workspace/i)).toBeInTheDocument();
  });

  it("applies Launch Mode org/project/env query params to workspace context", async () => {
    setContextMock.mockClear();
    render(
      <MemoryRouter
        initialEntries={[
          "/dashboard?tab=hybrid-control&launchOrg=org-launch&launchProject=proj-launch&launchEnv=env-staging",
        ]}
      >
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(setContextMock).toHaveBeenCalledWith({
        orgId: "org-launch",
        projectId: "proj-launch",
        envId: "env-staging",
      });
    });
  });
});
