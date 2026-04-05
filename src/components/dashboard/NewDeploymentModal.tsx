import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Rocket } from "lucide-react";
import { listIntegrationRepos, type IntegrationRepo } from "@/lib/integrations";
import { getDeployStatus } from "@/lib/workflows";
import { toast } from "sonner";

interface NewDeploymentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading?: boolean;
  onConfirm: (payload: {
    repositoryId: string;
    branch: string;
    serviceName: string;
    rolloutName: string;
    namespace: string;
    strategy: "canary" | "rolling";
    autoDeployOnPush: boolean;
  }) => Promise<{ deploymentId: string; status: string; message?: string }>;
}

type DeployStage = "idle" | "building" | "deploying" | "running" | "success" | "failed";

const STAGE_LABELS: Record<"building" | "deploying" | "running", string> = {
  building: "Building",
  deploying: "Deploying",
  running: "Running",
};

const POLL_MS = 2000;
const MAX_POLLS = 30;

function statusToStage(status: string): DeployStage {
  const s = status.toUpperCase();
  if (s.includes("FAILED") || s.includes("ERROR") || s.includes("DEGRADED")) return "failed";
  if (s.includes("SUCCEEDED") || s.includes("HEALTHY") || s.includes("DEPLOYED")) return "success";
  if (s.includes("RUNNING")) return "running";
  if (s.includes("PATCHED") || s.includes("STARTED")) return "deploying";
  return "building";
}

const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({ open, onOpenChange, loading = false, onConfirm }) => {
  const [repos, setRepos] = useState<IntegrationRepo[]>([]);
  const [repoId, setRepoId] = useState("");
  const [branch, setBranch] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [rolloutName, setRolloutName] = useState("astraops-rollout");
  const [namespace, setNamespace] = useState("prod");
  const [strategy, setStrategy] = useState<"canary" | "rolling">("rolling");
  const [autoDeployOnPush, setAutoDeployOnPush] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Preparing defaults...");
  const [stage, setStage] = useState<DeployStage>("idle");
  const [started, setStarted] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const selectedRepo = useMemo(() => repos.find((r) => r.id === repoId) ?? null, [repoId, repos]);
  const detectedLanguage = selectedRepo?.language ?? "Unknown";
  const buildSuggestion = useMemo(() => {
    const lang = detectedLanguage.toLowerCase();
    if (lang.includes("node") || lang.includes("ts")) return "npm ci && npm run build";
    if (lang.includes("python")) return "pip install -r requirements.txt";
    if (lang.includes("go")) return "go build ./...";
    return "auto-detect build pipeline";
  }, [detectedLanguage]);

  const canSubmit = useMemo(
    () =>
      repoId.trim().length > 0 &&
      branch.trim().length > 0 &&
      serviceName.trim().length > 0 &&
      rolloutName.trim().length > 0 &&
      namespace.trim().length > 0,
    [repoId, branch, serviceName, rolloutName, namespace]
  );

  const launchDeploy = async () => {
    if (!canSubmit || localLoading || loading) return;
    setLocalLoading(true);
    setStage("building");
    setStatusMessage("Resolving configuration...");
    try {
      const startedDeploy = await onConfirm({
        repositoryId: repoId,
        branch,
        serviceName: serviceName.trim(),
        rolloutName: rolloutName.trim(),
        namespace: namespace.trim(),
        strategy,
        autoDeployOnPush,
      });

      setDeploymentId(startedDeploy.deploymentId);
      setStatusMessage(startedDeploy.message ?? "Deployment queued");
      setStage(statusToStage(startedDeploy.status));

      for (let i = 0; i < MAX_POLLS; i += 1) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const st = await getDeployStatus(startedDeploy.deploymentId);
        const mapped = statusToStage(st.status);
        setStage(mapped);
        setStatusMessage(st.message ?? st.status);
        if (mapped === "success") {
          toast.success("Deployment is live");
          return;
        }
        if (mapped === "failed") {
          toast.error(st.message ?? "Deployment failed");
          return;
        }
      }

      setStage("failed");
      setStatusMessage("Timed out waiting for deployment health");
    } catch (e) {
      setStage("failed");
      setStatusMessage(e instanceof Error ? e.message : "Deployment failed");
      toast.error(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setRepoId("");
    setBranch("");
    setServiceName("");
    setRolloutName("astraops-rollout");
    setNamespace("prod");
    setStrategy("rolling");
    setAutoDeployOnPush(true);
    setAdvancedOpen(false);
    setDeploymentId(null);
    setStatusMessage("Preparing defaults...");
    setStage("idle");
    setStarted(false);

    void listIntegrationRepos().then((items) => {
      setRepos(items);
      const first = items[0];
      if (!first) return;
      setRepoId(first.id);
      setBranch(first.defaultBranch || "main");
      setServiceName(first.name);
      setRolloutName(`astraops-${first.name}`);
    });
  }, [open]);

  useEffect(() => {
    if (!open || started || !canSubmit) return;
    setStarted(true);
    void launchDeploy();
  }, [open, started, canSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0B1220] border border-white/10 rounded-3xl p-0 gap-0 shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-[16px] font-black uppercase tracking-tight italic text-white">Deploy</h2>
          <p className="text-[11px] text-white/35 mt-1">One-click deployment started with intelligent defaults</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-[10px] text-white/45">
            Deploy will automatically configure your service. Open Advanced only if you need custom overrides.
          </p>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Auto Detected Config</p>
            <p className="text-[11px] text-white/80 mt-1">Repository: {selectedRepo ? `${selectedRepo.account}/${selectedRepo.name}` : "resolving..."}</p>
            <p className="text-[11px] text-white/80 mt-1">Language: {detectedLanguage}</p>
            <p className="text-[10px] text-white/45 mt-0.5">Suggested build: {buildSuggestion}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Deployment Progress</p>
            <div className="space-y-2">
              {(["building", "deploying", "running"] as const).map((s) => {
                const active =
                  (s === "building" && ["building", "deploying", "running", "success"].includes(stage)) ||
                  (s === "deploying" && ["deploying", "running", "success"].includes(stage)) ||
                  (s === "running" && ["running", "success"].includes(stage));
                return (
                  <div key={s} className="flex items-center gap-2">
                    {active ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/20" />}
                    <span className={`text-[11px] ${active ? "text-white" : "text-white/40"}`}>{STAGE_LABELS[s]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-white/50 mt-3">{statusMessage}</p>
            {deploymentId && <p className="text-[9px] text-white/35 mt-1 font-mono">deployment: {deploymentId}</p>}
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between h-10 px-3 rounded-xl border border-white/10 bg-[#111827] text-white/80"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Advanced</span>
            {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {advancedOpen && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0F172A] p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Repository</Label>
                  <select
                    value={repoId}
                    onChange={(e) => {
                      const nextRepoId = e.target.value;
                      setRepoId(nextRepoId);
                      const repo = repos.find((r) => r.id === nextRepoId);
                      if (!repo) return;
                      setBranch(repo.defaultBranch || "main");
                      setServiceName(repo.name);
                      setRolloutName(`astraops-${repo.name}`);
                    }}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none focus:border-primary/50"
                  >
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.account}/{repo.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Branch</Label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none focus:border-primary/50"
                  >
                    {(selectedRepo?.branches?.length ? selectedRepo.branches : [selectedRepo?.defaultBranch ?? "main"]).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Service Name</Label>
                  <Input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-[#111827] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Namespace</Label>
                  <Input
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-[#111827] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Strategy</Label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as "canary" | "rolling")}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none focus:border-primary/50"
                  >
                    <option value="rolling">Rolling</option>
                    <option value="canary">Canary</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/45">Rollout Name</Label>
                  <Input
                    value={rolloutName}
                    onChange={(e) => setRolloutName(e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-[#111827] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/50"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111827] px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Auto deploy on Git push</span>
                <input
                  type="checkbox"
                  checked={autoDeployOnPush}
                  onChange={(e) => setAutoDeployOnPush(e.target.checked)}
                  className="accent-blue-500"
                />
              </label>

              <Button
                type="button"
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white font-semibold shadow-[0_10px_28px_rgba(37,99,235,0.35)] w-full hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                disabled={!canSubmit || localLoading || loading}
                onClick={() => void launchDeploy()}
              >
                {localLoading || loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Redeploy With Advanced Settings
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-4 rounded-xl text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => onOpenChange(false)}
            disabled={localLoading || loading}
          >
            Close
          </Button>
          <Button
            type="button"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white font-semibold shadow-[0_10px_28px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-[0.98] transition-all duration-200"
            disabled={!canSubmit || localLoading || loading}
            onClick={() => void launchDeploy()}
          >
            {localLoading || loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
            Deploy Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewDeploymentModal;

