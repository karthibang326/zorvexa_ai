export interface VerifierInput {
  beforeMetrics: Record<string, number>;
  afterMetrics?: Record<string, number>;
}

export interface VerifierResult {
  resolved: boolean;
  status: "RESOLVED" | "UNRESOLVED";
  details: Record<string, unknown>;
}

export async function verificationService(input: VerifierInput): Promise<VerifierResult> {
  const after = input.afterMetrics ?? input.beforeMetrics;
  const beforeCpu = Number(input.beforeMetrics.cpu ?? 0);
  const afterCpu = Number(after.cpu ?? 0);
  const beforeCost = Number(input.beforeMetrics.cost ?? 0);
  const afterCost = Number(after.cost ?? 0);

  const resolved = (beforeCpu > 90 ? afterCpu <= 90 : true) && (beforeCost > 100 ? afterCost <= 100 : true);
  return {
    resolved,
    status: resolved ? "RESOLVED" : "UNRESOLVED",
    details: { before: input.beforeMetrics, after },
  };
}

