import { WSServer } from "../../websocket";

export type RealtimeChannel = "ai_actions" | "incidents" | "logs";

export type RealtimeEvent = {
  id: string;
  channel: RealtimeChannel;
  title: string;
  detail: string;
  ts: number;
  metadata?: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

const eventStore: RealtimeEvent[] = [];
const chatStore = new Map<string, ChatMessage[]>();

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const realtimeService = {
  publish(event: Omit<RealtimeEvent, "id" | "ts">) {
    const payload: RealtimeEvent = {
      id: newId("evt"),
      ts: Date.now(),
      ...event,
    };
    eventStore.unshift(payload);
    if (eventStore.length > 500) eventStore.length = 500;
    WSServer.broadcast({ type: "realtime.event", event: payload });
    return payload;
  },

  list(limit = 100) {
    return eventStore.slice(0, Math.max(1, Math.min(300, limit)));
  },

  appendChat(sessionId: string, message: Omit<ChatMessage, "id" | "ts">) {
    const current = chatStore.get(sessionId) ?? [];
    const next = [
      ...current,
      { id: newId("msg"), ts: Date.now(), ...message },
    ].slice(-200);
    chatStore.set(sessionId, next);
    return next;
  },

  getChat(sessionId: string) {
    return chatStore.get(sessionId) ?? [];
  },

  mapCommandToAction(message: string) {
    const q = message.toLowerCase();
    if (q.includes("optimize cost")) {
      return {
        type: "cost.optimize",
        status: "queued",
        reason: "User requested cost optimization",
      };
    }
    if (q.includes("fix latency")) {
      return {
        type: "performance.fix_latency",
        status: "queued",
        reason: "User requested latency remediation",
      };
    }
    if (q.includes("explain decisions")) {
      return {
        type: "ai.explain_decisions",
        status: "completed",
        reason: "User requested explainability summary",
      };
    }
    return null;
  },
};

