import { api } from "./api";

export type CostRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export async function getAICfoStatus() {
  const { data } = await api.get("/ai-cfo/status");
  return data as {
    mode: "on" | "off";
    autoOptimize: boolean;
    autoScaleIdle: boolean;
    forecasting: boolean;
    maxOptimizationsPerHour: number;
    approvalMode: boolean;
    rollbackEnabled: boolean;
    lastUpdatedAt: string;
  };
}

export async function postEnableAICfo() {
  const { data } = await api.post("/ai-cfo/enable", {});
  return data as Record<string, unknown>;
}

export async function postDisableAICfo() {
  const { data } = await api.post("/ai-cfo/disable", {});
  return data as Record<string, unknown>;
}

export async function postAnalyzeCost() {
  const { data } = await api.post("/cost/analyze", {});
  return data as {
    monthlySpend: number;
    forecastedSpend: number;
    savingsIdentified: number;
    riskLevel: CostRiskLevel;
    aiConfidence: number;
    anomaly: {
      anomaly: boolean;
      reason: string;
      recommendation: string;
      estimatedDailyImpactUsd: number;
    };
    prediction: {
      projectedMonthlyUsd: number;
      growthRate: number;
      confidence: number;
      notes: string[];
    };
    records: Array<Record<string, unknown>>;
  };
}

export async function postFixCost() {
  const { data } = await api.post("/cost/fix", {});
  return data as {
    actionsPerformed: string[];
    savingsAchieved: number;
  };
}

export async function getCostRecords() {
  const { data } = await api.get("/finops/cost");
  return (data?.records ?? []) as Array<{
    provider: "aws" | "gcp" | "azure";
    service: string;
    region: string;
    amountUsd: number;
    usageUnits: number;
    day: string;
  }>;
}

