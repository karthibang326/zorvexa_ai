import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getIncidentHistory, type IncidentItem } from "@/lib/sre";
import { getOrchestratorState, type OrchestratorAction } from "@/lib/ai-orchestrator";
import { isDemoModeEnabled } from "@/lib/demo-mode";

const DEMO_INCIDENTS: IncidentItem[] = [
  {
    id: "demo-inc-1",
    issue: "API latency spike",
    status: "RESOLVED",
    rootCause: "Burst traffic saturation",
    action: "Auto-scaled + rerouted",
    source: "metrics_anomaly",
    detectedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    success: true,
    confidenceScore: 0.93,
  },
  {
    id: "demo-inc-2",
    issue: "Cost anomaly in worker-pool",
    status: "RESOLVED",
    rootCause: "Idle high-cost nodes",
    action: "Rightsized cluster",
    source: "metrics_anomaly",
    detectedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    success: true,
    confidenceScore: 0.9,
  },
];

function shouldBackfillDemo(): boolean {
  return isDemoModeEnabled() || import.meta.env.DEV;
}

/** When /incident/history is empty, show orchestrator work as timeline rows so the panel matches “Auto-Resolved Actions”. */
function incidentsFromOrchestratorActions(actions: OrchestratorAction[]): IncidentItem[] {
  return actions.slice(0, 14).map((a, i) => {
    const resolved = a.status === "executed";
    return {
      id: `orch-${a.at}-${i}`,
      source: "orchestrator",
      issue: `${a.type} · ${a.module}`,
      rootCause: a.details?.trim() ? a.details : `Autonomous loop · ${a.module}`,
      action: `${a.type} (${a.status})`,
      status: resolved ? "RESOLVED" : "OPEN",
      detectedAt: a.at,
      resolvedAt: resolved ? a.at : undefined,
      success: resolved,
    };
  });
}

function buildTimelineItems(
  apiItems: IncidentItem[],
  orchActions: OrchestratorAction[]
): IncidentItem[] {
  if (apiItems.length) return apiItems;
  if (orchActions.length) return incidentsFromOrchestratorActions(orchActions);
  if (shouldBackfillDemo()) return DEMO_INCIDENTS;
  return [];
}

const IncidentsView: React.FC = () => {
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [actions, setActions] = useState<OrchestratorAction[]>([]);

  useEffect(() => {
    void (async () => {
      let incidents: Awaited<ReturnType<typeof getIncidentHistory>> = { items: [], stats: { total: 0, resolved: 0, successRate: 0 } };
      try {
        incidents = await getIncidentHistory();
      } catch {
        /* keep empty */
      }

      let state: Awaited<ReturnType<typeof getOrchestratorState>> | null = null;
      try {
        state = await getOrchestratorState();
      } catch {
        state = null;
      }

      const orchActions = state?.actions ?? [];
      setActions(orchActions);
      setItems(buildTimelineItems(incidents.items ?? [], orchActions));
    })();
  }, []);

  const resolved = items.filter((i) => i.status === "RESOLVED").length;
  const open = items.length - resolved;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] text-white/45">Auto Detected</p>
          <p className="text-2xl font-semibold text-white/90 mt-1">{items.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] text-white/45">Auto Resolved</p>
          <p className="text-2xl font-semibold text-emerald-300 mt-1">{resolved}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
          <p className="text-[10px] text-white/45">Active</p>
          <p className="text-2xl font-semibold text-amber-300 mt-1">{open}</p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
        <h3 className="text-xs font-semibold text-white/60 mb-3">Auto Incident Timeline</h3>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-white/40 py-3">
              No incident records yet. The timeline fills from <span className="text-white/55">/incident/history</span>, or from
              the AI orchestrator when that API is empty. Run the control loop or connect incident sources.
            </p>
          ) : null}
          {items.slice(0, 10).map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 p-3">
              <p className="text-sm text-white/85">{item.issue}</p>
              <p className="text-xs text-white/50 mt-1">Cause: {item.rootCause ?? "AI correlation in progress"}</p>
              <p className="text-xs text-white/50">Action taken: {item.action ?? "Autonomous remediation executed"}</p>
              <p className="text-xs mt-1 inline-flex items-center gap-1">
                {item.status === "RESOLVED" ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-300" />
                )}
                <span className="text-white/70">{item.status}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0B1220] p-4">
        <h3 className="text-xs font-semibold text-white/60 mb-3">Auto-Resolved Actions</h3>
        <div className="space-y-2">
          {actions.slice(0, 12).map((action, idx) => (
            <p key={`${action.at}-${idx}`} className="text-xs text-white/75">
              <span className="text-white/35">{new Date(action.at).toLocaleTimeString()}</span> · {action.type} · {action.status}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
};

export default IncidentsView;

