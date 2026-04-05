import express, { Request, Response } from "express";
import { z } from "zod";
import {
  createWorkflow,
  getLatestVersion,
  getWorkflowVersion,
  getWorkflow,
  updateWorkflow,
  WorkflowCreateInput,
  WorkflowUpdateInput,
} from "../services/workflow.service";
import { startDeployment } from "../services/deploy.service";
import { triggerWorkflow } from "../services/execution.queue";

const router = express.Router();

const WorkflowTypeSchema = z.enum(["system", "user", "agent"]);

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
  type: WorkflowTypeSchema,
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

const UpdateWorkflowSchema = z.object({
  version: z.string().min(1).max(50),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

const SaveWorkflowSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

const RevertWorkflowSchema = z.object({
  version: z.union([z.number().int().positive(), z.string().min(1)]),
});

const DeployWorkflowSchema = z.object({
  namespace: z.string().min(1),
  strategy: z.enum(["canary", "rolling", "blueGreen"]).default("canary"),
  rolloutName: z.string().min(1).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const input: WorkflowCreateInput = parsed.data;
    const created = await createWorkflow(input);
    return res.status(201).json({
      ...created,
      ...(process.env.DATABASE_URL || process.env.MONGODB_URI
        ? {}
        : { warning: "EPHEMERAL_MODE_NO_DB: workflow stored in memory only; will be lost on restart." }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create workflow";
    const status = msg.toLowerCase().includes("postgres not configured") ? 503 : 500;
    return res.status(status).json({ error: "Failed to create workflow", details: msg });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const parsed = UpdateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const input: WorkflowUpdateInput = parsed.data;
    const updated = await updateWorkflow(workflowId, input);
    return res.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update workflow";
    const status =
      msg.toLowerCase().includes("postgres not configured")
        ? 503
        : msg.includes("not found") || msg.includes("Workflow not found")
          ? 404
          : 500;
    return res.status(status).json({ error: "Failed to update workflow", details: msg });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const wf = await getWorkflow(workflowId);
    return res.json(wf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to get workflow";
    const status = msg.toLowerCase().includes("postgres not configured") ? 503 : msg.includes("not found") || msg.includes("Workflow not found") ? 404 : 500;
    return res.status(status).json({ error: "Failed to get workflow", details: msg });
  }
});

router.get("/:id/version/latest", async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const latest = await getLatestVersion(workflowId);
    return res.json(latest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to get latest version";
    const status =
      msg.toLowerCase().includes("postgres not configured")
        ? 503
        : msg.includes("not found") || msg.includes("Workflow not found")
          ? 404
          : 500;
    return res.status(status).json({ error: "Failed to get latest version", details: msg });
  }
});

router.post("/:id/save", async (req: Request, res: Response) => {
  try {
    const parsed = SaveWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const workflowId = req.params.id;
    const current = await getWorkflow(workflowId);
    const nextVersion = incrementVersion(current.version);
    const updated = await updateWorkflow(workflowId, {
      version: nextVersion,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
    });
    return res.json({ workflowId, version: updated.version, saved: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save workflow";
    const status = msg.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ error: "Failed to save workflow", details: msg });
  }
});

router.post("/:id/revert", async (req: Request, res: Response) => {
  try {
    const parsed = RevertWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const workflowId = req.params.id;
    const version = normalizeVersion(parsed.data.version);
    const old = await getWorkflowVersion(workflowId, version);
    await updateWorkflow(workflowId, {
      version,
      nodes: old.nodes,
      edges: old.edges,
    });
    return res.json({ workflowId, revertedTo: version, nodes: old.nodes, edges: old.edges });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to revert workflow";
    const status = msg.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ error: "Failed to revert workflow", details: msg });
  }
});

router.post("/:id/deploy", async (req: Request, res: Response) => {
  try {
    const parsed = DeployWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const workflowId = req.params.id;
    const { namespace, strategy } = parsed.data;
    const rolloutName = parsed.data.rolloutName?.trim() || `wf-${workflowId.slice(0, 8)}`;

    const started = await startDeployment({
      workflowId,
      rolloutName,
      namespace,
      strategy,
    });

    await triggerWorkflow(workflowId);
    return res.status(202).json({
      success: true,
      workflowId,
      deploymentId: started.deploymentId,
      status: started.status,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to deploy workflow";
    return res.status(500).json({ error: "Failed to deploy workflow", details: msg });
  }
});

function normalizeVersion(v: string | number): string {
  if (typeof v === "number") return `v${v}`;
  const s = String(v).trim();
  return s.startsWith("v") ? s : `v${s}`;
}

function incrementVersion(current: string): string {
  const s = String(current || "").trim().toLowerCase();
  const numeric = s.startsWith("v") ? Number(s.slice(1)) : Number(s);
  if (!Number.isFinite(numeric) || numeric <= 0) return "v2";
  return `v${Math.floor(numeric) + 1}`;
}

export default router;

