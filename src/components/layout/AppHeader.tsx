import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Plus, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { HeaderDropdown } from "./HeaderDropdown";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { getAutonomousMode, setAutonomousMode } from "@/lib/autonomous";
import { getOpsAutonomousLoopStatus } from "@/lib/ai-ops-learning";
import {
  AI_CONTROL_MODE_COPY,
  SYSTEM_HEALTH_COPY,
  deriveAiControlMode,
  deriveSystemHealth,
} from "@/lib/ai-dashboard-status";
import { useContextStore } from "@/store/context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

type Environment = "Production" | "Staging";
type Region = "US-East-1" | "EU-West-1";

interface AppHeaderProps {
  user?: User | null;
  onSearchSubmit: (query: string) => void;
  onRunWorkflow: (opts: { environment: Environment; region: Region }) => Promise<void> | void;
  onOpenDeployModal: () => void;
  runLoading?: boolean;
  aiCeoEnabled?: boolean;
  onToggleAICeoMode?: (enabled: boolean) => Promise<void> | void;
  onOpenSettings: () => void;
  onLogout: () => Promise<void> | void;
  context: {
    orgId: string;
    projectId: string;
    envId: string;
    organizations: Array<{
      id: string;
      name: string;
      role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";
      projects: Array<{ id: string; name: string; environments: Array<{ id: string; name: string }> }>;
    }>;
  };
  onSwitchContext: (next: { orgId: string; projectId: string; envId: string }) => Promise<void> | void;
  /** Owner-only workspace delete from the tenant switcher */
  onDeleteWorkspace?: (orgId: string) => Promise<void> | void;
  /** From GET /api/context/options — when false, AI pill reflects global/simulation, not “paused”. */
  tenantWorkspaceLinked?: boolean | null;
  compact?: boolean;
  primaryAction?: {
    label: string;
    onClick: () => void;
  } | null;
  activeTab?: string;
}

interface AiAlert {
  id: string;
  title: string;
  detail: string;
  time: string;
}

function formatEnvironmentLabel(envId: string): string {
  const id = envId.toLowerCase();
  if (isDemoModeEnabled()) return "Demo / Simulated";
  if (id.includes("prod")) return "Production";
  if (id.includes("stage") || id.includes("stg")) return "Staging";
  if (id.includes("dev")) return "Development";
  return envId;
}

function accessLevelCopy(role: string): string {
  switch (role) {
    case "OWNER":
      return "Owner — full platform";
    case "ADMIN":
      return "Administrator";
    case "ENGINEER":
      return "Engineer";
    case "VIEWER":
      return "Viewer — read-only";
    default:
      return "Standard";
  }
}

const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onSearchSubmit,
  onOpenSettings,
  onLogout,
  context,
  onSwitchContext,
  onDeleteWorkspace,
  tenantWorkspaceLinked = null,
  primaryAction = null,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [autoState, setAutoState] = useState<{
    enabled: boolean;
    manualOverride: boolean;
  }>({ enabled: true, manualOverride: false });
  const [autoLoading, setAutoLoading] = useState(false);

  const { envId, role } = useContextStore();

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    if (meta?.full_name) return meta.full_name;
    if (meta?.name) return meta.name;
    if (user?.email) return user.email.split("@")[0] ?? "Operator";
    return "Operator";
  }, [user]);

  const environmentLabel = useMemo(() => formatEnvironmentLabel(envId || context.envId), [envId, context.envId]);

  const refreshAutonomous = useCallback(async () => {
    try {
      const m = await getAutonomousMode();
      setAutoState({
        enabled: Boolean(m.enabled),
        manualOverride: Boolean(m.manualOverride),
      });
    } catch {
      // API optional in dev
    }
  }, []);

  const [loopSnap, setLoopSnap] = useState({ running: false, failures: 0 });

  useEffect(() => {
    if (operatorOpen) void refreshAutonomous();
  }, [operatorOpen, refreshAutonomous]);

  useEffect(() => {
    const tick = async () => {
      await refreshAutonomous();
      try {
        const s = await getOpsAutonomousLoopStatus();
        setLoopSnap({
          running: Boolean(s.running),
          failures: Number(s.failures ?? 0),
        });
      } catch {
        // optional in dev
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 10000);
    return () => window.clearInterval(id);
  }, [refreshAutonomous]);

  const setAutonomousEnabled = async (enabled: boolean) => {
    setAutoLoading(true);
    try {
      const out = await setAutonomousMode({
        enabled,
        manualOverride: autoState.manualOverride,
      });
      setAutoState({ enabled: out.enabled, manualOverride: out.manualOverride });
      toast.success(enabled ? "Autonomous control ON" : "Autonomous control OFF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update autonomous mode");
    } finally {
      setAutoLoading(false);
    }
  };

  const setManualOverride = async (manualOverride: boolean) => {
    setAutoLoading(true);
    try {
      const out = await setAutonomousMode({
        enabled: autoState.enabled,
        manualOverride,
      });
      setAutoState({ enabled: out.enabled, manualOverride: out.manualOverride });
      toast.success(manualOverride ? "Override permissions enabled" : "Override permissions disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update overrides");
    } finally {
      setAutoLoading(false);
    }
  };

  const headerStatus = useMemo(() => {
    const demoMode = isDemoModeEnabled();
    let hasLiveInfra = false;
    try {
      const raw =
        localStorage.getItem("zorvexa_connected_infra") ?? localStorage.getItem("astraops_connected_infra");
      if (raw) {
        const parsed = JSON.parse(raw) as { provider?: string };
        hasLiveInfra = Boolean(parsed.provider);
      }
    } catch {
      // ignore
    }
    const mode = deriveAiControlMode({
      autonomousEnabled: autoState.enabled,
      manualOverride: autoState.manualOverride,
      tenantWorkspaceLinked,
    });
    const health = deriveSystemHealth({
      hasLiveInfra,
      demoMode,
      loopRunning: loopSnap.running,
      loopFailures: loopSnap.failures,
    });
    return { mode, health };
  }, [autoState.enabled, autoState.manualOverride, loopSnap.running, loopSnap.failures, tenantWorkspaceLinked]);

  const aiAlerts: AiAlert[] = [
    { id: "a1", title: "Predictive latency event avoided", detail: "Zorvexa pre-scaled API tier before traffic burst.", time: "1m ago" },
    { id: "a2", title: "Cost optimization executed", detail: "Workload placement shifted to lower-cost region.", time: "7m ago" },
    { id: "a3", title: "Autonomous remediation complete", detail: "Service health recovered after anomaly detection.", time: "15m ago" },
  ];

  const submitSearch = () => {
    const q = searchValue.trim();
    if (!q) return;
    onSearchSubmit(q);
  };

  return (
    <header className="shrink-0 z-40 border-b border-white/[0.06] bg-[#0B0F1A]/92 backdrop-blur-xl">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 h-16">
        <div className="flex items-center gap-4 min-w-0">
          <ZorvexaLogo size={24} markContainerSize={36} showTagline={false} className="min-w-0 gap-3" markClassName="rounded-xl" wordmarkClassName="text-[17px]" />
          <WorkspaceSwitcher
            orgId={context.orgId}
            projectId={context.projectId}
            envId={context.envId}
            organizations={context.organizations}
            onSwitch={onSwitchContext}
            onDeleteOrg={onDeleteWorkspace}
          />
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-tight backdrop-blur-sm",
                AI_CONTROL_MODE_COPY[headerStatus.mode].className
              )}
              title={AI_CONTROL_MODE_COPY[headerStatus.mode].short}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  headerStatus.mode === "autonomous_active" && "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.65)]",
                  headerStatus.mode === "partial_control" && "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]",
                  headerStatus.mode === "ai_paused" && "bg-zinc-500",
                  headerStatus.mode === "no_tenant_workspace" &&
                    "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]"
                )}
              />
              {AI_CONTROL_MODE_COPY[headerStatus.mode].title}
            </span>
            <span
              className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium tracking-tight text-white/75 backdrop-blur-sm"
              title="Active workspace environment"
            >
              {environmentLabel}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-tight backdrop-blur-sm",
                SYSTEM_HEALTH_COPY[headerStatus.health].className
              )}
              title={SYSTEM_HEALTH_COPY[headerStatus.health].detail}
            >
              {SYSTEM_HEALTH_COPY[headerStatus.health].label}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center min-w-0">
          <div className="relative w-full max-w-[480px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Ask Zorvexa…"
              className="h-10 pl-9 rounded-xl border border-white/10 bg-[#111827] text-white/90 placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {primaryAction ? (
            <Button type="button" onClick={primaryAction.onClick} className="mr-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-[10px] hidden sm:inline-flex">
              <Plus className="w-4 h-4 mr-2" />
              {primaryAction.label}
            </Button>
          ) : null}

          <HeaderDropdown
            trigger={
              <Button type="button" variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl" aria-label="AI notifications">
                <Bell className="w-4 h-4" />
              </Button>
            }
            contentClassName="w-[360px] rounded-2xl bg-[#0B1220] border border-white/10 p-1"
            align="end"
            side="bottom"
            sideOffset={8}
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">AI Alerts</p>
              <p className="text-[10px] text-white/35 mt-0.5">Autonomous system notifications</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {aiAlerts.map((n) => (
                <DropdownMenuItem key={n.id} className="w-full rounded-none px-4 py-3 text-left border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <div className="w-full">
                    <p className="text-[12px] font-semibold text-white/90">{n.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{n.detail}</p>
                    <p className="text-[10px] text-white/25 mt-1">{n.time}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </HeaderDropdown>

          <HeaderDropdown
            open={operatorOpen}
            onOpenChange={setOperatorOpen}
            trigger={
              <Button
                type="button"
                variant="ghost"
                className="h-9 gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/80 hover:bg-white/[0.08] hover:text-white"
                aria-expanded={operatorOpen}
                aria-haspopup="menu"
                aria-label="Operator identity"
              >
                <span className="text-[12px] font-medium tracking-tight">
                  {role === "OWNER" || role === "ADMIN" ? "Admin" : "Operator"}
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/45 transition-transform", operatorOpen && "rotate-180")} />
              </Button>
            }
            contentClassName="w-[300px] rounded-xl bg-[#0B0F1A] border border-white/[0.08] p-0 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
            align="end"
            side="bottom"
            sideOffset={8}
          >
            <div
              className="p-4"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Operator identity</p>
              <p className="mt-2 text-[15px] font-semibold tracking-tight text-white">{displayName}</p>
              <dl className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
                  <dt className="text-white/45">Role</dt>
                  <dd className="text-right text-white/90">{role === "VIEWER" ? "Viewer" : role === "ENGINEER" ? "Operator" : "Administrator"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
                  <dt className="text-white/45">Access level</dt>
                  <dd className="text-right text-white/90">{accessLevelCopy(role)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Environment</dt>
                  <dd className="text-right text-white/90">{environmentLabel}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-white/35">You supervise policy and risk. AI executes infrastructure actions.</p>
            </div>

            <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
              <div
                className="flex items-center justify-between gap-3"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-white/90">Autonomous control</p>
                  <p className="text-[10px] text-white/40">AI operations enabled</p>
                </div>
                <Switch
                  checked={autoState.enabled}
                  disabled={autoLoading}
                  onCheckedChange={(v) => void setAutonomousEnabled(v)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div
                className="flex items-center justify-between gap-3"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-white/90">Override permissions</p>
                  <p className="text-[10px] text-white/40">Allow gated manual actions</p>
                </div>
                <Switch
                  checked={autoState.manualOverride}
                  disabled={autoLoading}
                  onCheckedChange={(v) => void setManualOverride(v)}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </div>

            <div className="border-t border-white/[0.06] p-2 flex flex-col gap-0.5">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-[12px] text-white/80 hover:bg-white/[0.06] transition-colors"
                onClick={() => {
                  setOperatorOpen(false);
                  onOpenSettings();
                }}
              >
                AI Governance
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-[12px] text-red-300/90 hover:bg-red-500/10 transition-colors"
                onClick={() => {
                  setOperatorOpen(false);
                  void onLogout();
                }}
              >
                Sign out
              </button>
            </div>
          </HeaderDropdown>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
