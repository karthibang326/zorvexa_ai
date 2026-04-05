import { api } from "./api";

export interface OptimizeSystemResponse {
  scores: {
    performance: number;
    costEfficiency: number;
    reliability: number;
  };
  insights: string[];
  riskAreas: string[];
  recommendations: Array<{
    id: string;
    problem: string;
    impact: string;
    action: string;
    risk: "low" | "medium" | "high";
    explanation: {
      why: string;
      dataUsed: string;
      expectedBenefit: string;
    };
  }>;
  actionsApplied: string[];
  mode: "manual" | "auto";
  safety: {
    maxChangesPerHour: number;
    approvalMode: boolean;
    autoMode: boolean;
  };
  timestamp: string;
}

export async function postOptimizeSystem(payload: {
  autoMode?: boolean;
  safety?: { maxChangesPerHour?: number; approvalMode?: boolean };
}): Promise<OptimizeSystemResponse> {
  const { data } = await api.post("/optimize/system", payload);
  return data as OptimizeSystemResponse;
}
