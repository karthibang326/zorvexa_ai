import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Radio, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAiStream } from "@/contexts/AiStreamContext";
import type { AiStreamEventPayload, AiStreamPhase } from "@/lib/ai-stream";
import { cn } from "@/lib/utils";

const PHASE_STYLES: Record<
  AiStreamPhase,
  { label: string; className: string }
> = {
  DETECT: {
    label: "DETECT",
    className: "bg-amber-500/20 text-amber-100 border-amber-400/35",
  },
  DECISION: {
    label: "DECISION",
    className: "bg-violet-500/20 text-violet-100 border-violet-400/35",
  },
  ACTION: {
    label: "ACTION",
    className: "bg-cyan-500/20 text-cyan-100 border-cyan-400/35",
  },
  RESULT: {
    label: "RESULT",
    className: "bg-emerald-500/20 text-emerald-100 border-emerald-400/35",
  },
};

function TypingDetail({ text, isActive }: { text: string; isActive: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!isActive) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((c) => Math.min(c + 1, text.length));
    }, 16);
    return () => window.clearInterval(id);
  }, [text, isActive]);
  return <span className="text-white/80">{text.slice(0, n)}</span>;
}

const LiveAiActivityStream: React.FC<{ className?: string }> = ({ className }) => {
  const { events, connected, lastError, reconnect } = useAiStream();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-300/90" />
          <p className="text-xs font-semibold tracking-tight text-white/75">Live AI pipeline</p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wider border-white/15",
              connected ? "text-emerald-300/95" : "text-amber-200/90"
            )}
          >
            <Radio className="w-3 h-3 mr-1 inline" />
            {connected ? "Stream online" : "Reconnecting…"}
          </Badge>
        </div>
        {lastError ? (
          <button
            type="button"
            onClick={() => reconnect()}
            className="text-[11px] text-amber-200/90 underline-offset-2 hover:underline"
          >
            Retry connection
          </button>
        ) : null}
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-xs text-white/45 py-6 text-center">Waiting for AI stream events…</p>
          ) : (
            events.slice(0, 24).map((ev, idx) => (
              <StreamRow key={ev.id} ev={ev} typing={idx === 0} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function StreamRow({ ev, typing }: { ev: AiStreamEventPayload; typing: boolean }) {
  const phase = PHASE_STYLES[ev.phase];
  const time = new Date(ev.ts).toLocaleTimeString();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-white/35" />
          <span className="text-[10px] text-white/40 font-mono">{time}</span>
          <Badge variant="outline" className={cn("text-[10px] tracking-wide", phase.className)}>
            {phase.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {typeof ev.meta?.confidence === "number" ? (
            <span className="text-[10px] text-white/45">conf {Math.round(ev.meta.confidence)}%</span>
          ) : null}
          {ev.meta?.risk ? (
            <span className="text-[10px] text-amber-200/80">risk {ev.meta.risk}</span>
          ) : null}
          {ev.meta?.action ? (
            <span className="text-[10px] text-cyan-200/80 font-mono">{ev.meta.action}</span>
          ) : null}
          {ev.meta?.cloudTargetProvider ? (
            <Badge variant="outline" className="text-[9px] border-white/20 text-sky-200/90 uppercase">
              {ev.meta.cloudTargetProvider}
            </Badge>
          ) : null}
          {ev.meta?.learningAdjusted ? (
            <span className="text-[9px] text-violet-300/90" title="Confidence tuned from past outcomes">
              learned
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-medium text-white/90 mt-1.5">{ev.title}</p>
      <p className="text-xs leading-relaxed mt-1 min-h-[2.5rem]">
        <TypingDetail text={ev.detail} isActive={typing} />
      </p>
      {ev.meta?.resource ? (
        <p className="text-[10px] text-white/35 mt-1 font-mono truncate" title={ev.meta.resource}>
          {ev.meta.resource}
        </p>
      ) : null}
    </motion.article>
  );
}

export default LiveAiActivityStream;
