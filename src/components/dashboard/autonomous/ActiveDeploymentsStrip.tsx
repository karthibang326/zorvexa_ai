import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes, Cloud, MapPin, Rocket } from "lucide-react";
import { useContextStore } from "@/store/context";
import { getDeploymentHistory } from "@/lib/workflows";
import { buildDeploymentUniverse, sortByAiPriority, type EnrichedDeployment } from "@/lib/deployments-view-model";
import { formatDeploymentPath, formatDeploymentRef, formatDeploymentScopeSubtitle, shortEnvTag } from "@/lib/deployment-identity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASE_DOT: Record<EnrichedDeployment["aiPhase"], string> = {
  monitoring: "bg-sky-400",
  acting: "bg-amber-400",
  stabilized: "bg-emerald-400",
  incident: "bg-rose-500",
};

const CLOUD_ABBR: Record<string, string> = {
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
};

/**
 * Compact fleet ribbon for AI Control Plane — same identity model as Deployments:
 * org/project/env/service/region
 */
export const ActiveDeploymentsStrip: React.FC = () => {
  const { orgId, projectId, envId } = useContextStore();
  const [rows, setRows] = useState<EnrichedDeployment[]>([]);
  const [fleetTotal, setFleetTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const items = await getDeploymentHistory();
      const universe = buildDeploymentUniverse(items, { orgId, projectId, envId });
      setFleetTotal(universe.length);
      const top = [...universe].sort(sortByAiPriority).slice(0, 8);
      setRows(top);
    } catch {
      setRows([]);
      setFleetTotal(0);
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, envId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const hasDemoRows = rows.some((d) => !d.isLive);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-[#0a1520] to-[#0c1018] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-1.5">
            <Boxes className="w-4 h-4 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/90">Active deployments</p>
            <p
              className="text-[10px] text-white/40 truncate"
              title={`Workspace scope: ${orgId} / ${projectId} / ${envId || "—"}`}
            >
              Scope ·{" "}
              <span className="font-mono text-white/50">{formatDeploymentScopeSubtitle(orgId, projectId, envId)}</span>
            </p>
            {hasDemoRows ? (
              <p className="text-[9px] text-white/32 leading-snug mt-0.5 max-w-[min(100%,28rem)]">
                Demo rows use example env slugs in their path (e.g. env-prod); they are not required to match the
                workspace env above.
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-cyan-200/90 hover:text-cyan-100 shrink-0 gap-1"
          asChild
        >
          <Link to="/dashboard?tab=deployments">
            Full fleet
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-[11px] text-white/40 px-1 py-2">Loading deployment scope…</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[min(320px,45vh)] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 -mr-1">
          {rows.map((d) => (
            <div
              key={d.id}
              className={cn(
                "w-full rounded-lg border px-2.5 py-2 text-left shrink-0",
                d.aiPhase === "incident" || d.riskScore >= 70
                  ? "border-rose-500/35 bg-rose-950/25"
                  : "border-white/[0.08] bg-black/25"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-white/95 truncate leading-tight">{d.service}</p>
                <span className="flex items-center gap-0.5 shrink-0" title={d.aiPhase}>
                  <span className={cn("h-2 w-2 rounded-full", PHASE_DOT[d.aiPhase])} />
                </span>
              </div>
              <p
                className="text-[9px] font-mono text-white/35 truncate mt-1"
                title={formatDeploymentPath(d.identity)}
              >
                {formatDeploymentRef(d.id)}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <Badge variant="outline" className="text-[8px] h-5 px-1.5 border-white/12 text-white/65">
                  {shortEnvTag(d.envGroup)}
                </Badge>
                <Badge variant="outline" className="text-[8px] h-5 px-1.5 border-white/12 text-white/55">
                  <MapPin className="w-2.5 h-2.5 mr-0.5 opacity-70" />
                  {d.identity.region}
                </Badge>
                <Badge variant="outline" className="text-[8px] h-5 px-1.5 border-sky-400/20 text-sky-200/90 capitalize">
                  <Cloud className="w-2.5 h-2.5 mr-0.5 opacity-70" />
                  {CLOUD_ABBR[d.cloud] ?? d.cloud}
                </Badge>
                {!d.isLive ? (
                  <Badge
                    variant="outline"
                    className="text-[8px] h-5 px-1 border-violet-400/25 text-violet-200/80"
                    title="Synthetic row for empty or offline workspace — not from live deploy API"
                  >
                    demo
                  </Badge>
                ) : null}
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 tabular-nums">
                AI priority {d.priority} · {d.versionLabel}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-white/35 mt-2 px-0.5 flex items-center gap-1.5">
        <Rocket className="w-3 h-3 opacity-50" />
        {fleetTotal} deployment{fleetTotal === 1 ? "" : "s"} in fleet view — switch context (org/project/env) to change scope.
      </p>
    </div>
  );
};
