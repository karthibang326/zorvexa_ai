import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { postAssistantChat, type AssistantContext } from "@/lib/ai-assistant";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

function getApiBase() {
  const root =
    (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") ||
    window.location.origin;
  return `${root}/api`;
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
    { id: "seed", role: "assistant", content: "Astra AI ready. Ask me to diagnose, fix, or optimize your cloud.", ts: Date.now() },
  ]);
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

  const submit = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg, ts: Date.now() }]);
    setInput("");
    setLoading(true);
    try {
      const out = await postAssistantChat({ message: msg, context });
      setMessages((prev) => [...prev, { id: `a-${out.ts}`, role: "assistant", content: out.response, ts: out.ts }]);
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(() => (open ? "Astra AI Assistant" : "Astra AI"), [open]);

  return (
    <div className="fixed right-4 bottom-4 z-[70]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)]"
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          {title}
        </button>
      ) : (
        <div className="w-[360px] h-[520px] rounded-2xl border border-white/10 bg-[#0B1220] shadow-[0_24px_60px_rgba(2,6,23,0.55)] flex flex-col">
          <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-white/65 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-300" /> {title}
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "assistant" ? "bg-white/5 text-white/90" : "ml-auto bg-[#2563EB]/20 text-blue-100 border border-blue-400/20"}`}>
                {m.content}
              </div>
            ))}
            {loading ? (
              <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-white/5 text-white/70 text-sm">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Thinking...
              </div>
            ) : null}
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
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
              placeholder="Ask Astra AI..."
            />
            <button onClick={() => void submit()} disabled={loading || !input.trim()} className="h-10 w-10 rounded-xl bg-[#2563EB] text-white disabled:opacity-50">
              <Send className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedAIChat;

