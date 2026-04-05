import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronDown, CircleUserRound, Loader2, Play, Plus, Rocket, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";
import { cn } from "@/lib/utils";
import { HeaderDropdown } from "./HeaderDropdown";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Environment = "Production" | "Staging";
type Region = "US-East-1" | "EU-West-1";

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
}

interface AppHeaderProps {
  onSearchSubmit: (query: string) => void;
  onRunWorkflow: (opts: { environment: Environment; region: Region }) => Promise<void> | void;
  onOpenDeployModal: () => void;
  runLoading?: boolean;
  aiCeoEnabled?: boolean;
  onToggleAICeoMode?: (enabled: boolean) => Promise<void> | void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
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
  compact?: boolean;
  primaryAction?: {
    label: string;
    onClick: () => void;
  } | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  onSearchSubmit,
  onRunWorkflow,
  onOpenDeployModal,
  runLoading = false,
  aiCeoEnabled = false,
  onToggleAICeoMode,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  context,
  onSwitchContext,
  compact = false,
  primaryAction = null,
}) => {
  const [region, setRegion] = useState<Region>("US-East-1");
  const [environment, setEnvironment] = useState<Environment>("Production");

  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      title: "Run completed",
      detail: "Workflow “New Workflow” finished successfully.",
      time: "2m ago",
      unread: true,
    },
    {
      id: "n2",
      title: "Deploy update",
      detail: "Canary health checks passed (p99 stable).",
      time: "18m ago",
      unread: true,
    },
    {
      id: "n3",
      title: "AI Copilot",
      detail: "Suggested rollback plan ready for review.",
      time: "1h ago",
      unread: false,
    },
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);
  const [orgFilter, setOrgFilter] = useState("");
  const [projFilter, setProjFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [switching, setSwitching] = useState(false);
  const organizations = Array.isArray(context?.organizations) ? context.organizations : [];

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === context.orgId) ?? organizations[0],
    [context.orgId, organizations]
  );
  const selectedProject = useMemo(
    () => (Array.isArray(selectedOrg?.projects) ? selectedOrg.projects : []).find((p) => p.id === context.projectId) ?? (Array.isArray(selectedOrg?.projects) ? selectedOrg.projects[0] : undefined),
    [context.projectId, selectedOrg]
  );
  const selectedEnv = useMemo(
    () => (Array.isArray(selectedProject?.environments) ? selectedProject.environments : []).find((e) => e.id === context.envId) ?? (Array.isArray(selectedProject?.environments) ? selectedProject.environments[0] : undefined),
    [context.envId, selectedProject]
  );

  const switchContext = async (next: { orgId?: string; projectId?: string; envId?: string }) => {
    const orgId = next.orgId ?? context.orgId;
    const org = organizations.find((o) => o.id === orgId) ?? selectedOrg;
    const projectId = next.projectId ?? context.projectId ?? org?.projects[0]?.id;
    const project = org?.projects.find((p) => p.id === projectId) ?? org?.projects[0];
    const envId = next.envId ?? context.envId ?? project?.environments[0]?.id;
    if (!org?.id || !project?.id || !envId) return;
    setSwitching(true);
    try {
      await onSwitchContext({ orgId: org.id, projectId: project.id, envId });
    } finally {
      setSwitching(false);
    }
  };

  const submitSearch = () => {
    const q = searchValue.trim();
    if (!q) return;
    onSearchSubmit(q);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || t?.isContentEditable;
      if (isTyping) return;

      e.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);


  return (
    <header className="shrink-0 relative z-40 border-b border-gray-800/70 bg-[#0B0F1A]/90 backdrop-blur-xl overflow-visible">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 h-16">
        <div className="flex items-center gap-4 min-w-0">
          <AstraOpsLogo
            size={24}
            markContainerSize={36}
            showTagline={false}
            className="min-w-0 gap-3"
            markClassName="rounded-xl"
            wordmarkClassName="text-[18px]"
          />

          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <HeaderDropdown
              trigger={
                <button type="button" className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/[0.03] border border-white/10 inline-flex items-center gap-1.5">
                  {selectedOrg?.name ?? "Org"} <ChevronDown className="w-3 h-3" />
                </button>
              }
              contentClassName="w-[300px] rounded-2xl bg-[#0B1220] border border-white/10 p-2"
              align="start"
            >
              <Input value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} placeholder="Search org..." className="h-8 mb-2 bg-[#111827] border-white/10 text-white/85" />
              <div className="max-h-[240px] overflow-y-auto">
                {organizations.filter((o) => o.name.toLowerCase().includes(orgFilter.toLowerCase())).map((o) => (
                  <DropdownMenuItem key={o.id} onSelect={(e) => { e.preventDefault(); void switchContext({ orgId: o.id, projectId: o.projects[0]?.id, envId: o.projects[0]?.environments[0]?.id }); }}>
                    <div className="w-full flex items-center justify-between text-[12px]">
                      <span>{o.name}</span>
                      {o.id === context.orgId ? <Check className="w-3.5 h-3.5 text-primary" /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </HeaderDropdown>
            <span className="text-white/20">/</span>
            <HeaderDropdown
              trigger={
                <button type="button" className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/[0.03] border border-white/10 inline-flex items-center gap-1.5">
                  {selectedProject?.name ?? "Project"} <ChevronDown className="w-3 h-3" />
                </button>
              }
              contentClassName="w-[280px] rounded-2xl bg-[#0B1220] border border-white/10 p-2"
              align="start"
            >
              <Input value={projFilter} onChange={(e) => setProjFilter(e.target.value)} placeholder="Search project..." className="h-8 mb-2 bg-[#111827] border-white/10 text-white/85" />
              <div className="max-h-[220px] overflow-y-auto">
                {(selectedOrg?.projects ?? []).filter((p) => p.name.toLowerCase().includes(projFilter.toLowerCase())).map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={(e) => { e.preventDefault(); void switchContext({ projectId: p.id, envId: p.environments[0]?.id }); }}>
                    <div className="w-full flex items-center justify-between text-[12px]">
                      <span>{p.name}</span>
                      {p.id === context.projectId ? <Check className="w-3.5 h-3.5 text-primary" /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </HeaderDropdown>
            <span className="text-white/20">/</span>
            <HeaderDropdown
              trigger={
                <button type="button" className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/[0.03] border border-white/10 inline-flex items-center gap-1.5">
                  {selectedEnv?.name ?? "Env"} <ChevronDown className="w-3 h-3" />
                </button>
              }
              contentClassName="w-[220px] rounded-2xl bg-[#0B1220] border border-white/10 p-2"
              align="start"
            >
              <Input value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} placeholder="Search env..." className="h-8 mb-2 bg-[#111827] border-white/10 text-white/85" />
              <div className="max-h-[220px] overflow-y-auto">
                {(selectedProject?.environments ?? []).filter((e) => e.name.toLowerCase().includes(envFilter.toLowerCase())).map((e) => (
                  <DropdownMenuItem key={e.id} onSelect={(ev) => { ev.preventDefault(); void switchContext({ envId: e.id }); }}>
                    <div className="w-full flex items-center justify-between text-[12px]">
                      <span>{e.name}</span>
                      {e.id === context.envId ? <Check className="w-3.5 h-3.5 text-primary" /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </HeaderDropdown>
          </div>

          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setRegion((v) => (v === "US-East-1" ? "EU-West-1" : "US-East-1"))}
              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary italic shadow-glow-primary/5 transition-all"
            >
              {region}
            </button>
          </div>
          {switching ? <Loader2 className="w-4 h-4 animate-spin text-white/40" /> : null}
        </div>

        <div className="flex items-center justify-center min-w-0">
          <div className="relative w-full max-w-[400px] justify-self-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <Input
              ref={searchRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Search workflows or ask Copilot…"
              className={cn(
                "h-10 pl-9 pr-10 rounded-xl border bg-[#111827] text-white/90 placeholder:text-white/20",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                isSearchFocused ? "border-primary/50 shadow-[0_0_0_1px_rgba(37,99,235,0.25)]" : "border-white/10",
                "transition-all duration-200"
              )}
            />
            <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">/</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!compact ? (
            <>
              <label className="hidden lg:inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-indigo-200">
                AI CEO
                <input
                  type="checkbox"
                  checked={aiCeoEnabled}
                  onChange={(e) => {
                    void onToggleAICeoMode?.(e.target.checked);
                  }}
                  className="accent-indigo-500"
                />
              </label>
              <Button
                type="button"
                onClick={() => void onRunWorkflow({ environment, region })}
                disabled={runLoading}
                variant="outline"
                className="h-10 border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white rounded-xl hidden sm:inline-flex"
              >
                {runLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run
              </Button>
              <Button
                type="button"
                onClick={() => void onRunWorkflow({ environment, region })}
                disabled={runLoading}
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl sm:hidden"
                aria-label="Run"
              >
                {runLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={onOpenDeployModal}
                      className="h-10 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white font-semibold px-6 rounded-xl shadow-[0_10px_28px_rgba(37,99,235,0.35)] hover:scale-[1.02] hover:brightness-110 active:scale-95 transition-all duration-200 whitespace-nowrap hidden sm:inline-flex"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Deploy
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="rounded-xl border-white/15 bg-[#0B1220] text-white/90">
                    Deploy will automatically configure your service
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                type="button"
                onClick={onOpenDeployModal}
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl sm:hidden"
                aria-label="Deploy"
              >
                <Rocket className="w-4 h-4" />
              </Button>
            </>
          ) : null}

          <div className="flex items-center gap-1 border-l border-white/[0.08] pl-3 h-10">
            {primaryAction ? (
              <Button
                type="button"
                onClick={primaryAction.onClick}
                className="mr-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-[10px] shadow-sm hidden sm:inline-flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                {primaryAction.label}
              </Button>
            ) : null}
            <div className="relative flex items-center">
              <HeaderDropdown
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                }
                contentClassName="w-[360px] rounded-2xl bg-[#0B1220] border border-white/10 p-1"
                align="end"
                side="bottom"
                sideOffset={8}
                onOpenChange={(open) => {
                  if (!open) return;
                  setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                }}
              >
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/70 italic">Notifications</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{unreadCount} unread</p>
                  </div>
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-white/30 text-[11px] italic">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={cn(
                          "w-full px-4 py-3 text-left border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors rounded-none",
                          n.unread ? "bg-primary/5" : "bg-transparent"
                        )}
                        onSelect={(e) => {
                          e.preventDefault();
                          setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="min-w-0">
                            <p className={cn("text-[12px] font-black text-white/85 leading-tight truncate", n.unread ? "text-white" : "")}>
                              {n.title}
                            </p>
                            <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{n.detail}</p>
                          </div>
                          <span className="text-[10px] font-mono text-white/25 whitespace-nowrap">{n.time}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator className="my-1" />
              </HeaderDropdown>

              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_0_3px_rgba(37,99,235,0.2)]" />
              )}
            </div>

            <HeaderDropdown
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl ml-1"
                  aria-label="Settings menu"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              }
              contentClassName="w-[220px] rounded-2xl bg-[#0B1220] border border-white/10 p-1"
              align="end"
              side="bottom"
              sideOffset={8}
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/70 italic">Preferences</p>
                <p className="text-[10px] text-white/30 mt-0.5">Settings & profile</p>
              </div>
              <DropdownMenuItem
                className="w-full rounded-none px-4 py-3 text-left hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
                onSelect={(e) => {
                  e.preventDefault();
                  onOpenSettings();
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] font-black text-white/85">Settings</p>
                  <p className="text-[10px] text-white/30">Preferences & notifications</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="w-full rounded-none px-4 py-3 text-left hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
                onSelect={(e) => {
                  e.preventDefault();
                  onOpenProfile();
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] font-black text-white/85">Profile</p>
                  <p className="text-[10px] text-white/30">Manage account settings</p>
                </div>
              </DropdownMenuItem>
            </HeaderDropdown>

            <HeaderDropdown
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl ml-1"
                  aria-label="Account menu"
                >
                  <CircleUserRound className="w-4 h-4" />
                </Button>
              }
              contentClassName="w-[240px] rounded-2xl bg-[#0B1220] border border-white/10 p-1"
              align="end"
              side="bottom"
              sideOffset={8}
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/70 italic">Account</p>
                <p className="text-[10px] text-white/30 mt-0.5">Profile & access</p>
              </div>
              <DropdownMenuItem
                className="w-full rounded-none px-4 py-3 text-left hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
                onSelect={(e) => {
                  e.preventDefault();
                  onOpenProfile();
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] font-black text-white/85">Profile</p>
                  <p className="text-[10px] text-white/30">Manage account settings</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="w-full rounded-none px-4 py-3 text-left hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
                onSelect={(e) => {
                  e.preventDefault();
                  onOpenSettings();
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] font-black text-white/85">Settings</p>
                  <p className="text-[10px] text-white/30">Preferences & notifications</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="w-full rounded-none px-4 py-3 text-left hover:bg-red-500/[0.08] transition-colors"
                onSelect={(e) => {
                  e.preventDefault();
                  void onLogout();
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] font-black text-red-300">Logout</p>
                  <p className="text-[10px] text-red-300/60">Sign out securely</p>
                </div>
              </DropdownMenuItem>
            </HeaderDropdown>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
