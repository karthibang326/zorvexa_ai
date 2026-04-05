export type FeedbackOutcome = { success: boolean };

type DecisionConfidence = { action: string; reason: string; confidence: number };

/**
 * Online-style confidence nudge from execution outcome.
 * High-impact actions move confidence down more on failure; stable "none" path moves little.
 */
export function feedbackLoop(decision: DecisionConfidence, outcome: FeedbackOutcome): { improvedConfidence: number } {
  const highImpact = /scale|restart|rollback|isolate/i.test(decision.action);
  const delta = outcome.success ? (highImpact ? 0.008 : 0.012) : highImpact ? -0.07 : -0.04;
  const improvedConfidence = Math.min(0.999, Math.max(0.01, decision.confidence + delta));
  return { improvedConfidence };
}
