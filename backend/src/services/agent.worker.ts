import { AgentService } from "./agent.service";
import { WSServer } from "../websocket";
import { openai, openAiConfigurationError } from "../config/openai";
import { Agent, AgentLog } from "../models/agent.types";
import { v4 as uuidv4 } from "uuid";
import { logInfo, logError } from "../lib/logger";

export class AgentWorker {
  private static intervals: Map<number, NodeJS.Timeout> = new Map();

  static start() {
    logInfo("agent_worker_started");
    // Check for new agents every 10 seconds and start their cycles if not already running
    setInterval(() => {
      const agents = AgentService.getAgents();
      agents.forEach((agent) => {
        if (!this.intervals.has(agent.id) && agent.status === "RUNNING") {
          this.startAgentCycle(agent);
        }
      });
    }, 5000);
  }

  private static startAgentCycle(agent: Agent) {
    logInfo("agent_cycle_started", { agentName: agent.name, agentId: agent.id });
    
    const interval = setInterval(async () => {
      await this.runCycle(agent);
    }, 8000 + Math.random() * 4000); // 8-12 seconds

    this.intervals.set(agent.id, interval);
  }

  private static async runCycle(agent: Agent) {
    try {
      // 1. Mock logs and metrics
      const mockLogs = this.generateMockLogs(agent);
      const mockMetrics = this.generateMockMetrics(agent);

      // 2. Prepare LLM Prompt
      const prompt = `You are an Autonomous Infrastructure Sentinel Agent.
Name: ${agent.name}
Type: ${agent.type}
Objective: ${agent.objective}
Cluster: ${agent.cluster}
Namespace: ${agent.namespace}
Service: ${agent.service}

CONTEXT:
Logs: ${JSON.stringify(mockLogs)}
Metrics: ${JSON.stringify(mockMetrics)}

Analyze logs, metrics, and Kubernetes signals.
Return STRICT format:
Observation:
Root Cause:
Risk Level: LOW | MEDIUM | HIGH
Impact:
Recommended Action:
Auto-Action: YES | NO

If HIGH risk:
- Suggest scaling
- Suggest restart
- Suggest alert

Be precise. No generic answers.`;

      let decision = "Demo Mode: All systems nominal.";
      let riskLevel = "LOW";

      const configError = openAiConfigurationError();
      if (!configError) {
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.2,
        });
        decision = response.choices[0].message.content || decision;
        riskLevel = decision.includes("Risk Level: HIGH") ? "HIGH" : decision.includes("Risk Level: MEDIUM") ? "MEDIUM" : "LOW";
      }

      // 3. Update Agent State
      AgentService.updateAgentStatus(agent.id, riskLevel === "HIGH" ? "ERROR" : "RUNNING", decision);

      // 4. Broadcast via WebSocket
      const logEntry: AgentLog = {
        id: uuidv4(),
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date().toISOString(),
        message: decision.split('\n')[0].replace("Observation: ", ""),
        level: riskLevel === "HIGH" ? "ERROR" : riskLevel === "MEDIUM" ? "WARN" : "SUCCESS",
      };

      WSServer.broadcast({
        type: "AGENT_UPDATE",
        agentId: agent.id,
        status: agent.status,
        decision,
        riskLevel,
      });

      WSServer.broadcast({
        type: "AGENT_LOG",
        log: logEntry,
      });

      logInfo("agent_cycle_completed", { agentName: agent.name, riskLevel });

    } catch (error) {
      logError("agent_cycle_failed", { agentName: agent.name, message: error instanceof Error ? error.message : String(error) });
    }
  }

  private static generateMockLogs(agent: Agent) {
    const scenarios = [
      "INFO: Request processed in 45ms",
      "WARN: Connection timeout to database-slave-01",
      "ERROR: OutOfMemoryError in worker thread 4",
      "INFO: Garbage collection reclaimed 450MB",
      "DEBUG: Cache hit ratio: 0.94",
    ];
    return [scenarios[Math.floor(Math.random() * scenarios.length)]];
  }

  private static generateMockMetrics(agent: Agent) {
    return {
      cpu_usage: `${(Math.random() * 80 + 10).toFixed(1)}%`,
      memory_usage: `${(Math.random() * 60 + 20).toFixed(1)}%`,
      p99_latency: `${(Math.random() * 200 + 20).toFixed(0)}ms`,
      error_rate: `${(Math.random() * 2).toFixed(2)}%`,
    };
  }

  static stopAgent(id: number) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }
}
