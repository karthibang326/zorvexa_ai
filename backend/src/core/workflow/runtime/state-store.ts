import { prisma } from "../../../lib/prisma";
import type { RuntimeState } from "./types";

const STATE_STEP_ID = "__runtime_state";

export async function persistRuntimeState(runId: string, state: RuntimeState) {
  const prismaAny = prisma as any;
  await prismaAny.runStepLog.create({
    data: {
      runId,
      stepId: STATE_STEP_ID,
      stepName: "RuntimeState",
      stepType: "STATE",
      status: state.status,
      message: JSON.stringify(state),
      attempt: 1,
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });
}

export async function readLatestRuntimeState(runId: string): Promise<RuntimeState | null> {
  const prismaAny = prisma as any;
  const row = await prismaAny.runStepLog.findFirst({
    where: { runId, stepId: STATE_STEP_ID },
    orderBy: { createdAt: "desc" },
  });
  if (!row?.message) return null;
  try {
    return JSON.parse(String(row.message)) as RuntimeState;
  } catch {
    return null;
  }
}
