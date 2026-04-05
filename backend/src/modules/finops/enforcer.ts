import { env } from "../../config/env";
import { cloudService } from "../cloud/cloud.service";
import { selfHealingService } from "../self-healing/self-healing.service";
import { getCostRecords } from "./cost-collector";

let enforcementCounter: { day: string; count: number } = { day: new Date().toISOString().slice(0, 10), count: 0 };

function resetIfNewDay() {
  const d = new Date().toISOString().slice(0, 10);
  if (enforcementCounter.day !== d) enforcementCounter = { day: d, count: 0 };
}

export async function enforceBudget(params?: { threshold?: number; provider?: "aws" | "gcp" | "azure" }) {
  resetIfNewDay();
  if (enforcementCounter.count >= env.FINOPS_MAX_ENFORCEMENTS_PER_DAY) {
    return { enforced: false, status: "BLOCKED_DAILY_LIMIT" };
  }

  const threshold = params?.threshold ?? env.FINOPS_BUDGET_THRESHOLD_DAILY;
  const records = await getCostRecords(200);
  const today = new Date().toISOString().slice(0, 10);
  const total = records
    .filter((r) => r.timestamp.toISOString().slice(0, 10) === today)
    .reduce((s, r) => s + r.cost, 0);

  if (total <= threshold) return { enforced: false, status: "UNDER_BUDGET", total, threshold };

  if (env.FINOPS_APPROVAL_MODE === "manual") {
    return { enforced: false, status: "PENDING_MANUAL_APPROVAL", total, threshold };
  }

  const provider = params?.provider ?? "aws";
  const scale = await cloudService.execute({
    provider,
    operation: "scaleDeployment",
    deploymentName: "default",
    namespace: "default",
    replicas: 1,
  });
  const heal = await selfHealingService.trigger({
    source: "ANOMALY",
    provider,
    metrics: { cost: total, cpu: 20, memory: 20 },
  });

  enforcementCounter.count += 1;
  return {
    enforced: true,
    status: "BUDGET_ACTION_EXECUTED",
    total,
    threshold,
    actions: [scale.status, (heal as any)?.decision?.action ?? "NOOP"],
  };
}

