import { api } from "./api";

export interface AssistantContext {
  workflowId?: string | null;
  runId?: string | null;
  deploymentStatus?: string | null;
  activeTab?: string | null;
}

export interface AssistantReply {
  type: string;
  sessionId?: string;
  message: string;
  response: string;
  mappedAction?: {
    type: string;
    status: string;
    reason: string;
  } | null;
  context: AssistantContext;
  ts: number;
}

export async function postAssistantChat(payload: { message: string; sessionId?: string; context?: AssistantContext }) {
  const { data } = await api.post("/ai/chat", payload);
  return data as AssistantReply;
}

export async function getAssistantChatHistory(sessionId: string) {
  const { data } = await api.get("/ai/chat/history", { params: { sessionId } });
  return data as {
    sessionId: string;
    messages: Array<{ id: string; role: "user" | "assistant"; content: string; ts: number }>;
  };
}

