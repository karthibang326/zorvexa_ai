import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { getAssistantChatHistory, postAssistantChat, type AssistantContext } from "@/lib/ai-assistant";
import { getDemoCopilotReply, getDemoEvents, getDemoQueries, isDemoModeEnabled, setDemoModeEnabled } from "@/lib/demo-mode";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface LiveEvent {
  id: string;
  channel: "ai_actions" | "incidents" | "logs";
  title: string;
  detail: string;
  ts: number;
}

interface StructuredAssistantMessage {
  importance?: string;
  actionableSteps: string[];
  problem?: string;
  rootCause?: string;
  impact?: string;
  actionPlan?: string;
  confidence?: string;
}

function extractLeadingJsonBlock(text: string): { jsonText: string; remainder: string } | null {
  const source = text.trim();
  if (!source.startsWith("{")) return null;
  let depth = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          jsonText: source.slice(0, i + 1),
          remainder: source.slice(i + 1).trim(),
        };
      }
    }
  }
  return null;
}

function parseStructuredAssistantMessage(content: string): StructuredAssistantMessage | null {
  const out: StructuredAssistantMessage = { actionableSteps: [] };
  let found = false;
  const leadingJson = extractLeadingJsonBlock(content);
  if (leadingJson) {
    try {
      const parsed = JSON.parse(leadingJson.jsonText) as any;
      const response = parsed?.response;
      if (typeof response?.importance === "string") {
        out.importance = response.importance;
        found = true;
      }
      if (Array.isArray(response?.actionable_steps)) {
        out.actionableSteps = response.actionable_steps
          .map((s: any) => (typeof s?.description === "string" ? s.description : ""))
          .filter(Boolean);
        if (out.actionableSteps.length > 0) found = true;
      }
      content = leadingJson.remainder;
    } catch {
      // no-op
    }
  }

  const labels: Array<[keyof StructuredAssistantMessage, RegExp]> = [
    ["problem", /Problem:\s*(.+)/i],
    ["rootCause", /Root Cause:\s*(.+)/i],
    ["impact", /Impact:\s*(.+)/i],
    ["actionPlan", /Action Plan:\s*(.+)/i],
    ["confidence", /Confidence:\s*(.+)/i],
  ];
  for (const [key, regex] of labels) {
    const match = content.match(regex);
    if (!match?.[1]) continue;
    out[key] = match[1].trim();
    found = true;
  }

  return found ? out : null;
}

function toLineFormattedAssistantText(content: string) {
  const parsed = parseStructuredAssistantMessage(content);
  if (!parsed) return content;
  const lines: string[] = [];
  if (parsed.importance) lines.push(`Summary: ${parsed.importance}`);
  if (parsed.problem) lines.push(`Problem: ${parsed.problem}`);
  if (parsed.rootCause) lines.push(`Root Cause: ${parsed.rootCause}`);
  if (parsed.impact) lines.push(`Impact: ${parsed.impact}`);
  if (parsed.actionPlan) lines.push(`Action Plan: ${parsed.actionPlan}`);
  if (parsed.actionableSteps.length > 0) {
    lines.push("Actionable Steps:");
    parsed.actionableSteps.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
  }
  if (parsed.confidence) lines.push(`Confidence: ${parsed.confidence}`);
  return lines.join("\n");
}

const AssistantStructuredMessage: React.FC<{ content: string }> = ({ content }) => {
  const lineText = useMemo(() => toLineFormattedAssistantText(content), [content]);
  return (
    <div className="whitespace-pre-wrap">{lineText}</div>
  );
};

function getApiBase() {
  if (import.meta.env.VITE_WORKFLOWS_API_URL) {
    const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string).replace(/\/$/, "");
    return `${root}/api`;
  }
  if (import.meta.env.DEV) return "/api";
  return `${window.location.origin}/api`;
}

function getAiStreamWebSocketUrl() {
  if (import.meta.env.VITE_WORKFLOWS_API_URL) {
    const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string).replace(/\/$/, "");
    const wsRoot = root.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
    return `${wsRoot}/ws/ai-stream`;
  }
  if (import.meta.env.DEV) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${window.location.host}/ws/ai-stream`;
  }
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/ws/ai-stream`;
}

const SUGGESTIONS = [
  "Why is system critical?",
  "What actions were taken?",
  "How to reduce cost?",
  "Explain latest AI decisions",
];

const EmbeddedAIChat: React.FC<{ context: AssistantContext }> = ({ context }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "seed", role: "assistant", content: "Zorvexa AI ready. Ask me to diagnose, fix, or optimize your cloud.", ts: Date.now() },
  ]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const sessionId = useMemo(() => {
    const tab = context.activeTab ?? "global";
    return `session-${tab}`;
  }, [context.activeTab]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    void getAssistantChatHistory(sessionId)
      .then((history) => {
        if (history.messages.length) {
          setMessages((prev) => {
            const seed = prev.find((m) => m.id === "seed");
            return [...(seed ? [seed] : []), ...history.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, ts: m.ts }))].slice(-120);
          });
        }
      })
      .catch(() => {
        // no-op
      });
  }, [sessionId]);

  useEffect(() => {
    const es = new EventSource(`${getApiBase()}/ai/chat/stream`);
    const onAssistant = (ev: MessageEvent<string>) => {
      try {
        const data = JSON.parse(ev.data);
        if (!data?.response) return;
        setMessages((prev) => [...prev, { id: `sse-${data.ts}-${Math.random()}`, role: "assistant", content: String(data.response), ts: Number(data.ts ?? Date.now()) }]);
      } catch {
        // no-op
      }
    };
    es.addEventListener("assistant", onAssistant as EventListener);
    return () => es.close();
  }, []);

  useEffect(() => {
    setDemoMode(isDemoModeEnabled());
  }, []);

  useEffect(() => {
    if (!demoMode) return;
    setLiveEvents(getDemoEvents());
    const id = window.setInterval(() => {
      setLiveEvents((prev) => [
        {
          id: `demo-${Date.now()}`,
          channel: ["ai_actions", "incidents", "logs"][Math.floor(Math.random() * 3)] as LiveEvent["channel"],
          title: ["scale_up", "cost.optimize", "incident.resolved"][Math.floor(Math.random() * 3)],
          detail: ["Autoscaled compute tier", "Optimized cloud spend by 8%", "Incident auto-resolved in 42s"][Math.floor(Math.random() * 3)],
          ts: Date.now(),
        },
        ...prev,
      ].slice(0, 40));
    }, 4500);
    return () => window.clearInterval(id);
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;
    const ws = new WebSocket(getAiStreamWebSocketUrl());
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data ?? "{}"));
        if (payload?.type !== "realtime.event") return;
        const event = payload.event as LiveEvent;
        if (!event?.id) return;
        setLiveEvents((prev) => [event, ...prev].slice(0, 40));
      } catch {
        // no-op
      }
    };
    return () => ws.close();
  }, [demoMode]);

  const submit = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg, ts: Date.now() }]);
    setInput("");
    setLoading(true);
    try {
      if (demoMode) {
        const response = getDemoCopilotReply(msg);
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: response, ts: Date.now() }]);
      } else {
        const out = await postAssistantChat({ message: msg, sessionId, context });
        setMessages((prev) => [...prev, { id: `a-${out.ts}`, role: "assistant", content: out.response, ts: out.ts }]);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Zorvexa AI request failed: ${reason}`);
    } finally {
      setLoading(false);
    }
  };

  const title = "Zorvexa AI";

  return (
    <div className="fixed right-4 bottom-4 z-[70]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 px-5 rounded-2xl bg-gradient-to-br from-[#3b66f5] to-[#6b46ef] text-white font-semibold tracking-tight shadow-[0_8px_28px_rgba(59,102,245,0.4)] transition-all hover:brightness-[1.03] hover:shadow-[0_10px_32px_rgba(107,70,239,0.45)] active:scale-[0.99]"
        >
          <MessageSquare className="w-4 h-4 inline mr-2 text-white" />
          {title}
        </button>
      ) : (
        <div className="w-[420px] h-[560px] rounded-2xl border border-white/10 bg-[#0B1220] shadow-[0_24px_60px_rgba(2,6,23,0.55)] flex flex-col">
          <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-white/65 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-300" /> {title}
            </div>
            <div className="flex items-center gap-2">
              {demoMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setDemoModeEnabled(false);
                    setDemoMode(false);
                    toast.success("Demo mode exited");
                  }}
                  className="text-[10px] rounded-md border border-red-300/30 bg-red-500/10 px-2 py-1 text-red-200 hover:bg-red-500/20"
                >
                  Exit Demo
                </button>
              ) : null}
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_148px] gap-2 p-2 flex-1 min-h-0">
            <div ref={listRef} className="overflow-y-auto p-1 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "assistant" ? "bg-white/5 text-white/90" : "ml-auto bg-[#2563EB]/20 text-blue-100 border border-blue-400/20"}`}>
                {m.role === "assistant" ? <AssistantStructuredMessage content={m.content} /> : m.content}
              </div>
            ))}
            {loading ? (
              <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-white/5 text-white/70 text-sm">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Thinking...
              </div>
            ) : null}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Live Feed</p>
              <div className="space-y-2">
                {liveEvents.map((evt) => (
                  <div key={evt.id} className="rounded-lg border border-white/10 p-2">
                    <p className="text-[10px] text-white/40">{new Date(evt.ts).toLocaleTimeString()}</p>
                    <p className="text-[10px] text-indigo-200">{evt.channel}</p>
                    <p className="text-[11px] text-white/80">{evt.title}</p>
                    <p className="text-[10px] text-white/55 whitespace-pre-wrap">{toLineFormattedAssistantText(evt.detail)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-2">
            {(demoMode ? getDemoQueries() : SUGGESTIONS).map((s) => (
              <button key={s} onClick={() => void submit(s)} className="text-[10px] px-2 py-1 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
                <Sparkles className="w-3 h-3 inline mr-1" />
                {s}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="flex-1 h-10 rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-white"
              placeholder="Ask Zorvexa AI..."
            />
            <button
              onClick={() => void submit()}
              disabled={loading || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-[#3b66f5] to-[#6b46ef] text-white shadow-[0_4px_16px_rgba(59,102,245,0.35)] disabled:opacity-50 hover:brightness-[1.05] transition-all"
            >
              <Send className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedAIChat;

