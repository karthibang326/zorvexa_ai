import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { withContextQuery } from "@/lib/context";
import type { LiveFeedEntry } from "./types";

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080";
  return `${root}/api`;
}

function wsUrlFromLocation(): string {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "");
  if (root) {
    const u = new URL(root);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}/ws/ai-stream`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/ai-stream`;
}

function pushFeed(
  set: Dispatch<SetStateAction<LiveFeedEntry[]>>,
  partial: Omit<LiveFeedEntry, "id" | "ts">
) {
  set((prev) =>
    [
      {
        ...partial,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ts: Date.now(),
      },
      ...prev,
    ].slice(0, 120)
  );
}

/** SSE (autonomous + incident) plus optional WebSocket for agent-style pushes. */
export function useRealtimeFeed() {
  const [feed, setFeed] = useState<LiveFeedEntry[]>([]);
  const [connected, setConnected] = useState({ sse: false, ws: false });

  const appendSystem = useCallback((title: string, detail: string) => {
    pushFeed(setFeed, { channel: "system", title, detail, tone: "info" });
  }, []);

  useEffect(() => {
    const autoUrl = withContextQuery(`${getApiBase()}/autonomous/stream`);
    const incUrl = withContextQuery(`${getApiBase()}/incident/stream`);

    const esAuto = new EventSource(autoUrl);
    const esInc = new EventSource(incUrl);

    const onAuto = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(ev.data) as Record<string, unknown>;
        const t = String(p.type ?? ev.type ?? "update");
        if (t === "heartbeat" || t === "autonomous_stream_ready") return;
        const detail =
          String(p.message ?? p.decision ?? p.action ?? p.event ?? JSON.stringify(p)).slice(0, 280);
        pushFeed(setFeed, {
          channel: "autonomous",
          title: t.replace(/_/g, " "),
          detail,
          tone: String(p.status ?? "").includes("fail") ? "danger" : "info",
        });
        setConnected((c) => ({ ...c, sse: true }));
      } catch {
        // ignore
      }
    };

    const onInc = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(ev.data) as Record<string, unknown>;
        const t = String(p.type ?? "incident");
        if (t === "heartbeat") return;
        pushFeed(setFeed, {
          channel: "incident",
          title: `Incident · ${t}`,
          detail: String(p.issue ?? p.message ?? p.action ?? "signal").slice(0, 280),
          tone: t.includes("resolved") ? "success" : "warn",
        });
        setConnected((c) => ({ ...c, sse: true }));
      } catch {
        // ignore
      }
    };

    esAuto.addEventListener("message", onAuto as EventListener);
    esAuto.addEventListener("prediction", onAuto as EventListener);
    esAuto.addEventListener("decision", onAuto as EventListener);
    esAuto.addEventListener("action", onAuto as EventListener);
    esAuto.addEventListener("update", onAuto as EventListener);

    esInc.addEventListener("incident_detected", onInc as EventListener);
    esInc.addEventListener("root_cause_identified", onInc as EventListener);
    esInc.addEventListener("action_executed", onInc as EventListener);
    esInc.addEventListener("resolved", onInc as EventListener);

    esAuto.onerror = () => esAuto.close();
    esInc.onerror = () => esInc.close();

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrlFromLocation());
      ws.onopen = () => setConnected((c) => ({ ...c, ws: true }));
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string) as Record<string, unknown>;
          if (data.type === "AGENT_LOG" && data.log) {
            const log = data.log as { message?: string; agentName?: string };
            pushFeed(setFeed, {
              channel: "ws",
              title: String(log.agentName ?? "Agent"),
              detail: String(log.message ?? "update"),
              tone: "info",
            });
          } else if (data.type === "AGENT_UPDATE") {
            pushFeed(setFeed, {
              channel: "ws",
              title: "Agent update",
              detail: String(data.decision ?? data.status ?? "state change"),
              tone: "info",
            });
          }
        } catch {
          pushFeed(setFeed, {
            channel: "ws",
            title: "Socket",
            detail: String(msg.data).slice(0, 200),
            tone: "info",
          });
        }
      };
      ws.onerror = () => {
        setConnected((c) => ({ ...c, ws: false }));
      };
    } catch {
      // WS optional
    }

    return () => {
      esAuto.close();
      esInc.close();
      ws?.close();
    };
  }, []);

  return { feed, connected, appendSystem, setFeed };
}
