import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  FlaskConical,
  GitBranch,
  HelpCircle,
  ListX,
  Radio,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { postCopilotMessage } from "@/lib/copilot";
import type { MetricsState } from "@/lib/ai-ops-learning";
import { humanizeExecutionStatus } from "@/lib/ai-dashboard-status";
import { formatSignalReading, signalBarPercent } from "@/lib/explainability-view";
import { cn } from "@/lib/utils";
import { useSimulationPreview } from "@/contexts/SimulationPreviewContext";
import { useAiStream } from "@/contexts/AiStreamContext";

type ExplainMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type OpsLoopStatusLite = {
  running: boolean;
  lastRunAt?: string | null;
  action?: string;
  confidence?: number;
  execStatus?: string;
  successRatePct?: number | null;
  issue?: string;
  resource?: string;
  reason?: string;
  loopFailures?: number;
  lastLoopError?: string | null;
  correlationId?: string;
  metricsSource?: "live" | "synthetic";
  executionProfile?: {
    cloudLiveExecution: boolean;
    k8sDryRun: boolean;
    simulationMode: boolean;
    opsMetricsUrlConfigured: boolean;
  };
} | null;

export type ExplainTrace = {
  findings?: string[];
  observedState?: MetricsState;
  alternatives?: Array<{ option: string; rejectedBecause: string }>;
  learningInsight?: string;
  memoryCount?: number;
  avgReward?: number;
  successRatePct?: number;
  correlationId?: string;
  metricsSource?: "live" | "synthetic";
  reasoning?: string;
} | null;

export type K8sStatusLite = {
  lastIssues: Array<{ type: string; reason: string }>;
  lastActions: Array<{ action: string; target: string; outcome: string; confidence: number }>;
} | null;

interface AIExplainabilityPanelProps {
  activeTab: string;
  loopStatus: OpsLoopStatusLite;
  trace: ExplainTrace;
  k8sStatus: K8sStatusLite;
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45 mb-2">
      <Icon className="w-3.5 h-3.5 text-violet-300/90" />
      {children}
    </h3>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-white/35 uppercase tracking-wider">{label}</p>
      <p className="text-[12px] text-white/88 leading-snug">{value || "—"}</p>
    </div>
  );
}

const AIExplainabilityPanel: React.FC<AIExplainabilityPanelProps> = ({ activeTab, loopStatus, trace, k8sStatus }) => {
  const { events: streamEvents } = useAiStream();
  const { lastSimulation, approvedAction } = useSimulationPreview();
  const [messages, setMessages] = useState<ExplainMessage[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement | null>(null);

  const outcome = useMemo(() => {
    const raw = humanizeExecutionStatus(loopStatus?.execStatus) || loopStatus?.execStatus;
    return raw?.trim() || "";
  }, [loopStatus?.execStatus]);

  const confidencePct = useMemo(() => {
    const c = loopStatus?.confidence;
    if (typeof c !== "number" || Number.isNaN(c)) return null;
    return Math.round(c > 1 ? c : c * 100);
  }, [loopStatus?.confidence]);

  const signals = trace?.observedState;
  const alt = trace?.alternatives ?? [];

  const correlatedStream = useMemo(() => {
    const cid = trace?.correlationId?.trim();
    if (!cid) return [];
    return streamEvents.filter((e) => e.correlationId === cid).slice(0, 8);
  }, [streamEvents, trace?.correlationId]);

  const predictiveHint = useMemo(() => {
    const lat = signals?.latency;
    if (typeof lat !== "number") return null;
    if (lat > 220) return "Latency elevated vs nominal band — capacity or dependency regression likely without intervention.";
    if (lat > 180) return "Latency trending warm — watch for queueing before SLO breach.";
    return "Latency within comfort band for this window — continue observe.";
  }, [signals?.latency]);

  const copilotContext = useMemo(() => {
    const best = lastSimulation?.options.find((o) => o.isBest);
    const lines = [
      `Dashboard tab: ${activeTab}`,
      loopStatus?.issue ? `Issue: ${loopStatus.issue}` : null,
      loopStatus?.action ? `Action: ${loopStatus.action}` : null,
      loopStatus?.reason ? `Reason: ${loopStatus.reason}` : null,
      outcome ? `Outcome: ${outcome}` : null,
      trace?.findings?.length ? `Findings: ${trace.findings.join(", ")}` : null,
      trace?.learningInsight ? `Learning: ${trace.learningInsight}` : null,
      k8sStatus?.lastActions?.[0]
        ? `K8s: ${k8sStatus.lastActions[0].action} on ${k8sStatus.lastActions[0].target}`
        : null,
      lastSimulation?.issue ? `Simulation issue: ${lastSimulation.issue}` : null,
      best
        ? `Simulation best option: ${best.action} (${best.latencyImpactPct}% latency, ${best.costImpactPct}% cost, risk ${best.risk})`
        : null,
      approvedAction
        ? `User-approved execution: ${approvedAction.action} on ${approvedAction.resource} at ${approvedAction.at}`
        : null,
    ].filter(Boolean);
    return lines.join("\n");
  }, [activeTab, loopStatus, outcome, trace, k8sStatus, lastSimulation, approvedAction]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handler = (evt: Event) => {
      const d = (evt as CustomEvent<{ reason?: string; action?: string; result?: string }>).detail;
      if (!d?.reason && !d?.action && !d?.result) return;
      const answer = [d.reason && `Reason: ${d.reason}`, d.action && `Action: ${d.action}`, d.result && `Result: ${d.result}`]
        .filter(Boolean)
        .join("\n");
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: "Explain this decision (control plane)" },
        { id: `a-${Date.now()}`, role: "assistant", text: answer || "—" },
      ]);
    };
    window.addEventListener("zorvexa:explain", handler as EventListener);
    return () => window.removeEventListener("zorvexa:explain", handler as EventListener);
  }, []);

  const appendAssistant = (text: string) => {
    setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text }]);
  };

  const explainWhy = () => {
    const parts = [
      loopStatus?.reason ? `Primary rationale: ${loopStatus.reason}` : null,
      loopStatus?.issue ? `Signals summarized as: ${loopStatus.issue}` : null,
      trace?.findings?.length ? `Raw finding codes: ${trace.findings.join(", ")}.` : null,
      typeof confidencePct === "number" ? `Model confidence for this step: ${confidencePct}%.` : null,
      k8sStatus?.lastIssues?.[0]
        ? `Parallel Kubernetes context: ${k8sStatus.lastIssues[0].type} — ${k8sStatus.lastIssues[0].reason}`
        : null,
    ].filter(Boolean);
    appendAssistant(parts.length ? parts.join("\n\n") : "No rationale trace yet — start the autonomous ops loop or connect telemetry.");
  };

  const explainAlternatives = () => {
    if (!alt.length) {
      appendAssistant(
        "No alternative branches recorded for this tick. When the ops loop runs, rejected paths appear here with policy reasons."
      );
      return;
    }
    const body = alt
      .map((a, i) => `${i + 1}. ${a.option}\n   Not chosen: ${a.rejectedBecause}`)
      .join("\n\n");
    appendAssistant(`Alternatives considered and rejected:\n\n${body}`);
  };

  const send = async (text?: string) => {
    const input = (text ?? query).trim();
    if (!input || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: input }]);
    setQuery("");
    setLoading(true);
    try {
      const out = await postCopilotMessage(
        `${input}\n\n---\nContext:\n${copilotContext}\n\nAnswer like a senior SRE: concise, structured, no fluff.`,
        sessionId
      );
      setSessionId(out.sessionId);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: out.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: "Copilot unavailable — check API configuration." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const signalKinds = ["cpu", "memory", "latency", "traffic"] as const;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08] shrink-0">
        <Sparkles className="w-4 h-4 text-violet-300 shrink-0" />
        <div>
          <p className="text-sm font-semibold tracking-tight text-white/90">AI Explainability</p>
          <p className="text-[10px] text-white/40 mt-0.5">Decision trace · signals · policy</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-5 pr-1 min-h-0">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
          <SectionTitle icon={Shield}>Operations posture</SectionTitle>
          <p className="text-[10px] text-white/55 leading-relaxed">
            Metrics:{" "}
            <span className="text-cyan-200/90">
              {loopStatus?.metricsSource === "live" ? "live endpoint" : "synthetic / fallback"}
            </span>
            {loopStatus?.executionProfile?.opsMetricsUrlConfigured ? " · OPS_METRICS_URL set" : ""}
          </p>
          {loopStatus?.executionProfile ? (
            <p className="text-[10px] text-white/50 leading-relaxed">
              Cloud live: {loopStatus.executionProfile.cloudLiveExecution ? "on" : "off"} · K8s dry-run:{" "}
              {loopStatus.executionProfile.k8sDryRun ? "on" : "off"} · Simulation mode:{" "}
              {loopStatus.executionProfile.simulationMode ? "on" : "off"}
            </p>
          ) : null}
          {typeof loopStatus?.loopFailures === "number" && loopStatus.loopFailures > 0 ? (
            <p className="text-[10px] text-amber-200/90">Loop failures (count): {loopStatus.loopFailures}</p>
          ) : null}
          {loopStatus?.lastLoopError ? (
            <p className="text-[10px] text-rose-200/85">Last error: {loopStatus.lastLoopError}</p>
          ) : null}
          {trace?.correlationId ? (
            <p className="text-[9px] font-mono text-white/40 break-all">Trace ID: {trace.correlationId}</p>
          ) : null}
        </section>

        {predictiveHint ? (
          <section className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3">
            <SectionTitle icon={Activity}>Predictive hint</SectionTitle>
            <p className="text-[11px] text-white/75 leading-relaxed">{predictiveHint}</p>
          </section>
        ) : null}

        {correlatedStream.length > 0 ? (
          <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
            <SectionTitle icon={GitBranch}>Cross-stream correlation</SectionTitle>
            <ul className="space-y-1.5 text-[10px] text-white/70">
              {correlatedStream.map((e) => (
                <li key={e.id} className="border-b border-white/[0.05] pb-1 last:border-0">
                  <span className="text-white/45">{e.phase}</span> · {e.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {lastSimulation ? (
          <section className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
            <SectionTitle icon={FlaskConical}>Simulation preview</SectionTitle>
            <p className="text-[11px] text-white/70 leading-relaxed mb-2">{lastSimulation.issue}</p>
            {lastSimulation.options.find((o) => o.isBest) ? (
              <p className="text-[11px] text-cyan-200/85">
                Best: {lastSimulation.options.find((o) => o.isBest)?.title} · Δlatency{" "}
                {lastSimulation.options.find((o) => o.isBest)?.latencyImpactPct}% · Δcost{" "}
                {lastSimulation.options.find((o) => o.isBest)?.costImpactPct}%
              </p>
            ) : null}
            {approvedAction ? (
              <p className="text-[10px] text-emerald-200/80 mt-2">
                Approved: {approvedAction.action} · {approvedAction.resource}
              </p>
            ) : null}
          </section>
        ) : null}

        {activeTab === "hybrid-control" ? (
          <section className="rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-3 space-y-2">
            <SectionTitle icon={Activity}>Root cause</SectionTitle>
            <p className="text-[11px] text-white/75 leading-relaxed">
              {trace?.findings?.length
                ? trace.findings.join(" · ")
                : "No coded findings in this window — the loop is operating within expected guardrails."}
            </p>
            <SectionTitle icon={Shield}>Risk analysis</SectionTitle>
            <p className="text-[11px] text-white/70 leading-relaxed">
              {k8sStatus?.lastIssues?.length
                ? `${k8sStatus.lastIssues.length} active signal(s): ${k8sStatus.lastIssues
                    .slice(0, 2)
                    .map((i) => `${i.type} (${i.reason})`)
                    .join(" · ")}`
                : "Cluster snapshot shows no acute degradation — preemptive capacity checks continue."}
            </p>
            <p className="text-[10px] text-white/45">
              Why this action: policy prefers lowest blast radius with confidence above your threshold; alternatives below
              failed policy or SLO gates.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <SectionTitle icon={GitBranch}>Current decision</SectionTitle>
          <div className="grid gap-3">
            <FieldRow label="Issue" value={loopStatus?.issue ?? ""} />
            <FieldRow label="Action" value={loopStatus?.action ? `${loopStatus.action}${loopStatus.resource ? ` · ${loopStatus.resource}` : ""}` : ""} />
            <FieldRow label="Outcome" value={outcome} />
          </div>
        </section>

        <section>
          <SectionTitle icon={HelpCircle}>Why AI took this action</SectionTitle>
          <p className="text-[12px] text-white/75 leading-relaxed rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            {trace?.reasoning?.trim() || loopStatus?.reason?.trim() || "—"}
          </p>
        </section>

        <section>
          <SectionTitle icon={Activity}>Confidence</SectionTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-white/55">
              <span>Model confidence</span>
              <span className="tabular-nums text-cyan-200/90">{confidencePct != null ? `${confidencePct}%` : "—"}</span>
            </div>
            <Progress
              value={confidencePct != null ? Math.min(100, Math.max(0, confidencePct)) : 0}
              className={cn("h-2 bg-white/[0.08]", confidencePct == null && "opacity-30")}
            />
          </div>
        </section>

        <section>
          <SectionTitle icon={Radio}>Signals</SectionTitle>
          <div className="space-y-3">
            {signalKinds.map((kind) => (
              <div key={kind}>
                <div className="flex justify-between text-[10px] text-white/45 mb-1 capitalize">
                  <span>{kind === "cpu" ? "CPU" : kind === "memory" ? "Memory" : kind === "latency" ? "Latency" : "Traffic"}</span>
                  <span className="text-white/65 tabular-nums">{formatSignalReading(kind, signals)}</span>
                </div>
                <Progress value={signalBarPercent(kind, signals)} className="h-1.5 bg-white/[0.08]" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle icon={ListX}>Alternatives rejected</SectionTitle>
          <ul className="space-y-2">
            {alt.length ? (
              alt.map((a, i) => (
                <li
                  key={`${a.option}-${i}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[11px] leading-snug"
                >
                  <span className="font-medium text-violet-200/95">{a.option}</span>
                  <span className="text-white/50"> — </span>
                  <span className="text-white/65">{a.rejectedBecause}</span>
                </li>
              ))
            ) : (
              <li className="text-[11px] text-white/35">—</li>
            )}
          </ul>
        </section>

        <section>
          <SectionTitle icon={BookOpen}>Learning</SectionTitle>
          <p className="text-[12px] text-white/70 leading-relaxed mb-2">{trace?.learningInsight?.trim() || "—"}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 px-1">
              <p className="text-[9px] text-white/40 uppercase tracking-wider">Experiences</p>
              <p className="text-[13px] text-white/85 tabular-nums">{trace?.memoryCount ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 px-1">
              <p className="text-[9px] text-white/40 uppercase tracking-wider">Avg reward</p>
              <p className="text-[13px] text-emerald-200/90 tabular-nums">
                {typeof trace?.avgReward === "number" ? trace.avgReward.toFixed(3) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 px-1">
              <p className="text-[9px] text-white/40 uppercase tracking-wider">Success %</p>
              <p className="text-[13px] text-sky-200/90 tabular-nums">
                {typeof trace?.successRatePct === "number" ? `${trace.successRatePct.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="pt-3 border-t border-white/[0.08] space-y-2 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
            onClick={() => {
              setMessages((p) => [...p, { id: `u-${Date.now()}`, role: "user", text: "Why this action?" }]);
              explainWhy();
            }}
          >
            Why this action?
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
            onClick={() => {
              setMessages((p) => [...p, { id: `u-${Date.now()}`, role: "user", text: "What are alternatives?" }]);
              explainAlternatives();
            }}
          >
            What are alternatives?
          </Button>
        </div>

        <div ref={listRef} className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-2 mb-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed",
                m.role === "assistant"
                  ? "border-white/[0.08] bg-white/[0.04] text-white/82 whitespace-pre-wrap"
                  : "border-blue-400/25 bg-blue-500/15 text-blue-100"
              )}
            >
              {m.text}
            </div>
          ))}
          {loading ? <div className="text-[10px] text-amber-300/90">Thinking…</div> : null}
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            className="h-9 text-xs bg-white/[0.04] border-white/12 focus-visible:ring-violet-400/40"
          />
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            onClick={() => void send()}
            disabled={loading}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIExplainabilityPanel;
