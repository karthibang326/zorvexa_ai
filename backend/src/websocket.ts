import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import type { AiStreamEventPayload } from "./modules/ai-stream/ai-stream.types";

const AI_STREAM_PATH = "/ws/ai-stream";

export class WSServer {
  private static wss: WebSocketServer | null = null;
  private static clients: Set<WebSocket> = new Set();

  static initialize(server: Server) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
      const host = request.headers.host ?? "localhost";
      const path = new URL(request.url ?? "/", `http://${host}`).pathname;
      if (path !== AI_STREAM_PATH) {
        return;
      }
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });
  }

  /** Broadcast any JSON payload (legacy: realtime.event, agent logs). */
  static broadcast(data: unknown) {
    const payload = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  static broadcastAiStream(event: AiStreamEventPayload) {
    this.broadcast(event);
  }

  static get aiStreamPath() {
    return AI_STREAM_PATH;
  }
}
