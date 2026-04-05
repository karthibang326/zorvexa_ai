import { api } from "./api";

/** POST target: dev uses Vite proxy `/api/copilot` → backend; prod can set full origin. */
export function getCopilotEndpoint(): string {
  const base = import.meta.env.VITE_COPILOT_API_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/api/ai/chat`;
  }
  return "/api/ai/chat";
}

export function getCopilotStatusUrl(): string {
  const ep = getCopilotEndpoint();
  return ep.endsWith("/") ? `${ep}status` : `${ep}/status`;
}

export interface CopilotStatusResponse {
  ok: boolean;
  openaiConfigured: boolean;
  allowDevOpenAiKey?: boolean;
  hint?: string;
}

export async function fetchCopilotStatus(): Promise<CopilotStatusResponse | null> {
  try {
    const res = await fetch(getCopilotStatusUrl());
    if (!res.ok) return null;
    return (await res.json()) as CopilotStatusResponse;
  } catch {
    return null;
  }
}

export interface CopilotResponse {
  reply: string;
  sessionId: string;
  context?: unknown;
  actionTaken?: string | null;
  agents?: unknown;
  engine?: string;
  /** True when OpenAI is not configured — reply is agent-only demo synthesis. */
  demoMode?: boolean;
  /** Where the API key came from: env file, browser session (dev), or none (demo). */
  keySource?: "env" | "dev_session" | "none";
}

export interface CopilotErrorBody {
  error: string;
  details?: string;
}

/** Thrown when the server returns a non-2xx JSON body (backend reached). */
export class CopilotApiError extends Error {
  readonly status: number;
  readonly summary?: string;

  constructor(message: string, status: number, summary?: string) {
    super(message);
    this.name = "CopilotApiError";
    this.status = status;
    this.summary = summary;
  }
}

export async function postCopilotMessage(
  message: string,
  sessionId: string | undefined,
  options?: { openaiApiKey?: string }
): Promise<CopilotResponse> {
  const body: Record<string, string | undefined> = {
    message,
    ...(sessionId ? { sessionId } : {}),
    ...(options?.openaiApiKey?.trim()
      ? { openaiApiKey: options.openaiApiKey.trim() }
      : {}),
  };
  // Use shared axios client so auth + required context headers are attached.
  const { data } = await api.post("/ai/chat", body);
  const payload = data as
    | (CopilotResponse & CopilotErrorBody)
    | { response?: string; ts?: number; context?: unknown; error?: string; details?: string };

  const reply = "reply" in payload && typeof payload.reply === "string"
    ? payload.reply
    : "response" in payload && typeof payload.response === "string"
      ? payload.response
      : "";

  if (!reply) {
    throw new CopilotApiError(
      (payload as CopilotErrorBody).details || (payload as CopilotErrorBody).error || "Invalid response from copilot (missing reply)",
      500,
      (payload as CopilotErrorBody).error
    );
  }

  return {
    reply,
    sessionId: sessionId ?? "astra-session",
    context: "context" in payload ? payload.context : undefined,
    actionTaken: "actionTaken" in payload ? (payload as CopilotResponse).actionTaken : null,
    agents: "agents" in payload ? (payload as CopilotResponse).agents : undefined,
    engine: "engine" in payload ? (payload as CopilotResponse).engine : "astra-ai-chat",
    demoMode: "demoMode" in payload ? (payload as CopilotResponse).demoMode : false,
    keySource: "keySource" in payload ? (payload as CopilotResponse).keySource : "none",
  };
}
