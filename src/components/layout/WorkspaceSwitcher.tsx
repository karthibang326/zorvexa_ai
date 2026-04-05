import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type WorkspaceOrg = {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";
  projects: Array<{ id: string; name: string; environments: Array<{ id: string; name: string }> }>;
};

interface WorkspaceSwitcherProps {
  orgId: string;
  projectId: string;
  envId: string;
  organizations: WorkspaceOrg[];
  onSwitch: (next: { orgId: string; projectId: string; envId: string }) => Promise<void> | void;
  /** When set, owners see “Delete workspace” for that org (calls API then refreshes context). */
  onDeleteOrg?: (orgId: string) => Promise<void> | void;
}

function findLabels(orgs: WorkspaceOrg[], o: string, p: string, e: string) {
  const org = orgs.find((x) => x.id === o);
  const proj = org?.projects.find((x) => x.id === p);
  const env = proj?.environments.find((x) => x.id === e);
  return {
    orgName: org?.name ?? o,
    projName: proj?.name ?? p,
    envName: env?.name ?? e,
  };
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  orgId,
  projectId,
  envId,
  organizations,
  onSwitch,
  onDeleteOrg,
}) => {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const label = useMemo(
    () => findLabels(organizations, orgId, projectId, envId),
    [organizations, orgId, projectId, envId]
  );

  const handleSelect = async (next: { orgId: string; projectId: string; envId: string }) => {
    if (next.orgId === orgId && next.projectId === projectId && next.envId === envId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onSwitch(next);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          className={cn(
            "h-9 max-w-[min(100%,280px)] gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 sm:px-3 text-white/85 hover:bg-white/[0.08] hover:text-white",
            "inline-flex"
          )}
          aria-label="Switch organization or environment"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/50" /> : <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-300/90" />}
          <span className="min-w-0 truncate text-left text-[11px] sm:text-[12px] font-medium tracking-tight">
            <span className="text-white/90">{label.orgName}</span>
            <span className="text-white/35"> · </span>
            <span className="text-white/70">{label.projName}</span>
            <span className="text-white/35"> / </span>
            <span className="text-white/55">{label.envName}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[min(100vw-2rem,320px)] rounded-xl border border-white/10 bg-[#12141a] p-1 text-white shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          Tenant workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {!organizations.length ? (
          <div className="px-3 py-4 text-[12px] text-white/50">No organizations linked to this account.</div>
        ) : (
          organizations.map((org) => (
            <DropdownMenuSub key={org.id}>
              <DropdownMenuSubTrigger className="rounded-lg text-[12px] text-white/90 focus:bg-white/[0.06] data-[state=open]:bg-white/[0.06]">
                <span className="truncate">{org.name}</span>
                <span className="ml-2 shrink-0 text-[10px] uppercase text-white/35">{org.role}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                sideOffset={6}
                className="rounded-xl border border-white/10 bg-[#12141a] p-1 text-white min-w-[200px]"
              >
                {org.projects.map((proj) => (
                  <DropdownMenuSub key={proj.id}>
                    <DropdownMenuSubTrigger className="rounded-lg text-[12px] focus:bg-white/[0.06] data-[state=open]:bg-white/[0.06]">
                      {proj.name}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="rounded-xl border border-white/10 bg-[#12141a] p-1 min-w-[160px]">
                      {proj.environments.map((env) => (
                        <DropdownMenuItem
                          key={env.id}
                          className="cursor-pointer rounded-lg text-[12px] focus:bg-indigo-500/20 focus:text-white"
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleSelect({ orgId: org.id, projectId: proj.id, envId: env.id });
                          }}
                        >
                          {env.name}
                          {org.id === orgId && proj.id === projectId && env.id === envId ? (
                            <span className="ml-2 text-[10px] text-emerald-400/90">current</span>
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
                {onDeleteOrg && org.role === "OWNER" ? (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg text-[12px] text-rose-400/95 focus:bg-rose-500/15 focus:text-rose-200"
                      onSelect={(e) => {
                        e.preventDefault();
                        if (
                          !window.confirm(
                            `Delete workspace “${org.name}”? All projects, environments, and tenant data for this organization will be removed. This cannot be undone.`
                          )
                        ) {
                          return;
                        }
                        setBusy(true);
                        void Promise.resolve(onDeleteOrg(org.id)).finally(() => setBusy(false));
                      }}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
                      Delete workspace
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
