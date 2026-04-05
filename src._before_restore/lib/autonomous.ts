import { api } from "./api";

export interface MetricSample {
  ts: string;
  cpu?: number;
  memory?: number;
  traffic?: number;
  errors?: number;
}

export async function setAutonomousMode(payload: {
  enabled: boolean;
  confidenceThreshold?: number;
  maxActionsPerHour?: number;
  manualOverride?: boolean;
}) {
  const { data } = await api.post("/autonomous/mode", payload);
  return data as {
    enabled: boolean;
    confidenceThreshold: number;
    maxActionsPerHour: number;
    manualOverride: boolean;
  };
}

export async function getAutonomousMode() {
  const { data } = await api.get("/autonomous/mode");
  return data as {
    enabled: boolean;
    confidenceThreshold: number;
    maxActionsPerHour: number;
    manualOverride: boolean;
  };
}

export async function runAutonomousLoop(payload: {
  provider: "aws" | "gcp" | "azure";
  deploymentName: string;
  namespace?: string;
  historicalMetrics: MetricSample[];
}) {
  const { data } = await api.post("/autonomous/loop/run", payload);
  return data as Record<string, unknown>;
}

export async function getPredictions() {
  const { data } = await api.get("/predict/history");
  return (data?.items ?? []) as Array<{
    id: string;
    predictedIssue: string;
    riskScore: number;
    failureProbability: number;
    recommendation?: string;
    createdAt: string;
  }>;
}

export async function getAutonomousActions() {
  const { data } = await api.get("/autonomous/actions/history");
  return (data?.items ?? []) as Array<{
    id: string;
    type: string;
    decision: string;
    confidence: number;
    status: string;
    createdAt: string;
  }>;
}

