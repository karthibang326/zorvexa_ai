import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

/** Returns the base HTTP URL for the backend (no trailing slash).
 *  In dev, falls back to an empty string so `/api/agents` is a relative path
 *  that Vite proxies to port 5000.  In production, set VITE_COPILOT_API_URL
 *  to your deployed backend origin, e.g. https://api.your-app.com */
function getBackendBase(): string {
  return import.meta.env.VITE_COPILOT_API_URL?.replace(/\/$/, "") ?? "";
}

/** Converts an HTTP(S) backend base URL to a WebSocket URL. */
function getWsUrl(): string {
  const base = getBackendBase();
  if (!base) {
    // Relative WS — same host, Vite will proxy it
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}`;
  }
  return base.replace(/^https/, "wss").replace(/^http/, "ws");
}

export interface Agent {
  id: number;
  name: string;
  type: string;
  objective: string;
  cluster: string;
  namespace: string;
  service: string;
  status: string;
  createdAt: string;
  lastDecision?: string;
}

export interface AgentLog {
  id: string;
  agentId: number;
  agentName: string;
  timestamp: string;
  message: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendBase()}/api/agents`);
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Cloud connectivity issue: Failed to sync agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();

    // WebSocket setup
    const ws = new WebSocket(getWsUrl());

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "AGENT_UPDATE") {
        setAgents((prev) => 
          prev.map((a) => 
            a.id === data.agentId 
              ? { ...a, status: data.status, lastDecision: data.decision } 
              : a
          )
        );
      } else if (data.type === "AGENT_LOG") {
        setLogs((prev) => [data.log, ...prev].slice(0, 50));
      }
    };

    ws.onopen = () => console.log("🔌 Connected to Agent Sentinel Mesh");
    ws.onerror = () => console.error("🔌 WebSocket connection error");

    return () => ws.close();
  }, [fetchAgents]);

  const createAgent = async (agentData: any) => {
    try {
      const response = await fetch(`${getBackendBase()}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) throw new Error("Creation failed");
      
      const newAgent = await response.json();
      setAgents((prev) => [...prev, newAgent]);
      toast.success(`Agent ${newAgent.name} initialized successfully`);
      return newAgent;
    } catch (error) {
      toast.error("Failed to initialize Sentinel Agent");
      throw error;
    }
  };

  return { agents, logs, isLoading, createAgent, refresh: fetchAgents };
};
