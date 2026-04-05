import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  ChevronRight,
  Cloud,
  Cpu,
  Gauge,
  GitBranch,
  Globe2,
  Layers,
  ListTree,
  MapPin,
  Radio,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDeploymentHistory, type DeploymentHistoryItem } from "@/lib/workflows";
import { withContextQuery } from "@/lib/context";
import { useContextStore } from "@/store/context";
import {
  buildDeploymentUniverse,
  matchesStatusFilter,
  sortByAiPriority,
  type DeploymentStatusFilter,
  type EnrichedDeployment,
} from "@/lib/deployments-view-model";
import type { DeploymentEnvGroup } from "@/lib/deployment-identity";
import { envGroupLabel, shortEnvTag } from "@/lib/deployment-identity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeploymentLogEvent {
  message: string;
  status?: string;
  event?: string;
  ts: string;
}

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

const AI_PHASE: Record<
  EnrichedDeployment["aiPhase"],
  { label: string; className: string }
> = {
  monitoring: { label: "Monitoring", className: "bg-sky-500/15 text-sky-200 border-sky-400/30" },
  acting: { label: "Acting", className: "bg-amber-500/15 text-amber-100 border-amber-400/35" },
  stabilized: { label: "Stabilized", className: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30" },
  incident: { label: "Incident", className: "bg-rose-500/15 text-rose-100 border-rose-400/35" },
};

const CLOUD_BADGE: Record<string, string> = {
  aws: "bg-orange-500/15 text-orange-200 border-orange-400/25",
  gcp: "bg-blue-500/15 text-blue-200 border-blue-400/25",
  azure: "bg-cyan-500/15 text-cyan-100 border-cyan-400/25",
};

const ENV_HEADER: Record<DeploymentEnvGroup, string> = {
  production: "from-rose-500/10 via-transparent to-transparent border-rose-500/20",
  staging: "from-amber-500/10 via-transparent to-transparent border-amber-500/20",
  development: "from-emerald-500/10 via-transparent to-transparent border-emerald-500/20",
};

const DeploymentsView: React.FC = () => {
  const { orgId, projectId, envId } = useContextStore();
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<DeploymentLogEvent[]>([]);

  const [viewMode, setViewMode] = useState<"global" | "service">("global");
  const [envFilter, setEnvFilter] = useState<"all" | DeploymentEnvGroup>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<DeploymentStatusFilter>("all");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getDeploymentHistory();
      setHistory(items);
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
    const t = window.setInterval(() => void loadHistory(), 12_000);
    return () => window.clearInterval(t);
  }, [loadHistory]);

  const universe = useMemo(
    () => buildDeploymentUniverse(history, { orgId, projectId, envId }),
    [history, orgId, projectId, envId]
  );

  const regions = useMemo(() => ["all", ...new Set(universe.map((u) => u.identity.region))], [universe]);
  const services = useMemo(() => ["all", ...new Set(universe.map((u) => u.service).sort())], [universe]);

  const filtered = useMemo(() => {
    return universe.filter((d) => {
      if (envFilter !== "all" && d.envGroup !== envFilter) return false;
      if (regionFilter !== "all" && d.identity.region !== regionFilter) return false;
      if (serviceFilter !== "all" && d.service !== serviceFilter) return false;
      if (!matchesStatusFilter(d, statusFilter)) return false;
      return true;
    });
  }, [universe, envFilter, regionFilter, serviceFilter, statusFilter]);

  const priorityQueue = useMemo(() => [...filtered].sort(sortByAiPriority).slice(0, 6), [filtered]);

  const insights = useMemo(() => {
    const set = new Set<string>();
    for (const d of filtered) {
      if (d.correlatedSignal) set.add(d.correlatedSignal);
    }
    return [...set];
  }, [filtered]);

  const groupedByEnv = useMemo(() => {
    const order: DeploymentEnvGroup[] = ["production", "staging", "development"];
    const m = new Map<DeploymentEnvGroup, EnrichedDeployment[]>();
    for (const g of order) m.set(g, []);
    for (const d of filtered) {
      const list = m.get(d.envGroup) ?? [];
      list.push(d);
      m.set(d.envGroup, list);
    }
    return m;
  }, [filtered]);

  const groupedByService = useMemo(() => {
    const m = new Map<string, EnrichedDeployment[]>();
    for (const d of filtered) {
      const list = m.get(d.service) ?? [];
      list.push(d);
      m.set(d.service, list);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const selected = useMemo(() => universe.find((u) => u.id === selectedId) ?? null, [universe, selectedId]);

  useEffect(() => {
    if (!selectedId || !selected?.isLive) {
      setLogs([]);
      return;
    }
    setLogs([]);
    const stream = new EventSource(withContextQuery(`${getApiBase()}/deploy/${encodeURIComponent(selectedId)}/stream`));
    const pushEvent = (raw: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(raw.data) as DeploymentLogEvent;
        setLogs((prev) => [...prev, parsed].slice(-400));
      } catch {
        /* ignore */
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
  }, [selectedId, selected?.isLive]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const renderDeploymentCard = (d: EnrichedDeployment, compact?: boolean) => {
    const phase = AI_PHASE[d.aiPhase];
    const critical = d.riskScore >= 70 || d.aiPhase === "incident";
    return (
      <motion.button
        key={d.id}
        type="button"
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => openDetail(d.id)}
        className={cn(
          "w-full text-left rounded-xl border p-3.5 transition-all hover:bg-white/[0.04] group",
          critical ? "border-rose-500/35 bg-rose-500/[0.06] shadow-[0_0_24px_rgba(244,63,94,0.08)]" : "border-white/[0.08] bg-white/[0.03]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-mono text-white/40 truncate">{d.path}</p>
            <p className={cn("text-sm font-semibold text-white/95 truncate", compact && "text-[13px]")}>{d.service}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn("text-[9px] uppercase border", phase.className)}>
                {phase.label}
              </Badge>
              <Badge variant="outline" className="text-[9px] border-white/15 text-white/55">
                {shortEnvTag(d.envGroup)}
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] capitalize border", CLOUD_BADGE[d.cloud] ?? "")}>
                <Cloud className="w-3 h-3 mr-0.5 inline opacity-80" />
                {d.cloud}
              </Badge>
              <Badge variant="outline" className="text-[9px] border-white/12 text-white/45">
                <MapPin className="w-3 h-3 mr-0.5 inline opacity-70" />
                {d.identity.region}
              </Badge>
              {!d.isLive ? (
                <Badge variant="outline" className="text-[8px] border-violet-400/25 text-violet-200/90">
                  sample fleet
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-white/40">Priority</p>
            <p className="text-lg font-bold tabular-nums text-amber-200/95">{d.priority}</p>
            <p className="text-[10px] text-white/35">risk {Math.round(d.riskScore)}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
          <span className="truncate">{d.versionLabel}</span>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-white/50" />
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-5 pb-4">
      <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1424] to-[#0a1018] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-300/90" />
              Multi-environment fleet
            </h2>
            <p className="text-[11px] text-white/45 mt-0.5">
              Identity <span className="font-mono text-white/55">{orgId}/{projectId}/…/service/region</span>
            </p>
          </div>
          <div className="flex rounded-lg border border-white/10 p-0.5 bg-black/20">
            <button
              type="button"
              onClick={() => setViewMode("global")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
                viewMode === "global" ? "bg-white/12 text-white" : "text-white/45 hover:text-white/75"
              )}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1" />
              Global
            </button>
            <button
              type="button"
              onClick={() => setViewMode("service")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
                viewMode === "service" ? "bg-white/12 text-white" : "text-white/45 hover:text-white/75"
              )}
            >
              <Boxes className="w-3.5 h-3.5 inline mr-1" />
              By service
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Environment</p>
            <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as typeof envFilter)}>
              <SelectTrigger className="h-9 bg-black/30 border-white/10 text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f141c] border-white/10">
                <SelectItem value="all">All environments</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Region</p>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-9 bg-black/30 border-white/10 text-xs">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f141c] border-white/10">
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "all" ? "All regions" : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Service</p>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-9 bg-black/30 border-white/10 text-xs">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f141c] border-white/10 max-h-56">
                {services.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All services" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Status</p>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DeploymentStatusFilter)}>
              <SelectTrigger className="h-9 bg-black/30 border-white/10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f141c] border-white/10">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="healthy">Healthy / stable</SelectItem>
                <SelectItem value="active">Monitoring / acting</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-300" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/90">AI priority queue</h3>
          <Badge variant="outline" className="text-[9px] border-violet-400/30 text-violet-100/90">
            Risk × urgency
          </Badge>
        </div>
        {loading && !universe.length ? (
          <p className="text-sm text-white/45">Loading fleet…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            <AnimatePresence>
              {priorityQueue.map((d) => (
                <div key={d.id} className="min-w-0">
                  {renderDeploymentCard(d, true)}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {insights.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-amber-300" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/90">Cross-deployment AI insights</h3>
          </div>
          <ul className="space-y-1.5">
            {insights.map((line) => (
              <li key={line} className="text-[12px] text-amber-50/90 leading-snug flex gap-2">
                <span className="text-amber-400/90 mt-0.5">↳</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewMode === "global" ? (
        <div className="space-y-6">
          {(["production", "staging", "development"] as DeploymentEnvGroup[]).map((group) => {
            const items = groupedByEnv.get(group) ?? [];
            if (items.length === 0) return null;
            return (
              <section
                key={group}
                className={cn(
                  "rounded-2xl border bg-[#0B1220]/80 overflow-hidden",
                  ENV_HEADER[group]
                )}
              >
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
                  <h3 className="text-sm font-semibold text-white/90">{envGroupLabel(group)}</h3>
                  <Badge variant="outline" className="text-[10px] border-white/12 text-white/45">
                    {items.length} deployment{items.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  <AnimatePresence>{items.map((d) => renderDeploymentCard(d))}</AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByService.map(([svc, items]) => (
            <section key={svc} className="rounded-2xl border border-white/[0.08] bg-[#0B1220]/90 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-300/80" />
                <h3 className="text-sm font-semibold text-white/90">{svc}</h3>
                <span className="text-[11px] text-white/40">{items.length} region(s)</span>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {items.map((d) => renderDeploymentCard(d))}
              </div>
            </section>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <p className="text-sm text-white/45 text-center py-8">No deployments match the current filters.</p>
      ) : null}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="bg-[#0a0f18] border-white/10 text-white w-[min(480px,100vw)] p-0 flex flex-col">
          {selected ? (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
                <SheetTitle className="text-left text-lg pr-8">{selected.service}</SheetTitle>
                <p className="text-[11px] font-mono text-white/45 break-all mt-1">{selected.path}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge className={cn("text-[9px] border", AI_PHASE[selected.aiPhase].className)}>{AI_PHASE[selected.aiPhase].label}</Badge>
                  <Badge variant="outline" className="text-[9px] border-white/15">
                    {shortEnvTag(selected.envGroup)}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[9px] capitalize border", CLOUD_BADGE[selected.cloud])}>
                    {selected.cloud}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-white/12">
                    {selected.identity.region}
                  </Badge>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-6 pr-3">
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" /> Health
                    </h4>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-white/40">Score</p>
                        <p className="text-2xl font-semibold text-emerald-200/95 tabular-nums">{Math.round(selected.healthPct)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">Rollout</p>
                        <p className="text-sm text-white/85 capitalize">{selected.strategy}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-lg border border-white/10 px-2 py-2">
                        <span className="text-white/40">CPU</span>
                        <span className="float-right text-cyan-200 tabular-nums">{selected.metrics.cpu}%</span>
                      </div>
                      <div className="rounded-lg border border-white/10 px-2 py-2">
                        <span className="text-white/40">Memory</span>
                        <span className="float-right text-cyan-200 tabular-nums">{selected.metrics.memory}%</span>
                      </div>
                      <div className="rounded-lg border border-white/10 px-2 py-2">
                        <span className="text-white/40">Latency</span>
                        <span className="float-right text-cyan-200 tabular-nums">{selected.metrics.latencyMs}ms</span>
                      </div>
                      <div className="rounded-lg border border-white/10 px-2 py-2">
                        <span className="text-white/40">Errors</span>
                        <span className="float-right text-amber-200 tabular-nums">{selected.metrics.errorRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" /> Version
                    </h4>
                    <p className="text-sm text-white/85">{selected.versionLabel}</p>
                    <p className="text-[11px] text-white/45 mt-1">Namespace · {selected.namespace}</p>
                    <p className="text-[11px] text-white/45">Status · {selected.status}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> AI actions
                    </h4>
                    <ul className="space-y-1.5">
                      {selected.aiActions.map((a) => (
                        <li key={a} className="text-[12px] text-white/75 flex gap-2">
                          <Activity className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {selected.correlatedSignal ? (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                      <p className="text-[10px] font-semibold text-amber-200/90 uppercase tracking-wide mb-1">Correlation</p>
                      <p className="text-[12px] text-amber-50/90">{selected.correlatedSignal}</p>
                    </div>
                  ) : null}
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
                      <ListTree className="w-3.5 h-3.5" /> Live logs
                    </h4>
                    {selected.isLive ? (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 space-y-1">
                        {(logs.length
                          ? logs
                          : [{ message: "Waiting for stream events…", ts: new Date().toISOString() }]
                        ).map((row, idx) => (
                          <p key={`log-${idx}`} className="text-[10px] text-white/55 font-mono leading-relaxed">
                            [{new Date(row.ts).toLocaleTimeString()}] {row.message}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/45">
                        Sample fleet row — connect deployments in this workspace for live log streaming.
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <Button variant="outline" className="flex-1 border-white/15" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DeploymentsView;
