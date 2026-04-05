import React, { useEffect, useState } from "react";
import { ArrowRight, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hybridBrainApi, type WorkloadMigration } from "@/lib/hybrid";
import { getOrchestratorState, type OrchestratorDecision, type OrchestratorAction } from "@/lib/ai-orchestrator";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { getAIEmptyStateCopy } from "@/lib/ai-empty-state";

const DEMO_WORKLOAD_DECISIONS: OrchestratorDecision[] = [
  {
    module: "workload-placement",
    reason: "Latency improved by moving checkout workloads to eu-west.",
    confidence: 0.94,
    impact: "p95 latency down 32ms",
    at: new Date().toISOString(),
    orgId: "org-demo",
    projectId: "proj-demo",
    environment: "env-demo",
    risk: "low",
    simulation: "traffic replay validated",
  },
  {
    module: "workload-placement",
    reason: "Cost optimization moved async jobs to lower-cost region.",
    confidence: 0.91,
    impact: "Daily cost down 11%",
    at: new Date().toISOString(),
    orgId: "org-demo",
    projectId: "proj-demo",
    environment: "env-demo",
    risk: "medium",
    simulation: "cost simulator passed",
  },
];

const DEMO_PLACEMENT_ACTIONS: OrchestratorAction[] = [
  { module: "workload-placement", type: "optimize_placement", status: "executed", at: new Date().toISOString() },
];

function shouldBackfillDemo(): boolean {
  return isDemoModeEnabled() || import.meta.env.DEV;
}

const WorkloadLocationView: React.FC = () => {
  const empty = getAIEmptyStateCopy();
  const [decisions, setDecisions] = useState<OrchestratorDecision[]>([]);
  const [actions, setActions] = useState<OrchestratorAction[]>([]);
  const [migrations, setMigrations] = useState<WorkloadMigration[]>([]);
  useEffect(() => {
    void (async () => {
      let state: Awaited<ReturnType<typeof getOrchestratorState>> | null = null;
      try {
        state = await getOrchestratorState();
      } catch {
        state = null;
      }

      let migrationRows: WorkloadMigration[] = [];
      try {
        const mig = await hybridBrainApi.migrations(20);
        migrationRows = mig.migrations ?? [];
      } catch {
        migrationRows = [];
      }

      const liveDecisions = (state?.decisions ?? []).filter((d) => d.module === "workload-placement");
      const useDemoDecisions = !liveDecisions.length && shouldBackfillDemo();
      setDecisions(useDemoDecisions ? DEMO_WORKLOAD_DECISIONS : liveDecisions);
      setActions(
        useDemoDecisions
          ? DEMO_PLACEMENT_ACTIONS
          : (state?.actions ?? []).filter((a) => a.module === "workload-placement")
      );
      setMigrations(migrationRows);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
        <h3 className="text-xs font-semibold text-white/60">AI Decisions Per Workload</h3>
        <div className="mt-3 space-y-3">
          {decisions.length === 0 ? (
            <p className="text-sm text-white/40 py-2">
              No workload-placement decisions yet. Enable demo mode, run the AI orchestrator, or connect cloud — in local dev,
              sample rows appear when the API returns empty.
            </p>
          ) : null}
          {decisions.slice(0, 8).map((d, i) => {
            const action = actions.find((a) => a.at >= d.at);
            return (
              <div key={`${d.at}-${i}`} className="rounded-lg border border-white/10 p-3">
                <p className="text-sm text-white/85">{d.impact}</p>
                <p className="text-xs text-white/50 mt-1"><span className="text-white/35">Why:</span> {d.reason}</p>
                <p className="text-xs text-white/50"><span className="text-white/35">Next predicted action:</span> {action?.type ?? "optimize_placement"}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">Confidence: {Math.round(d.confidence * 100)}%</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#0B1220] p-5">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Recent Placement Moves</h3>
        <div className="space-y-2">
          {migrations.slice(0, 8).map((m) => (
            <div key={m.migrationId} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <Brain className="w-3.5 h-3.5 text-white/35" />
              <span className="text-xs text-white/80">{m.workloadId}</span>
              <ArrowRight className="w-3 h-3 text-white/25" />
              <span className="text-xs text-white/70">{m.toProvider}/{m.toEnvironment}</span>
              <span className="text-[10px] text-white/40 ml-auto">{m.reason}</span>
            </div>
          ))}
          {migrations.length === 0 && (
            <div className="text-center py-4 text-white/35">
              <p className="text-xs">{empty.title}</p>
              <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkloadLocationView;
