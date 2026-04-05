const SESSION_KEY = "astra-ai-control-copilot-session";

export function getCopilotSessionId(): string {
  try {
    const e = sessionStorage.getItem(SESSION_KEY);
    if (e) return e;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}
