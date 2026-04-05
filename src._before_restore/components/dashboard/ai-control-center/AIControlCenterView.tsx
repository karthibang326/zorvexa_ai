import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Radio, Wifi } from "lucide-react";
import ModuleHeader from "../ModuleHeader";
import { AICopilotChat } from "./AICopilotChat";
import { AIInsightsPanel, type InsightModel } from "./AIInsightsPanel";
import { AIActionPanel } from "./AIActionPanel";
import { AgentStatus } from "./AgentStatus";
import { SafetyModeToggle } from "./SafetyModeToggle";
import { MemoryPanel } from "./MemoryPanel";
import { SimulationPanel } from "./SimulationPanel";
import { AIControlCommandBar } from "./AIControlCommandBar";
import { useRealtimeFeed } from "./useRealtimeFeed";
import type { SafetyMode } from "./types";
import { getIncidentHistory } from "@/lib/sre";
const AIControlCenterView: React.FC = () => {
  const [safetyMode, setSafetyMode] = useState<SafetyMode>(() => {
    try {
      const s = localStorage.getItem("astra-safety-mode") as SafetyMode | null;
      if (s === "suggest_only" || s === "approval_required" || s === "auto_execute") return s;
    } catch {
      // ignore
    }
    return "approval_required";
  });

  const { feed, connected, appendSystem } = useRealtimeFeed();
  const [insight, setInsight] = useState<InsightModel>({
    title: "High CPU on api-gateway (87%)",
    rootCause: "Traffic mix shifted toward bursty inference; saturation on shared node pool.",
    impact: "Latency +32% vs 1h baseline · SLO burn risk if sustained >15m.",
    confidence: 0.87,
    riskLabel: "SLO breach possible",
  });

  useEffect(() => {
    void (async () => {
      try {
        const h = await getIncidentHistory(5);
        const first = h.items[0];
        if (first) {
          setInsight({
            title: `${first.issue.slice(0, 80)}${first.issue.length > 80 ? "…" : ""}`,
            rootCause: first.rootCause ?? "Correlation in progress across metrics and deploy events.",
            impact: first.status === "RESOLVED" ? "Contained — post-incident review recommended." : "Active — operator attention required.",
            confidence: typeof first.confidenceScore === "number" ? Math.min(0.99, first.confidenceScore) : 0.78,
            riskLabel: first.status === "RESOLVED" ? "mitigated" : "active",
          });
        }
      } catch {
        // keep default insight
      }
    })();
  }, []);

  const feedPreview = useMemo(() => feed.slice(0, 8), [feed]);

  return (
    <div className="space-y-6 pb-28 max-w-[1600px] mx-auto">
      <ModuleHeader
        title="AI Control Center"
        subtitle="Operator-grade copilot · voice · live streams · actions · memory"
      />

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/45">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
          <Radio className={connected.sse ? "w-3.5 h-3.5 text-emerald-400" : "w-3.5 h-3.5 text-white/25"} />
          SSE {connected.sse ? "live" : "connecting"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
          <Wifi className={connected.ws ? "w-3.5 h-3.5 text-sky-400" : "w-3.5 h-3.5 text-white/25"} />
          WS {connected.ws ? "mesh" : "optional"}
        </span>
      </div>

      <SafetyModeToggle
        value={safetyMode}
        onChange={(m) => {
          setSafetyMode(m);
          try {
            localStorage.setItem("astra-safety-mode", m);
          } catch {
            // ignore
          }
          appendSystem("Safety mode", m.replace(/_/g, " "));
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <motion.div className="xl:col-span-5 space-y-5" layout>
          <AICopilotChat safetyMode={safetyMode} onOperatorEvent={(t, d) => appendSystem(t, d)} />
          <MemoryPanel />
        </motion.div>

        <div className="xl:col-span-4 space-y-5">
          <AIInsightsPanel insight={insight} />
          <AgentStatus />
          <SimulationPanel />
        </div>

        <div className="xl:col-span-3 space-y-5">
          <AIActionPanel safetyMode={safetyMode} />
          <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4 max-h-[320px] flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 mb-2">Live feed</p>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {feedPreview.length === 0 ? (
                <p className="text-[12px] text-white/35">Waiting for autonomous + incident signals…</p>
              ) : (
                feedPreview.map((f) => (
                  <div key={f.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-[11px]">
                    <p className="text-white/55 text-[9px] uppercase tracking-wider">{f.channel}</p>
                    <p className="text-white/85 font-medium">{f.title}</p>
                    <p className="text-white/45 mt-0.5 line-clamp-2">{f.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AIControlCommandBar
        onSubmit={(cmd) => {
          appendSystem("Command bar", cmd);
          window.dispatchEvent(new CustomEvent("astra-ai-command", { detail: cmd }));
        }}
      />
    </div>
  );
};

export default AIControlCenterView;
