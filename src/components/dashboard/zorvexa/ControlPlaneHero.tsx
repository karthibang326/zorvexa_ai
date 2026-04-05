import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  Brain,
  DollarSign,
  RotateCcw,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StreamRow = { ts: string; module: string; reason: string; action: string; result: string };

type Props = {
  confidencePct: number;
  streamLabel: string;
  status: "idle" | "running" | "error";
  learningStatus: string;
  streamRows: StreamRow[];
  impact: { latency: string; cost: string; stability: string };
  simulationMode?: boolean;
};

function healthScore(confidence: number, status: Props["status"]): number {
  let s = confidence;
  if (status === "error") s -= 25;
  if (status === "idle") s -= 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function ControlPlaneHero({
  confidencePct,
  streamLabel,
  status,
  learningStatus,
  streamRows,
  impact,
  simulationMode = false,
}: Props) {
  const score = healthScore(confidencePct, status);
  const risk =
    score >= 85 ? "low" : score >= 65 ? "medium" : "elevated";
  const modeLabel = simulationMode
    ? "Simulation"
    : status === "running"
      ? "Autonomous active"
      : status === "error"
        ? "Degraded"
        : "Manual / idle";

  const last = streamRows[0];
  const activityExamples = [
    last
      ? `${last.module}: ${last.action} — ${last.reason.slice(0, 72)}${last.reason.length > 72 ? "…" : ""}`
      : "Scaled payments-service +2 replicas (capacity guardrail)",
    "Evaluated cost trajectory — reserved instance alignment suggested",
    "Blocked anomalous egress pattern (policy: SOC2 network tier)",
  ];

  const spend = 12840;
  const savings = 2310;
  const forecast = Math.round(spend * 0.91);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">AI control plane</p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Operations overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              simulationMode
                ? "border-[#00D4FF]/35 bg-[#00D4FF]/10 text-[#7eefff]"
                : status === "running"
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                  : "border-white/15 bg-white/[0.04] text-white/80"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
                  simulationMode ? "bg-[#00D4FF]" : "bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  simulationMode ? "bg-[#00D4FF]" : "bg-emerald-400"
                )}
              />
            </span>
            {modeLabel}
          </span>
          <span className="text-xs text-[#9CA3AF]">
            Stream <span className="text-white/90 font-mono">{streamLabel}</span> · Learning{" "}
            <span className="text-white/90">{learningStatus}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/[0.08] bg-[#0F141E] p-5 shadow-sm hover:border-[#6C5CE7]/25 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#9CA3AF]">System health</span>
            <Shield className="w-4 h-4 text-[#6C5CE7]" />
          </div>
          <p className="text-4xl font-bold tabular-nums text-white tracking-tight">{score}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">SLO compliance · within target</p>
          <p className="text-xs mt-3">
            <span className="text-[#9CA3AF]">Risk </span>
            <span
              className={cn(
                "font-semibold",
                risk === "low" && "text-emerald-400",
                risk === "medium" && "text-amber-400",
                risk === "elevated" && "text-red-400"
              )}
            >
              {risk}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/[0.08] bg-[#0F141E] p-5 shadow-sm hover:border-[#6C5CE7]/25 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#9CA3AF]">AI decisions (live)</span>
            <Brain className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <p className="text-sm text-white/90 line-clamp-2 leading-snug">
            {last ? `${last.action} · ${last.reason}` : "Observing telemetry — awaiting next loop"}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs rounded-md bg-[#6C5CE7]/15 text-[#c4b5fd] px-2 py-0.5 border border-[#6C5CE7]/25">
              Confidence {confidencePct}%
            </span>
            <span className="text-xs rounded-md bg-white/[0.06] text-[#9CA3AF] px-2 py-0.5">
              Δ latency {impact.latency}
            </span>
            <span className="text-xs rounded-md bg-white/[0.06] text-[#9CA3AF] px-2 py-0.5">
              Δ cost {impact.cost}
            </span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-white/15 bg-transparent text-white hover:bg-white/[0.06]"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("zorvexa:explain", {
                    detail: last
                      ? { module: last.module, reason: last.reason, action: last.action, result: last.result }
                      : { module: "control-plane", reason: "No recent row", action: "observe", result: "idle" },
                  })
                )
              }
            >
              Explain decision
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-white/15 bg-transparent text-white hover:bg-white/[0.06]"
              onClick={() => window.dispatchEvent(new CustomEvent("zorvexa:rollback-request"))}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Rollback
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/[0.08] bg-[#0F141E] p-5 shadow-sm hover:border-[#6C5CE7]/25 transition-colors md:col-span-2 xl:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#9CA3AF]">Autonomous activity</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <ul className="space-y-2.5">
            {activityExamples.map((line, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#9CA3AF] leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#6C5CE7] mt-0.5" />
                <span className="text-white/85">{line}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-white/[0.08] bg-[#0F141E] p-5 shadow-sm hover:border-[#6C5CE7]/25 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#9CA3AF]">Cost intelligence</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            ${spend.toLocaleString()}
            <span className="text-sm font-normal text-[#9CA3AF]"> /mo</span>
          </p>
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            AI-attributed savings ${savings.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-2">Forecast next 30d · ${forecast.toLocaleString()}</p>
        </motion.div>
      </div>
    </div>
  );
}
