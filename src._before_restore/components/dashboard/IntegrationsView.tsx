import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Clock3, Github, GitBranch, GitlabIcon, Link2, PauseCircle, PlayCircle, RefreshCw, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleHeader from "./ModuleHeader";
import { listIntegrationRepos, type IntegrationRepo } from "@/lib/integrations";
import { toast } from "sonner";
import { postAutoDeploy, getDeploymentHistory, postRollbackDeploy } from "@/lib/workflows";
import { postOptimizeAllSystems } from "@/lib/ai-ceo";
import { withContextQuery } from "@/lib/context";

type RiskLevel = "low" | "medium" | "high";
type PipelineState = "success" | "failure" | "running";
type RepoModel = IntegrationRepo & {
  lastDeployAt: string;
  pipeline: PipelineState;
  health: number;
  aiInsight: string;
  aiAction: string;
  risk: RiskLevel;
  deployTargetId: string;
};

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  return `${root}/api`;
}

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  high: "text-red-300 border-red-500/30 bg-red-500/10",
};

const IntegrationsView: React.FC = () => {
  const [repos, setRepos] = useState<RepoModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState(true);
  const [gitlabConnected, setGitlabConnected] = useState(true);
  const [bitbucketConnected, setBitbucketConnected] = useState(false);
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [approvalMode, setApprovalMode] = useState(true);
  const [rollbackSafety, setRollbackSafety] = useState(true);
  const [maxDeployPerHour, setMaxDeployPerHour] = useState(6);
  const [events, setEvents] = useState<Array<{ ts: string; type: string; message: string }>>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const items = await listIntegrationRepos();
      const enriched: RepoModel[] = items.map((r, i) => {
        const risk: RiskLevel = i % 3 === 0 ? "high" : i % 2 === 0 ? "medium" : "low";
        const pipeline: PipelineState = i % 3 === 0 ? "failure" : i % 2 === 0 ? "running" : "success";
        const lastDeployAt = new Date(Date.now() - (i + 1) * 1000 * 60 * 23).toISOString();
        return {
          ...r,
          risk,
          pipeline,
          health: risk === "high" ? 62 : risk === "medium" ? 81 : 95,
          lastDeployAt,
          aiInsight:
            risk === "high"
              ? "Deployment failure risk elevated due to flaky tests and error drift."
              : risk === "medium"
                ? "Latency may increase after latest commit if pipeline saturates runners."
                : "Pipeline healthy with stable release behavior and low incident probability.",
          aiAction:
            risk === "high"
              ? "Enable staged rollout + rollback guard"
              : risk === "medium"
                ? "Scale CI workers and run performance checks"
                : "Auto deploy remains active",
          deployTargetId: `${r.provider}-${r.account}-${r.name}`,
        };
      });
      setRepos(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRepos();
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/ai-ceo/stream`));
    const onAny = (ev: MessageEvent<string>) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string; ts?: string; payload?: Record<string, unknown> };
        const rawType = String(data.type ?? "event");
        const mapped = rawType.includes("deploy")
          ? "deployments"
          : rawType.includes("incident") || rawType.includes("failed")
            ? "failures"
            : rawType.includes("optimize")
              ? "commits"
              : "deployments";
        const msg = typeof data.payload?.details === "string" ? data.payload.details : rawType;
        setEvents((prev) => [{ ts: data.ts ?? new Date().toISOString(), type: mapped, message: msg }, ...prev].slice(0, 60));
      } catch {
        // ignore
      }
    };
    es.onmessage = onAny;
    es.addEventListener("ai_ceo_decision", onAny as EventListener);
    return () => es.close();
  }, []);

  const summary = useMemo(() => {
    const total = repos.length;
    const activePipelines = repos.filter((r) => r.pipeline === "running").length;
    const risks = repos.filter((r) => r.risk !== "low").length;
    const confidence = total === 0 ? 100 : Math.round(repos.reduce((a, r) => a + r.health, 0) / total);
    return { total, activePipelines, risks, confidence };
  }, [repos]);

  const runAction = async (repo: RepoModel, action: "deploy" | "rollback" | "pause") => {
    setActionBusy(`${repo.id}-${action}`);
    try {
      if (action === "deploy") {
        await postAutoDeploy({
          repositoryId: repo.deployTargetId,
          serviceName: repo.name,
          branch: repo.defaultBranch || "main",
          strategy: "rolling",
          namespace: "prod",
          autoDeployOnPush: autoDeploy,
        });
        toast.success(`Deploy started for ${repo.name}`);
        setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, pipeline: "running", aiAction: "Deploy in progress" } : r)));
      } else if (action === "rollback") {
        const history = await getDeploymentHistory();
        const target = history.find((x) => String(x.status).toUpperCase().includes("SUCCEEDED")) ?? history[0];
        if (!target) throw new Error("No deployment history available");
        await postRollbackDeploy(target.id);
        toast.success(`Rollback triggered for ${repo.name}`);
        setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, aiAction: "Rollback triggered", risk: "medium" } : r)));
      } else {
        toast.info(`Pipeline paused for ${repo.name}`);
        setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, pipeline: "failure", aiAction: "Pipeline paused by operator" } : r)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ModuleHeader
        title="Integrations AI Control"
        subtitle="Repository intelligence, autonomous deployment control, and pipeline safety."
        actions={
          <Button onClick={() => void loadRepos()} className="h-9 text-[10px] font-black uppercase tracking-widest">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Connected Repos</p><p className="mt-1 text-lg font-black text-white">{summary.total}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Active Pipelines</p><p className="mt-1 text-lg font-black text-indigo-300">{summary.activePipelines}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">Risks Detected</p><p className="mt-1 text-lg font-black text-amber-300">{summary.risks}</p></div>
          <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] uppercase tracking-widest text-white/45">AI Confidence</p><p className="mt-1 text-lg font-black text-blue-300">{summary.confidence}%</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-3 flex flex-wrap items-center gap-2">
        <Button className="h-9 rounded-xl text-[10px] uppercase tracking-widest"><Link2 className="w-4 h-4 mr-2" /> Connect Provider</Button>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 h-9 text-[10px] uppercase tracking-widest text-white/70">Auto Deploy<input type="checkbox" className="accent-indigo-500" checked={autoDeploy} onChange={(e) => setAutoDeploy(e.target.checked)} />{autoDeploy ? "ON" : "OFF"}</label>
        <Button variant="outline" onClick={() => void loadRepos()} className="h-9 rounded-xl text-[10px] uppercase tracking-widest"><RefreshCw className="w-4 h-4 mr-2" /> Scan Repositories</Button>
        <Button variant="outline" onClick={() => void postOptimizeAllSystems().then(() => toast.success("Pipeline optimizations queued")).catch(() => toast.error("Failed to optimize pipelines"))} className="h-9 rounded-xl text-[10px] uppercase tracking-widest"><Sparkles className="w-4 h-4 mr-2" /> Optimize Pipelines</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={githubConnected ? "outline" : "default"} className="h-8 text-[10px]" onClick={() => { setGithubConnected((v) => !v); toast.success(!githubConnected ? "GitHub connected" : "GitHub disconnected"); }}><Github className="w-3.5 h-3.5 mr-1.5" /> GH</Button>
          <Button variant={gitlabConnected ? "outline" : "default"} className="h-8 text-[10px]" onClick={() => { setGitlabConnected((v) => !v); toast.success(!gitlabConnected ? "GitLab connected" : "GitLab disconnected"); }}><GitlabIcon className="w-3.5 h-3.5 mr-1.5" /> GL</Button>
          <Button variant={bitbucketConnected ? "outline" : "default"} className="h-8 text-[10px]" onClick={() => { setBitbucketConnected((v) => !v); toast.success(!bitbucketConnected ? "Bitbucket connected" : "Bitbucket disconnected"); }}><GitBranch className="w-3.5 h-3.5 mr-1.5" /> BB</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {repos.map((repo) => (
          <div key={repo.id} className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">{repo.account}/{repo.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/45">{repo.language || "unknown"} · {repo.defaultBranch}</p>
              </div>
              <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border ${RISK_CLASS[repo.risk]}`}>{repo.risk}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 p-2"><p className="text-xs font-black">{new Date(repo.lastDeployAt).toLocaleTimeString()}</p><p className="text-[9px] text-white/45">last deploy</p></div>
              <div className="rounded-lg border border-white/10 p-2"><p className={`text-xs font-black ${repo.pipeline === "success" ? "text-emerald-300" : repo.pipeline === "failure" ? "text-red-300" : "text-amber-300"}`}>{repo.pipeline}</p><p className="text-[9px] text-white/45">pipeline</p></div>
              <div className="rounded-lg border border-white/10 p-2"><p className="text-xs font-black text-blue-300">{repo.health}%</p><p className="text-[9px] text-white/45">health</p></div>
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2"><p className="text-[9px] uppercase tracking-widest text-indigo-200">AI Insight</p><p className="text-xs text-white/85 mt-1">{repo.aiInsight}</p></div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2"><p className="text-[9px] uppercase tracking-widest text-amber-200">AI Action</p><p className="text-xs text-white/85 mt-1">{repo.aiAction}</p></div>

            <div className="space-y-1 text-[11px] text-white/75">
              <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Deployment failure risk: {repo.risk === "high" ? "78%" : repo.risk === "medium" ? "44%" : "18%"}</div>
              <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 text-blue-300" /> Latency increase after latest commit: {repo.risk === "high" ? "+31ms" : "+7ms"}</div>
              <div className="flex items-center gap-2"><Bot className="w-3.5 h-3.5 text-emerald-300" /> Cost impact of new release: {repo.risk === "high" ? "+$42/day" : "+$8/day"}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={() => void runAction(repo, "deploy")} disabled={actionBusy !== null} className="h-8 px-3 text-[10px] uppercase tracking-widest"><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Deploy</Button>
              <Button variant="outline" onClick={() => void runAction(repo, "rollback")} disabled={actionBusy !== null} className="h-8 px-3 text-[10px] uppercase tracking-widest"><Undo2 className="w-3.5 h-3.5 mr-1.5" /> Rollback</Button>
              <Button variant="outline" onClick={() => void runAction(repo, "pause")} disabled={actionBusy !== null} className="h-8 px-3 text-[10px] uppercase tracking-widest border-red-500/30 text-red-300"><PauseCircle className="w-3.5 h-3.5 mr-1.5" /> Pause</Button>
            </div>
          </div>
        ))}
      </div>

      {repos.length === 0 && !loading && <div className="rounded-2xl border border-white/10 bg-[#0B1220] py-12 text-center text-white/35 text-[11px]">No repositories connected</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">Safety</p></div>
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-xs">Approval mode <input className="accent-indigo-500" type="checkbox" checked={approvalMode} onChange={(e) => setApprovalMode(e.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-xs">Rollback safety <input className="accent-indigo-500" type="checkbox" checked={rollbackSafety} onChange={(e) => setRollbackSafety(e.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-xs">Max deployments/hour <input type="number" min={1} max={20} value={maxDeployPerHour} onChange={(e) => setMaxDeployPerHour(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-14 rounded border border-white/10 bg-[#111827] px-2 py-1 text-xs" /></label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#060a12] p-4">
          <div className="flex items-center gap-2 mb-3"><RefreshCw className="w-4 h-4 text-indigo-300" /><p className="text-[10px] uppercase tracking-widest text-white/45">Real-Time Events</p></div>
          <div className="max-h-[210px] overflow-y-auto space-y-1 font-mono text-[11px]">
            {events.length === 0 ? (
              <p className="text-white/35">Waiting for deployments/failures/commits events...</p>
            ) : (
              events.map((e, i) => (
                <div key={`${e.ts}-${i}`} className="grid grid-cols-[90px_90px_1fr] gap-2">
                  <span className="text-white/35">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className={`uppercase ${e.type === "failures" ? "text-red-300" : e.type === "commits" ? "text-blue-300" : "text-emerald-300"}`}>{e.type}</span>
                  <span className="text-white/80">{e.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.18em] text-white/35 border-t border-white/10 pt-3">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />AI Repo Intelligence Active</span>
        <span>Pipelines: {summary.activePipelines}</span>
        <span>Risked repos: {summary.risks}</span>
        <span className="ml-auto">Deploy budget/hr: {maxDeployPerHour}</span>
      </div>
    </div>
  );
};

export default IntegrationsView;

