import { api } from "./api";

export interface AssistantContext {
  workflowId?: string | null;
  runId?: string | null;
  deploymentStatus?: string | null;
  activeTab?: string | null;
}

export interface AssistantReply {
  type: string;
  message: string;
  response: string;
  context: AssistantContext;
  ts: number;
}

export async function postAssistantChat(payload: { message: string; context?: AssistantContext }) {
  const { data } = await api.post("/ai/chat", payload);
  return data as AssistantReply;
}

