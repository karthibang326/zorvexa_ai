import React, { useCallback, useEffect, useState } from "react";
import { Activity, FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useContextStore } from "@/store/context";
import { ApiClientError } from "@/lib/api";
import {
  getAstraOpsApprovals,
  getAstraOpsAuditLog,
  getAstraOpsAutonomy,
  getAstraOpsImpact,
  getAstraOpsInfraStatus,
  getAstraOpsLoopStats,
  postAstraOpsIngest,
  postAstraOpsLoopTick,
  postApproveDecision,
  postRejectDecision,
  type AstraDecision,
  type AstraOpsAuditEntry,
} from "@/lib/astraOpsApi";

const AstraOpsPipelineView: React.FC = () => {
  const { envId } = useContextStore();
  const [envIdInput, setEnvIdInput] = useState(envId || "");
  const [name, setName] = useState("payments-api");
  const [cpu, setCpu] = useState("92");
  const [memory, setMemory] = useState("70");
  const [cost, setCost] = useState("500");
  const [ingesting, setIngesting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [decisions, setDecisions] = useState<AstraDecision[]>([]);
  const [auditEntries, setAuditEntries] = useState<AstraOpsAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [autonomy, setAutonomy] = useState<string>("—");
  const [infra, setInfra] = useState<{ k?: boolean; aws?: boolean; gcp?: boolean }>({});
  const [impact, setImpact] = useState<{ actions?: number; incidents?: number }>({});
  const [loopStats, setLoopStats] = useState<string>("—");
  const [tickLoading, setTickLoading] = useState(false);

  useEffect(() => {
    if (envId && !envIdInput) setEnvIdInput(envId);
  }, [envId, envIdInput]);

  const loadApprovals = useCallback(async () => {
    setLoadingList(true);
    try {
      const out = await getAstraOpsApprovals();
      setDecisions(out.decisions ?? []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load approvals";
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadOpsMeta = useCallback(async () => {
    try {
      const [a, i, im, lp] = await Promise.all([
        getAstraOpsAutonomy(),
        getAstraOpsInfraStatus(),
        getAstraOpsImpact(),
        getAstraOpsLoopStats(),
      ]);
      const p = a.policies;
      setAutonomy(
        `${p.mode} · sim=${p.simulation ? "on" : "off"} · approval=${p.approvalRequired ? "on" : "off"}`
      );
      setInfra({
        k: i.kubernetes.ok,
        aws: i.aws.ok,
        gcp: i.gcp.ok,
      });
      setImpact({
        actions: im.estimatedAiActions,
        incidents: im.incidentsAutoResolved,
      });
      const s = lp.stats;
      setLoopStats(
        s.at
          ? `${s.observed} workloads · ${s.anomalies} anomalies · ${s.enqueued} enqueued · ${new Date(s.at).toLocaleTimeString()}`
          : "No tick yet"
      );
    } catch {
      // optional panel
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const out = await getAstraOpsAuditLog(40);
      setAuditEntries(out.entries ?? []);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiClientError
          ? String((e.details as { details?: string; error?: string })?.details ?? (e.details as { error?: string })?.error ?? e.message)
          : "Failed to load audit log";
      toast.error(msg);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
    void loadAudit();
    void loadOpsMeta();
    const t = window.setInterval(() => {
      void loadApprovals();
      void loadAudit();
      void loadOpsMeta();
    }, 15000);
    return () => window.clearInterval(t);
  }, [loadApprovals, loadAudit, loadOpsMeta]);

  const onLoopTick = async () => {
    setTickLoading(true);
    try {
      const out = await postAstraOpsLoopTick();
      toast.success(`Loop tick · ${out.enqueued} enqueued`);
      await loadOpsMeta();
    } catch {
      toast.error("Loop tick failed (operator role required)");
    } finally {
      setTickLoading(false);
    }
  };

  const onIngest = async () => {
    setIngesting(true);
    try {
      const out = await postAstraOpsIngest({
        env_id: envIdInput.trim(),
        name: name.trim(),
        cpu: Number(cpu),
        memory: Number(memory),
        cost: Number(cost),
      });
      toast.success(`Ingested · workload ${out.workload?.id?.slice(0, 8) ?? "…"}`);
      await loadApprovals();
      await loadAudit();
    } catch (e: unknown) {
      const status = e && typeof e === "object" && "response" in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null;
      toast.error(status || (e instanceof Error ? e.message : "Ingest failed"));
    } finally {
      setIngesting(false);
    }
  };

  const onApprove = async (id: string) => {
    try {
      await postApproveDecision(id);
      toast.success("Approved — execution queued");
      await loadApprovals();
      await loadAudit();
    } catch (e: unknown) {
      const status = e && typeof e === "object" && "response" in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null;
      toast.error(status || "Approve failed");
    }
  };

  const onReject = async (id: string) => {
    try {
      await postRejectDecision(id);
      toast.success("Decision rejected");
      await loadApprovals();
      await loadAudit();
    } catch (e: unknown) {
      const status = e && typeof e === "object" && "response" in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null;
      toast.error(status || "Reject failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-white/[0.05] to-violet-950/20 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/90 tracking-tight">Zorvexa autonomous loop</h3>
        <p className="text-xs text-white/45 max-w-3xl leading-relaxed">
          Backend loop: <span className="text-white/70">OBSERVE → DETECT → DECIDE → ACT → VERIFY → LEARN</span>. Set{" "}
          <code className="text-cyan-200/80">ASTRA_AUTONOMY_MODE=simulation|assisted|autonomous</code> and{" "}
          <code className="text-cyan-200/80">ASTRA_CONTROL_LOOP_ENABLED=true</code> for continuous enqueue.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1018]/80 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Autonomy</p>
            <p className="text-white/80 leading-snug">{autonomy}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1018]/80 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Infra connectivity</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={infra.k ? "default" : "secondary"} className="text-[10px]">
                K8s {infra.k ? "✓" : "✗"}
              </Badge>
              <Badge variant={infra.aws ? "default" : "secondary"} className="text-[10px]">
                AWS {infra.aws ? "✓" : "✗"}
              </Badge>
              <Badge variant={infra.gcp ? "default" : "secondary"} className="text-[10px]">
                GCP {infra.gcp ? "✓" : "✗"}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1018]/80 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Impact (24h)</p>
            <p className="text-white/80">
              AI actions ~{impact.actions ?? "—"} · auto-resolved ~{impact.incidents ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] text-white/50 flex-1 min-w-[200px]">{loopStats}</p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15"
            disabled={tickLoading}
            onClick={() => void onLoopTick()}
          >
            {tickLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span className="ml-1">Run control-loop tick</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-2 text-white/90">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Ingest metrics (Observe → AI → Executor)</h3>
        </div>
        <p className="text-xs text-white/45 leading-relaxed max-w-2xl">
          Posts to <code className="text-cyan-200/90">POST /api/astra-ops/ingest</code> (admin/operator only). Requires a valid{" "}
          <code className="text-white/70">env_id</code> in Postgres. Approvals and audit require appropriate roles; set{" "}
          <code className="text-white/70">ASTRA_APPROVAL_ADMIN_ONLY=true</code> so only owners/admins may approve.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40">env_id (UUID)</label>
            <Input
              value={envIdInput}
              onChange={(e) => setEnvIdInput(e.target.value)}
              placeholder="environment uuid"
              className="bg-[#0d1018] border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Workload name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0d1018] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40">CPU %</label>
            <Input value={cpu} onChange={(e) => setCpu(e.target.value)} className="bg-[#0d1018] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Memory %</label>
            <Input value={memory} onChange={(e) => setMemory(e.target.value)} className="bg-[#0d1018] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Cost</label>
            <Input value={cost} onChange={(e) => setCost(e.target.value)} className="bg-[#0d1018] border-white/10" />
          </div>
        </div>
        <Button
          onClick={() => void onIngest()}
          disabled={ingesting || !envIdInput.trim()}
          className="bg-gradient-to-br from-[#3b66f5] to-[#6b46ef] text-white"
        >
          {ingesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Send ingest
        </Button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-white/90">
            <ShieldCheck className="w-5 h-5 text-emerald-300/90" />
            <h3 className="text-sm font-semibold tracking-tight">Pending approvals</h3>
            <Badge variant="secondary" className="text-[10px]">
              {decisions.length}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadApprovals()} disabled={loadingList} className="border-white/15">
            {loadingList ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {decisions.length === 0 ? (
          <p className="text-sm text-white/40">No decisions awaiting approval.</p>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0d1018]/80 px-4 py-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-mono text-white/50 truncate">{d.id}</p>
                  <p className="text-sm text-white/85">
                    <span className="text-primary font-medium">{d.action ?? "—"}</span>
                    <span className="text-white/40"> · </span>
                    {d.reason ?? "—"}
                  </p>
                  <p className="text-[11px] text-white/45">
                    confidence {d.confidence != null ? (d.confidence * 100).toFixed(0) : "—"}%
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => void onReject(d.id)}>
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600/90 hover:bg-emerald-600 text-white"
                    onClick={() => void onApprove(d.id)}
                  >
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-white/90">
            <FileText className="w-5 h-5 text-sky-300/90" />
            <h3 className="text-sm font-semibold tracking-tight">Audit log</h3>
            <span className="text-[10px] text-white/35 uppercase tracking-wider">org-scoped · immutable append</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadAudit()} disabled={loadingAudit} className="border-white/15">
            {loadingAudit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
        {auditEntries.length === 0 ? (
          <p className="text-sm text-white/40">No audit entries yet (ingest or approve to create records).</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-[11px] text-white/80">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/45 uppercase tracking-wider">
                  <th className="p-2 font-medium">Time</th>
                  <th className="p-2 font-medium">Event</th>
                  <th className="p-2 font-medium">Actor</th>
                  <th className="p-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-2 whitespace-nowrap text-white/50">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-2 font-medium text-cyan-200/90">{a.event}</td>
                    <td className="p-2">
                      <span className="text-white/70">{a.actor_email ?? a.actor_id ?? "—"}</span>
                      <span className="text-white/35"> · {a.actor_role ?? "—"}</span>
                    </td>
                    <td className="p-2 font-mono text-[10px] text-white/45 truncate max-w-[180px]">{a.decision_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AstraOpsPipelineView;
