import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const PHRASES = [
  "Analyzing CPU trends across hot pools…",
  "Evaluating scaling strategy vs SLO guardrails…",
  "Correlating latency with deployment cadence…",
  "Scoring blast radius for candidate actions…",
  "Decision in progress — policy checks running…",
];

function TypingLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => {
      setN((c) => Math.min(c + 1, text.length));
    }, 18);
    return () => window.clearInterval(id);
  }, [text]);
  return <span className="text-white/82">{text.slice(0, n)}</span>;
}

export const AIThinkingPanel: React.FC<{ className?: string }> = ({ className }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 5200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 flex gap-3 items-start",
        className
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="mt-0.5 rounded-lg border border-violet-400/30 bg-violet-500/15 p-2"
      >
        <Brain className="w-4 h-4 text-violet-200" />
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/70 mb-1">AI thinking</p>
        <p className="text-[13px] leading-snug min-h-[2.5rem]">
          <TypingLine key={idx} text={PHRASES[idx]} />
        </p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="inline-block h-1 w-1 rounded-full bg-violet-400/80"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
