import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Play, ShieldCheck, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MetricsState } from "@/lib/ai-ops-learning";
import { postOpsExecute } from "@/lib/ai-ops-learning";
import { type SimulationResult, riskLabel, runSimulation } from "@/lib/ai-simulation-engine";
import { isSimulationModeEnabled, setSimulationModeEnabled } from "@/lib/simulation-mode";
import { useSimulationPreview } from "@/contexts/SimulationPreviewContext";
import { toast } from "sonner";

type SafetyMode = "strict" | "balanced" | "fast";

function readSafetyMode(): SafetyMode {
  try {
    const s = localStorage.getItem("astra-safety-mode") as SafetyMode | null;
    if (s === "strict" || s === "balanced" || s === "fast") return s;
  } catch {
    // ignore
  }
  return "balanced";
}

const DEFAULT_BASELINE: MetricsState = {
  cpu: 72,
  memory: 62,
  latency: 198,
  traffic: 1450,
  errorRate: 1.4,
  cost: 58,
};

const AISimulationView: React.FC = () => {
  const { setLastSimulation, setApprovedAction } = useSimulationPreview();
  const [modeOn, setModeOn] = useState(() => isSimulationModeEnabled());
  const [baseline, setBaseline] = useState<MetricsState>(DEFAULT_BASELINE);
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [safetyMode, setSafetyMode] = useState<SafetyMode>(() => readSafetyMode());

  useEffect(() => {
    const id = window.setInterval(() => setSafetyMode(readSafetyMode()), 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => setModeOn(isSimulationModeEnabled());
    window.addEventListener("zorvexa:simulation-mode", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("zorvexa:simulation-mode", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const syncMode = useCallback((on: boolean) => {
    setModeOn(on);
    setSimulationModeEnabled(on);
  }, []);

  const run = useCallback(() => {
    const out = runSimulation(baseline, scenario);
    setResult(out);
    setSelectedId(out.bestOptionId);
    setLastSimulation(out);
    window.dispatchEvent(
      new CustomEvent("zorvexa:simulation-result", {
        detail: { issue: out.issue, findings: out.findings, best: out.options.find((o) => o.isBest) },
      })
    );
  }, [baseline, scenario, setLastSimulation]);

  const selected = useMemo(() => {
    if (!result) return null;
    return result.options.find((o) => o.id === selectedId) ?? result.options.find((o) => o.isBest) ?? null;
  }, [result, selectedId]);

  const approveExecute = async () => {
    if (!selected || !result) {
      toast.error("Select a simulated action first.");
      return;
    }
    if (safetyMode === "strict" && selected.risk === "high") {
      toast.error("Strict safety mode blocks high-risk execution from this panel.");
      return;
    }
    setExecuting(true);
    try {
      const exec = (await postOpsExecute({
        state: result.baseline,
        action: selected.action,
        resource: selected.resource,
        provider: "aws",
        manualApproval: true,
      })) as { status?: string; message?: string };
      const stamp = new Date().toISOString();
      setApprovedAction({ action: selected.action, resource: selected.resource, at: stamp });
      const statusStr = exec.status ?? "";
      window.dispatchEvent(
        new CustomEvent("zorvexa:explain", {
          detail: {
            reason: `Simulation-approved action (${modeOn ? "simulation mode" : "preview"}) — ${result.issue}`,
            action: `${selected.action} on ${selected.resource}`,
            result: statusStr || exec.message || "submitted",
            module: "simulation",
          },
        })
      );
      toast.success(
        statusStr === "PENDING_APPROVAL"
          ? "Submitted for policy approval — check agent experiences."
          : "Execution accepted — trace in audit and explainability."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setExecuting(false);
    }
  };

  const best = result?.options.find((o) => o.isBest);
  const rejected = result?.options.filter((o) => !o.isBest) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white/95 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-300" />
            AI Simulation Mode
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Preview outcomes before execution — predictions are heuristic models, not live cluster guarantees.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 relative z-20">
          {modeOn ? <ToggleRight className="w-5 h-5 text-emerald-400 shrink-0" /> : <ToggleLeft className="w-5 h-5 text-white/35 shrink-0" />}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Simulation mode</p>
            <p className="text-xs text-white/65">{modeOn ? "ON — previews enabled" : "OFF"}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={modeOn}
            onClick={() => syncMode(!modeOn)}
            className={cn(
              "relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1018]",
              modeOn ? "bg-emerald-600" : "bg-zinc-600"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                modeOn ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {!modeOn ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-6 text-sm text-amber-100/90">
          Turn on <strong>Simulation Mode</strong> to run what-if scenarios. Nothing is executed until you explicitly approve.
        </div>
      ) : null}

      {modeOn ? <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          <Zap className="w-4 h-4 text-violet-300" />
          Baseline telemetry (editable)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            [
              ["cpu", "CPU %"],
              ["memory", "Memory %"],
              ["latency", "Latency ms"],
              ["traffic", "Traffic (rps)"],
              ["errorRate", "Error %"],
              ["cost", "Cost index"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-[10px] text-white/40">{label}</span>
              <Input
                type="number"
                value={Number(baseline[key] ?? 0)}
                onChange={(e) =>
                  setBaseline((b) => ({ ...b, [key]: Number(e.target.value) }))
                }
                className="h-9 bg-white/[0.05] border-white/12"
              />
            </label>
          ))}
        </div>
      </div> : null}

      {modeOn ? <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          What-if scenario
        </div>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/12 bg-[#0c1018] px-3 py-2 text-sm text-white/85 placeholder:text-white/25"
        />
        <p className="text-[11px] text-white/40">
          Examples: <code className="text-cyan-200/80">cpu 92 latency 280</code>,{" "}
          <code className="text-cyan-200/80">security incident edge</code>,{" "}
          <code className="text-cyan-200/80">errors 4.5</code>
        </p>
        <Button
          type="button"
          onClick={run}
          className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500"
        >
          <Play className="w-4 h-4 mr-2" />
          Run simulation
        </Button>
      </div> : null}

      {modeOn ? <div className="flex items-center gap-2 text-xs text-white/45">
        <ShieldCheck className="w-4 h-4 text-emerald-300/80" />
        Safety profile: <span className="text-white/70">{safetyMode}</span> — high-risk paths may require approval or are blocked in strict mode.
      </div> : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80">Issue</h3>
            <p className="text-sm text-white/88 leading-relaxed">{result.issue}</p>
            {result.scenarioNote ? (
              <p className="text-xs text-cyan-200/75">Scenario adjustments: {result.scenarioNote}</p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Recommended</h3>
            {best ? <OptionCard option={best} selected={selected?.id === best.id} onSelect={() => setSelectedId(best.id)} highlight /> : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">All options & predictions</h3>
            <div className="space-y-2">
              {result.options.map((o) => (
                <OptionCard
                  key={o.id}
                  option={o}
                  selected={selected?.id === o.id}
                  onSelect={() => setSelectedId(o.id)}
                  highlight={o.isBest}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Rejected alternatives (for this signal mix)</h3>
            <ul className="space-y-2">
              {rejected.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/70"
                >
                  <span className="font-medium text-violet-200/90">{o.title}</span>
                  <span className="text-white/40"> — </span>
                  {o.rejectedBecause}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              disabled={
                !modeOn ||
                !selected ||
                executing ||
                (safetyMode === "strict" && selected.risk === "high")
              }
              onClick={() => void approveExecute()}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Approve & execute selected action
            </Button>
            {safetyMode === "strict" && selected?.risk === "high" ? (
              <span className="text-xs text-amber-200/90 self-center">Blocked under strict safety — relax mode in AI Control Center or pick a lower-risk option.</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
};

function OptionCard({
  option,
  selected,
  onSelect,
  highlight,
}: {
  option: SimulationOption;
  selected: boolean;
  onSelect: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3 transition-colors",
        selected ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]",
        highlight && "ring-1 ring-emerald-400/30"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/90">{option.title}</span>
          {option.isBest ? (
            <Badge className="bg-emerald-500/25 text-emerald-100 border-emerald-400/30 text-[10px]">Best option</Badge>
          ) : null}
        </div>
        <span className="text-[11px] text-cyan-200/85 tabular-nums">
          {Math.round(option.confidence * 100)}% confidence
        </span>
      </div>
      <p className="text-[11px] text-white/45 mt-1">{option.action} · {option.resource}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
        <div>
          <span className="text-white/35">Latency Δ</span>
          <p className="text-white/80 tabular-nums">{option.latencyImpactPct > 0 ? "+" : ""}
            {option.latencyImpactPct.toFixed(0)}%</p>
        </div>
        <div>
          <span className="text-white/35">Cost Δ</span>
          <p className="text-white/80 tabular-nums">{option.costImpactPct > 0 ? "+" : ""}
            {option.costImpactPct.toFixed(0)}%</p>
        </div>
        <div>
          <span className="text-white/35">Risk</span>
          <p className="text-white/80 capitalize">{option.risk}</p>
        </div>
        <div className="sm:col-span-1 col-span-2">
          <span className="text-white/35">Risk detail</span>
          <p className="text-white/65 text-[10px] leading-snug">{riskLabel(option.risk)}</p>
        </div>
      </div>
      <p className="text-[12px] text-white/72 mt-2 leading-relaxed">Expected: {option.expectedOutcome}</p>
    </button>
  );
}

export default AISimulationView;
