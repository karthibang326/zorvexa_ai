export type HealingAction = "SCALE_UP" | "LIMIT_RESOURCES" | "ROLLBACK" | "RESTART_POD" | "NOOP";

export interface DecisionInput {
  metrics: Record<string, number>;
  reasons: string[];
  aiSuggestedActions: string[];
}

export interface DecisionResult {
  action: HealingAction;
  confidence: number;
  rationale: string;
}

export function decisionEngine(input: DecisionInput): DecisionResult {
  const cpu = Number(input.metrics.cpu ?? 0);
  const cost = Number(input.metrics.cost ?? 0);
  const repeatedFailure = input.reasons.some((r) => /repeated run failures/i.test(r));

  if (cpu > 90) {
    return { action: "SCALE_UP", confidence: 0.92, rationale: "Rule matched: CPU > 90" };
  }
  if (cost > 100) {
    return { action: "LIMIT_RESOURCES", confidence: 0.89, rationale: "Rule matched: cost spike" };
  }
  if (repeatedFailure) {
    return { action: "ROLLBACK", confidence: 0.9, rationale: "Rule matched: repeated failures" };
  }

  const aiText = input.aiSuggestedActions.join(" ").toLowerCase();
  if (aiText.includes("scale")) return { action: "SCALE_UP", confidence: 0.7, rationale: "AI suggested scaling" };
  if (aiText.includes("rollback")) return { action: "ROLLBACK", confidence: 0.7, rationale: "AI suggested rollback" };
  if (aiText.includes("restart")) return { action: "RESTART_POD", confidence: 0.65, rationale: "AI suggested restart" };

  return { action: "NOOP", confidence: 0.5, rationale: "No deterministic action applicable" };
}

