/** Thrown when confidence is below the configured minimum — never call cloud APIs. */
export class SafetyBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafetyBlockedError";
  }
}

export function assertExecutorSafety(confidence: number, minConfidence: number): void {
  if (confidence < minConfidence) {
    throw new SafetyBlockedError(
      `Low confidence (${confidence.toFixed(3)}) — minimum ${minConfidence} required; action blocked`
    );
  }
}
