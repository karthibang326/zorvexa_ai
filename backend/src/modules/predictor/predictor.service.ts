import { prisma } from "../../lib/prisma";

export interface PredictInput {
  historicalMetrics: Array<{ ts: string; cpu?: number; memory?: number; traffic?: number; errors?: number }>;
}

export async function predictFailure(input: PredictInput) {
  const samples = input.historicalMetrics ?? [];
  const avg = (key: "cpu" | "memory" | "traffic" | "errors") => {
    const values = samples.map((x) => Number(x[key] ?? 0)).filter((x) => Number.isFinite(x));
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };
  const cpu = avg("cpu");
  const memory = avg("memory");
  const traffic = avg("traffic");
  const errors = avg("errors");

  const riskScore = Math.min(1, cpu * 0.35 + memory * 0.3 + traffic * 0.2 + errors * 0.15);
  const failureProbability = Number((riskScore * 0.95).toFixed(3));

  let predictedIssue = "stable";
  if (memory > 0.8) predictedIssue = "memory_leak";
  else if (cpu > 0.8) predictedIssue = "cpu_spike";
  else if (traffic > 0.8) predictedIssue = "traffic_surge";
  else if (errors > 0.6) predictedIssue = "failure_probability_high";

  const recommendation =
    predictedIssue === "memory_leak"
      ? "pre-restart pods and increase memory limit"
      : predictedIssue === "cpu_spike"
        ? "scale deployment by +2 replicas"
        : predictedIssue === "traffic_surge"
          ? "scale up before peak traffic window"
          : predictedIssue === "failure_probability_high"
            ? "run automated diagnostic and canary rollback guard"
            : "no action required";

  const record = await prisma.predictionRecord.create({
    data: {
      predictedIssue,
      riskScore,
      failureProbability,
      recommendation,
      metadata: { cpu, memory, traffic, errors } as any,
    },
  });

  return {
    id: record.id,
    riskScore,
    predictedIssue,
    failureProbability,
    recommendation,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listPredictions(limit = 50) {
  const items = await prisma.predictionRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(200, limit)),
  });
  return items.map((x) => ({
    id: x.id,
    predictedIssue: x.predictedIssue,
    riskScore: x.riskScore,
    failureProbability: x.failureProbability,
    recommendation: x.recommendation,
    createdAt: x.createdAt.toISOString(),
    metadata: x.metadata,
  }));
}

