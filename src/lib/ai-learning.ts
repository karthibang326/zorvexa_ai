import { api } from "./api";

export type AiLearningRecord = {
  id: string;
  correlationId: string;
  resource: string;
  action: string;
  provider: string;
  executionSuccess: boolean;
  outcomeImproved: boolean;
  outcome: string;
  improvementScore: number | null;
  createdAt: string;
  detection: unknown;
  decision: unknown;
  execution: unknown;
};

export type LearningDashboard = {
  totalSamples: number;
  aiAccuracyPct: number | null;
  successRatePct: number | null;
  byAction: Record<string, { successRatePct: number; samples: number }>;
  byService: Record<string, { successRatePct: number; samples: number }>;
  latencyTrend: "rising" | "falling" | "stable" | "unknown";
  costTrend: "rising" | "falling" | "stable" | "unknown";
  learnedActionsCount: number;
  lowSuccessApprovalRecommended: boolean;
  recentLearned: Array<{
    id: string;
    resource: string;
    action: string;
    outcome: string;
    improved: boolean;
    improvementScore: number | null;
    createdAt: string;
  }>;
};

const EMPTY_DASHBOARD: LearningDashboard = {
  totalSamples: 0,
  aiAccuracyPct: null,
  successRatePct: null,
  byAction: {},
  byService: {},
  latencyTrend: "unknown",
  costTrend: "unknown",
  learnedActionsCount: 0,
  lowSuccessApprovalRecommended: false,
  recentLearned: [],
};

export async function fetchAiLearningDashboard(): Promise<LearningDashboard> {
  const { data } = await api.get<{ dashboard?: Partial<LearningDashboard> }>("/realtime/ai-learning/dashboard");
  const d = data?.dashboard;
  if (!d || typeof d !== "object") return { ...EMPTY_DASHBOARD };
  return {
    ...EMPTY_DASHBOARD,
    ...d,
    totalSamples: typeof d.totalSamples === "number" ? d.totalSamples : Number(d.totalSamples) || 0,
    byAction: d.byAction && typeof d.byAction === "object" ? d.byAction : {},
    byService: d.byService && typeof d.byService === "object" ? d.byService : {},
    recentLearned: Array.isArray(d.recentLearned) ? d.recentLearned : [],
    latencyTrend: d.latencyTrend ?? "unknown",
    costTrend: d.costTrend ?? "unknown",
    learnedActionsCount: typeof d.learnedActionsCount === "number" ? d.learnedActionsCount : 0,
    lowSuccessApprovalRecommended: Boolean(d.lowSuccessApprovalRecommended),
  };
}

export async function fetchAiLearningRecent(limit = 40): Promise<AiLearningRecord[]> {
  const { data } = await api.get<{ items?: AiLearningRecord[] }>("/realtime/ai-learning/recent", { params: { limit } });
  return Array.isArray(data?.items) ? data.items : [];
}
