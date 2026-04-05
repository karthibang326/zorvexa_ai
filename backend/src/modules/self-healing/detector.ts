import { prisma } from "../../lib/prisma";

export interface DetectionInput {
  runId?: string;
  workflowId?: string;
  metrics?: Record<string, number>;
}

export interface DetectionResult {
  detected: boolean;
  reasons: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  metrics: Record<string, number>;
}

export async function detectorService(input: DetectionInput): Promise<DetectionResult> {
  const metrics = input.metrics ?? {};
  const cpu = Number(metrics.cpu ?? 0);
  const memory = Number(metrics.memory ?? 0);
  const cost = Number(metrics.cost ?? 0);

  const reasons: string[] = [];
  let severity: DetectionResult["severity"] = "LOW";

  if (cpu > 90) {
    reasons.push("CPU spike detected (>90%)");
    severity = "HIGH";
  }
  if (memory > 90) {
    reasons.push("Memory pressure detected (>90%)");
    if (severity !== "HIGH") severity = "MEDIUM";
  }
  if (cost > 100) {
    reasons.push("Cost spike detected");
    if (severity === "LOW") severity = "MEDIUM";
  }

  if (input.workflowId && process.env.DATABASE_URL) {
    try {
      const failedCount = await prisma.run.count({
        where: {
          workflowId: input.workflowId,
          status: "FAILED",
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (failedCount >= 3) {
        reasons.push("Repeated run failures detected");
        severity = "HIGH";
      }
    } catch {
      // ignore
    }
  }

  return {
    detected: reasons.length > 0,
    reasons,
    severity,
    metrics,
  };
}

