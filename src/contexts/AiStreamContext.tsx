import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  type AiStreamEventPayload,
  deriveAiStreamKpis,
  fetchAiStreamRecent,
  getAiStreamWebSocketUrl,
} from "@/lib/ai-stream";

type AiStreamContextValue = {
  events: AiStreamEventPayload[];
  connected: boolean;
  lastError: string | null;
  kpis: ReturnType<typeof deriveAiStreamKpis>;
  reconnect: () => void;
};

const AiStreamContext = createContext<AiStreamContextValue | null>(null);

const MAX_EVENTS = 120;

function pushEvent(set: React.Dispatch<React.SetStateAction<AiStreamEventPayload[]>>, ev: AiStreamEventPayload) {
  set((prev) => [ev, ...prev].slice(0, MAX_EVENTS));
}

export const AiStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AiStreamEventPayload[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [wsGeneration, setWsGeneration] = useState(0);

  const kpis = useMemo(() => deriveAiStreamKpis(events), [events]);

  const reconnect = useCallback(() => {
    setWsGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchAiStreamRecent(80)
      .then((items) => {
        if (!cancelled && items.length) setEvents(items.slice(0, MAX_EVENTS));
      })
      .catch(() => {
        // offline / auth — live stream still fills in
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(getAiStreamWebSocketUrl());
        ws.onopen = () => {
          if (closed) return;
          setConnected(true);
          setLastError(null);
          retry = 0;
        };
        ws.onclose = () => {
          setConnected(false);
          if (closed) return;
          const delay = Math.min(30_000, 1500 * Math.pow(1.5, retry));
          retry += 1;
          timer = window.setTimeout(connect, delay);
        };
        ws.onerror = () => {
          setLastError("WebSocket error");
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data as string) as Record<string, unknown>;
            if (data.type === "ai.stream" && data.version === 1) {
              pushEvent(setEvents, data as AiStreamEventPayload);
              return;
            }
          } catch {
            // ignore
          }
        };
      } catch (e) {
        setLastError(e instanceof Error ? e.message : "connect failed");
        timer = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      ws?.close();
      setConnected(false);
    };
  }, [wsGeneration]);

  const value = useMemo<AiStreamContextValue>(
    () => ({
      events,
      connected,
      lastError,
      kpis,
      reconnect,
    }),
    [events, connected, lastError, kpis, reconnect]
  );

  return <AiStreamContext.Provider value={value}>{children}</AiStreamContext.Provider>;
};

export function useAiStream(): AiStreamContextValue {
  const ctx = useContext(AiStreamContext);
  if (!ctx) {
    throw new Error("useAiStream must be used within AiStreamProvider");
  }
  return ctx;
}
