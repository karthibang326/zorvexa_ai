import { env } from "../../../config/env";
import { getAiDecisionsQueue } from "../../../lib/queue";
import { logInfo, logWarn } from "../../../lib/logger";
import { detectAnomalies } from "../ai/detector";
import { listRecentWorkloadsForLoop } from "../../../modules/astra-ops/astra-ops.repository";
import type { AstraAnalyzeJobPayload } from "../../../modules/astra-ops/astra-ops.types";

const COOLDOWN_MS = 10 * 60 * 1000;
const lastEnqueued = new Map<string, number>();

export type ControlLoopStats = {
  observed: number;
  anomalies: number;
  enqueued: number;
  at: string | null;
};

let lastTick: ControlLoopStats = { observed: 0, anomalies: 0, enqueued: 0, at: null };

export function getLastControlLoopStats(): ControlLoopStats {
  return lastTick;
}

/**
 * FAANG-style control plane tick: OBSERVE → DETECT → (enqueue DECIDE→ACT pipeline).
 * Does not duplicate execution — uses existing AI + executor workers.
 */
export async function runControlLoopTick(orgScope: {
  orgId: string;
  projectId: string;
  envId: string;
}): Promise<{ observed: number; anomalies: number; enqueued: number }> {
  if (!process.env.DATABASE_URL) {
    return { observed: 0, anomalies: 0, enqueued: 0 };
  }

  const rows = await listRecentWorkloadsForLoop(80);
  const anomalies = detectAnomalies(rows);
  let enqueued = 0;
  const now = Date.now();

  for (const w of anomalies) {
    const key = w.id;
    const last = lastEnqueued.get(key) ?? 0;
    if (now - last < COOLDOWN_MS) continue;

    const payload: AstraAnalyzeJobPayload = {
      workload: w,
      scope: orgScope,
    };

    try {
      await getAiDecisionsQueue().add("analyze", payload, {
        jobId: `astra-ai-loop-${key}-${Math.floor(now / COOLDOWN_MS)}`,
        removeOnComplete: { age: 3600, count: 2000 },
      });
      lastEnqueued.set(key, now);
      enqueued += 1;
    } catch (e) {
      logWarn("control_loop_enqueue_failed", {
        workloadId: key,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (enqueued > 0) {
    logInfo("control_loop_tick", { observed: rows.length, anomalies: anomalies.length, enqueued });
  }

  lastTick = {
    observed: rows.length,
    anomalies: anomalies.length,
    enqueued,
    at: new Date().toISOString(),
  };

  return { observed: rows.length, anomalies: anomalies.length, enqueued };
}

let timer: NodeJS.Timeout | null = null;

export function startControlLoop(
  intervalMs: number,
  scope: { orgId: string; projectId: string; envId: string }
): void {
  if (timer) return;
  if (env.ASTRA_CONTROL_LOOP_ENABLED !== "true") return;

  const tick = () => {
    void runControlLoopTick(scope).catch((e) =>
      logWarn("control_loop_tick_error", { message: e instanceof Error ? e.message : String(e) })
    );
  };
  tick();
  timer = setInterval(tick, Math.max(5000, intervalMs));
  logInfo("control_loop_started", { intervalMs, orgId: scope.orgId });
}

export function stopControlLoop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
