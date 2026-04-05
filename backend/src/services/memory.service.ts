import { OpenAI } from "openai";

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

class MemoryService {
  private sessions: Map<string, ChatMessage[]> = new Map();
  private readonly MAX_HISTORY = 10;

  get(sessionId: string): ChatMessage[] {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    return this.sessions.get(sessionId)!;
  }

  add(sessionId: string, message: ChatMessage) {
    const history = this.get(sessionId);
    history.push(message);
    
    // Manage context window
    if (history.length > this.MAX_HISTORY) {
      // Keep the system prompt if we were storing it here, but we inject it in the service
      // For now, just slice the oldest user/assistant pairs
      this.sessions.set(sessionId, history.slice(-this.MAX_HISTORY));
    }
  }

  clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const memoryService = new MemoryService();
