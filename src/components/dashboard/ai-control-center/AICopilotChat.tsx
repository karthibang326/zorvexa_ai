import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mic, MicOff, Send, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { postCopilotMessage } from "@/lib/copilot";
import { postAstraPredict } from "@/lib/astra";
import { getCopilotSessionId } from "./copilotSession";
import type { OperatorMessageBlock, SafetyMode } from "./types";

const QUICK = [
  { label: "Fix latency", text: "fix latency in production for api-gateway" },
  { label: "Optimize cost", text: "optimize cost across clusters with minimal risk" },
  { label: "Deploy service", text: "deploy service safely with canary strategy" },
];

function between(text: string, start: string, end?: string) {
  const s = text.indexOf(start);
  if (s < 0) return "";
  const from = s + start.length;
  const e = end ? text.indexOf(end, from) : -1;
  return (e >= 0 ? text.slice(from, e) : text.slice(from)).trim();
}

function parseJsonCodeFence(text: string): Record<string, unknown> | null {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseAssistantReply(text: string): Partial<OperatorMessageBlock> {
  const full = text.trim();
  const fromFence = parseJsonCodeFence(full);
  const actionFromFence = String(fromFence?.action ?? "").trim();
  const stepsFromFence = Array.isArray(fromFence?.steps)
    ? (fromFence?.steps as Array<{ description?: string; command?: string }>).map((s) =>
        [s.description, s.command ? `(${s.command})` : ""].filter(Boolean).join(" ")
      )
    : [];

  const problem = between(full, "Problem:", "Root Cause:");
  const rootCause = between(full, "Root Cause:", "Impact:");
  const impact = between(full, "Impact:", "Action Plan:");
  const actionPlan = between(full, "Action Plan:", "Confidence:");
  const confidenceText = between(full, "Confidence:");
  const confidenceMatch = confidenceText.match(/(\d+(?:\.\d+)?)%?/);
  const parsedConfidence = confidenceMatch ? Number(confidenceMatch[1]) / 100 : undefined;

  if (problem || rootCause || impact || actionPlan || actionFromFence) {
    return {
      headline: actionFromFence
        ? `Action: ${actionFromFence.replace(/_/g, " ")}`
        : "Operational assessment",
      summary: problem || "Assessment generated from live control-plane context.",
      reasoning: rootCause || undefined,
      actions: [
        ...(actionPlan ? actionPlan.split(/\s*\n+\s*/).filter(Boolean) : []),
        ...stepsFromFence,
      ].filter(Boolean),
      outcomes: impact || undefined,
      confidence: parsedConfidence ?? 0.82,
      raw: text,
    };
  }

  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (j.analysis || j.plan) {
      return {
        headline: String(j.headline ?? "Operator analysis"),
        summary: String(j.analysis ?? j.summary ?? ""),
        reasoning: String(j.reasoning ?? ""),
        actions: Array.isArray(j.actions) ? (j.actions as string[]) : j.plan ? [String(j.plan)] : [],
        confidence: typeof j.confidence === "number" ? j.confidence : parseFloat(String(j.confidence ?? "0.85")),
        raw: text,
      };
    }
  } catch {
    // plain text
  }
  const clean = full
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { summary: clean || text, raw: text };
}

type Props = {
  safetyMode: SafetyMode;
  onOperatorEvent?: (title: string, detail: string) => void;
};

export const AICopilotChat: React.FC<Props> = ({ safetyMode, onOperatorEvent }) => {
  const [messages, setMessages] = useState<OperatorMessageBlock[]>([
    {
      id: "seed",
      role: "assistant",
      ts: Date.now(),
      headline: "Operator online",
      summary:
        "I reason over telemetry, propose actions with risk scores, and execute only within your safety mode.",
      actions: ["Diagnose", "Plan rollout", "Correlate incidents"],
      confidence: 0.94,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const sessionRef = useRef(getCopilotSessionId());
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<{ stop: () => void; start: () => void } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loadingRef.current) return;
    const user: OperatorMessageBlock = {
      id: `u-${Date.now()}`,
      role: "user",
      ts: Date.now(),
      summary: t,
    };
    setMessages((m) => [...m, user]);
    setInput("");
    loadingRef.current = true;
    setLoading(true);
    onOperatorEvent?.("User intent", t);
    try {
      const prefix =
        safetyMode === "suggest_only"
          ? "[Suggest only — do not assume execution] "
          : safetyMode === "approval_required"
            ? "[Approval required before any change] "
            : "[Auto-execute allowed for safe actions] ";
      const data = await postCopilotMessage(prefix + t, sessionRef.current);
      const parsed = parseAssistantReply(data.reply);
      const assistant: OperatorMessageBlock = {
        id: `a-${Date.now()}`,
        role: "assistant",
        ts: Date.now(),
        headline: parsed.headline ?? "Assessment",
        summary: parsed.summary ?? data.reply,
        reasoning: parsed.reasoning,
        actions: parsed.actions,
        outcomes: parsed.outcomes ?? (data.actionTaken ? `Action hook: ${data.actionTaken}` : undefined),
        status: data.demoMode ? "Demo mode (no live model)" : undefined,
        confidence: parsed.confidence ?? 0.82,
        raw: parsed.raw,
      };
      setMessages((m) => [...m, assistant]);
      onOperatorEvent?.("Copilot", data.reply.slice(0, 120));
    } catch (e) {
      // Fallback path: keep the chat interactive even if copilot endpoint fails.
      try {
        const pred = await postAstraPredict({ state: { cpu: 72, latency: 210, errorRate: 0.9, cost: 16 } });
        const fallback: OperatorMessageBlock = {
          id: `a-fallback-${Date.now()}`,
          role: "assistant",
          ts: Date.now(),
          headline: "Fallback operator response",
          summary: pred.human,
          reasoning:
            "Primary copilot endpoint was unavailable, so I used ASTRA prediction + control-plane heuristics to avoid empty responses.",
          actions: [
            "Check pod health: kubectl get pods -n prod",
            "Inspect failing pods: kubectl describe pod <pod> -n prod",
            "Tail logs: kubectl logs <pod> -n prod --tail=200",
          ],
          status: "Degraded mode (copilot unreachable)",
          confidence: pred.machine.confidence,
        };
        setMessages((m) => [...m, fallback]);
      } catch {
        const errText = e instanceof Error ? e.message : "Copilot request failed";
        setMessages((m) => [
          ...m,
          {
            id: `a-error-${Date.now()}`,
            role: "assistant",
            ts: Date.now(),
            headline: "Operator unavailable",
            summary: `I couldn't reach the AI backend. ${errText}`,
            reasoning: "Network/auth/backend issue prevented model inference.",
            actions: ["Verify backend is running", "Check auth token/context", "Retry command"],
            status: "Error",
            confidence: 0.2,
          },
        ]);
      }
      toast.error(e instanceof Error ? e.message : "Copilot request failed");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [onOperatorEvent, safetyMode]);

  useEffect(() => {
    const onCmd = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      if (typeof d === "string" && d.trim()) void send(d);
    };
    window.addEventListener("astra-ai-command", onCmd as EventListener);
    return () => window.removeEventListener("astra-ai-command", onCmd as EventListener);
  }, [send]);

  const startVoice = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    const recognition = new SR() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: (event: { results: { isFinal?: boolean; 0?: { transcript?: string } }[] }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const text = Array.from(event.results as Iterable<{ 0?: { transcript?: string } }>)
        .map((r) => r[0]?.transcript ?? "")
        .join("")
        .trim();
      setLiveTranscript(text);
      if (event.results[0]?.isFinal) {
        void send(text);
        setLiveTranscript("");
        setListening(false);
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setLiveTranscript("");
    };
    recognition.onend = () => setListening(false);
    recRef.current = recognition;
    setListening(true);
    setLiveTranscript("");
    recognition.start();
  };

  const stopVoice = () => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Operator chat</span>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => void send(q.text)}
              className="text-[10px] px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("rounded-xl border px-3 py-3", m.role === "user" ? "border-white/10 bg-white/[0.03] ml-8" : "border-violet-500/20 bg-violet-500/5 mr-4")}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-medium tracking-wide text-white/45">Zorvexa AI</span>
                  {m.confidence != null && (
                    <span className="text-[10px] text-emerald-400/90 tabular-nums">{(m.confidence * 100).toFixed(0)}% conf</span>
                  )}
                </div>
              )}
              {m.headline && <p className="text-sm font-semibold text-white mb-1">{m.headline}</p>}
              {m.summary && <p className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">{m.summary}</p>}
              {m.reasoning && (
                <p className="mt-2 text-[12px] text-white/55 border-l-2 border-white/15 pl-2">
                  <span className="text-white/40">Reasoning · </span>
                  {m.reasoning}
                </p>
              )}
              {m.actions && m.actions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {m.actions.map((a, i) => (
                    <li key={i} className="text-[12px] text-cyan-300/90 flex gap-2">
                      <span className="text-white/35">{i + 1}.</span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              {m.outcomes && <p className="mt-2 text-[11px] text-emerald-400/90">{m.outcomes}</p>}
              {m.status && <p className="mt-1 text-[10px] text-white/35">{m.status}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex items-center gap-2 text-white/45 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Reasoning…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {liveTranscript && (
        <div className="px-4 py-2 border-t border-white/5 text-[12px] text-violet-200/90 font-mono bg-black/20">
          Live: {liveTranscript}
        </div>
      )}

      <div className="shrink-0 p-3 border-t border-white/10 flex gap-2">
        <button
          type="button"
          onClick={listening ? stopVoice : startVoice}
          className={cn(
            "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0",
            listening ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          )}
          title={listening ? "Stop" : "Voice input"}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send(input)}
          placeholder="> Fix latency in production…"
          className="flex-1 h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-white placeholder:text-white/30"
        />
        <button
          type="button"
          disabled={loading || !input.trim()}
          onClick={() => void send(input)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
};
