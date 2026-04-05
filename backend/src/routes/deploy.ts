import express, { Request, Response } from "express";
import { z } from "zod";
import { getDeploymentStatus, startDeployment, stopDeployment } from "../services/deploy.service";
import { DeployStrategy } from "../services/deploy.service";

const router = express.Router();

const DeployStrategySchema = z.enum(["canary", "rolling", "blueGreen"]);

const DeployStartSchema = z.object({
  workflowId: z.string().min(1),
  rolloutName: z.string().min(1),
  namespace: z.string().min(1),
  strategy: DeployStrategySchema,
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = DeployStartSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const input = parsed.data as {
      workflowId: string;
      rolloutName: string;
      namespace: string;
      strategy: DeployStrategy;
    };

    const started = await startDeployment(input);
    return res.status(202).json(started);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to start deployment";
    const status = msg.toLowerCase().includes("postgres not configured") ? 503 : 500;
    return res.status(status).json({ error: "Failed to start deployment", details: msg });
  }
});

router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const deploymentId = req.params.id;
    const status = await getDeploymentStatus(deploymentId);
    return res.json(status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to get deployment status";
    const statusCode = msg.toLowerCase().includes("postgres not configured")
      ? 503
      : msg.toLowerCase().includes("not found")
        ? 404
        : 500;
    return res.status(statusCode).json({ error: "Failed to get deployment status", details: msg });
  }
});

router.post("/:id/stop", async (req: Request, res: Response) => {
  try {
    const deploymentId = req.params.id;
    const result = await stopDeployment(deploymentId);
    return res.json({
      deploymentId: result.deploymentId,
      status: result.status,
      message: result.message ?? "Stopped",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to stop deployment";
    const statusCode = msg.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ error: "Failed to stop deployment", details: msg });
  }
});

export default router;

