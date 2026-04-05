import express, { Request, Response } from "express";
import { z } from "zod";
import { enqueueRun } from "../services/run.queue";
import { getRun, listRuns, triggerRun } from "../services/run.service";
import { incRunsRetried, incRunsTriggered } from "../services/metrics";

const router = express.Router();

const TriggerSchema = z.object({
  workflowId: z.string().min(1),
  version: z.string().optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  retryOf: z.string().optional(),
});

router.post("/trigger", async (req: Request, res: Response) => {
  try {
    const parsed = TriggerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const run = await triggerRun({
      workflowId: parsed.data.workflowId,
      workflowVersion: parsed.data.version,
      idempotencyKey: parsed.data.idempotencyKey,
      retryOf: parsed.data.retryOf,
    });
    incRunsTriggered();
    await enqueueRun(run.id);
    return res.status(202).json(run);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to trigger run";
    return res.status(500).json({ error: "Failed to trigger run", details: msg });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const runs = await listRuns(Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50);
    return res.json({ items: runs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list runs";
    return res.status(500).json({ error: "Failed to list runs", details: msg });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await getRun(req.params.id);
    return res.json(item);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to get run";
    const status = msg.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ error: "Failed to get run", details: msg });
  }
});

router.post("/:id/retry", async (req: Request, res: Response) => {
  try {
    const base = await getRun(req.params.id);
    const run = await triggerRun({
      workflowId: base.workflowId,
      workflowVersion: base.workflowVersion,
      idempotencyKey: `retry:${base.id}:${Date.now()}`,
      retryOf: base.id,
    });
    incRunsRetried();
    incRunsTriggered();
    await enqueueRun(run.id);
    return res.status(202).json(run);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to retry run";
    return res.status(500).json({ error: "Failed to retry run", details: msg });
  }
});

export default router;

