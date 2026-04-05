/** Structured operator response (optional JSON from copilot or synthesized). */
export type OperatorMessageBlock = {
  id: string;
  role: "user" | "assistant";
  ts: number;
  headline?: string;
  summary?: string;
  reasoning?: string;
  actions?: string[];
  outcomes?: string;
  status?: string;
  confidence?: number;
  raw?: string;
};

export type SafetyMode = "suggest_only" | "approval_required" | "auto_execute";

export type LiveFeedEntry = {
  id: string;
  ts: number;
  channel: "autonomous" | "incident" | "ws" | "system";
  title: string;
  detail: string;
  tone?: "info" | "warn" | "success" | "danger";
};

export type AgentLane = {
  id: string;
  name: string;
  role: string;
  status: "idle" | "working" | "blocked";
  detail: string;
  confidence?: number;
};
