import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAiStream } from "@/contexts/AiStreamContext";
import type { AiStreamEventPayload, AiStreamPhase } from "@/lib/ai-stream";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<AiStreamPhase, { short: string; text: string }> = {
  DETECT: { short: "DETECT", text: "text-amber-200" },
  DECISION: { short: "DECIDE", text: "text-sky-200" },
  ACTION: { short: "ACT", text: "text-violet-200" },
  RESULT: { short: "RESULT", text: "text-emerald-200" },
};

function formatLine(ev: AiStreamEventPayload): string {
  const phase = PHASE_LABEL[ev.phase].short;
  const title = ev.title?.trim() || "";
  const detail = ev.detail?.trim() || "";
  if (ev.phase === "RESULT" && ev.meta?.improvementScore != null) {
    return `${title || "Outcome"} · Δ ${Math.round(ev.meta.improvementScore)}%`;
  }
  return [title, detail].filter(Boolean).join(" · ") || "Signal processed";
}

export type LifecycleActivityStreamProps = {
  /**
   * From GET /api/context/options — when false, the WebSocket feed is still synthetic/global
   * (not tenant-scoped), so we label the stream accordingly.
   */
  tenantWorkspaceLinked?: boolean | null;
};

export const LifecycleActivityStream: React.FC<LifecycleActivityStreamProps> = ({
  tenantWorkspaceLinked = null,
}) => {
  const { events, connected, lastError, reconnect } = useAiStream();

  const streamLabel =
    connected && tenantWorkspaceLinked === false
      ? { text: "Simulation", className: "text-amber-200/95 border-amber-400/25" }
      : connected
        ? { text: "Live", className: "text-emerald-300/95 border-white/15" }
        : { text: "Reconnecting", className: "text-amber-200/90 border-white/15" };

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(2,8,23,0.28)] overflow-hidden"
      )}
    >
      <div className="h-11 px-4 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300/90" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">AI lifecycle stream</p>
          <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider", streamLabel.className)}>
            <Radio className="w-3 h-3 mr-1 inline" />
            {streamLabel.text}
          </Badge>
        </div>
        {lastError ? (
          <button
            type="button"
            onClick={() => reconnect()}
            className="text-[11px] text-amber-200/90 underline-offset-2 hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>
      {tenantWorkspaceLinked === false ? (
        <p className="px-4 py-2 text-[10px] leading-snug text-amber-200/85 border-b border-white/[0.06] bg-amber-500/[0.06]">
          No organization linked to this account — this feed is <span className="font-semibold">not tenant-scoped</span>. Complete{" "}
          <span className="text-white/90">Launch Mode</span> to attach a workspace; until then, events are global / demo pipeline
          only.
        </p>
      ) : null}
      <div className="max-h-[320px] overflow-y-auto divide-y divide-white/[0.05] custom-scrollbar">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-xs text-white/45 py-8 text-center">Connecting to live AI stream…</p>
          ) : (
            events.slice(0, 28).map((ev) => {
              const pl = PHASE_LABEL[ev.phase];
              const t = new Date(ev.ts).toLocaleTimeString();
              const line = formatLine(ev);
              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="px-4 py-2.5 font-mono text-[12px] leading-relaxed hover:bg-white/[0.03]"
                >
                  <span className="text-white/35 tabular-nums">[{t}]</span>{" "}
                  <span className={cn("font-semibold", pl.text)}>{pl.short}</span>
                  <span className="text-white/50"> → </span>
                  <span className="text-white/88">{line}</span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
