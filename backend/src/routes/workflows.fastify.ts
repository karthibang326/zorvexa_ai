import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createWorkflow, getLatestVersion, getWorkflow, getWorkflowVersion, updateWorkflow } from "../services/workflow.service";
import { startDeployment } from "../services/deploy.service";
import { triggerWorkflow } from "../services/execution.queue";

export default async function workflowRoutes(app: FastifyInstance) {
  app.post("/", async (req, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(["system", "user", "agent"]),
      nodes: z.array(z.any()).default([]),
      edges: z.array(z.any()).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload", details: parsed.error.message });
    const created = await createWorkflow(parsed.data);
    return reply.code(201).send(created);
  });

  app.post("/:id/save", async (req, reply) => {
    const schema = z.object({ nodes: z.array(z.any()), edges: z.array(z.any()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload", details: parsed.error.message });
    const id = (req.params as any).id as string;
    const curr = await getWorkflow(id);
    const nextVersion = incrementVersion(curr.version);
    const updated = await updateWorkflow(id, { version: nextVersion, nodes: parsed.data.nodes, edges: parsed.data.edges });
    return { workflowId: id, version: updated.version, saved: true };
  });

  app.post("/:id/revert", async (req, reply) => {
    const schema = z.object({ version: z.union([z.number().int().positive(), z.string().min(1)]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload", details: parsed.error.message });
    const id = (req.params as any).id as string;
    const version = normalizeVersion(parsed.data.version);
    const old = await getWorkflowVersion(id, version);
    await updateWorkflow(id, { version, nodes: old.nodes, edges: old.edges });
    return { workflowId: id, revertedTo: version, nodes: old.nodes, edges: old.edges };
  });

  app.post("/:id/deploy", async (req, reply) => {
    const schema = z.object({
      namespace: z.string().min(1),
      strategy: z.enum(["canary", "rolling", "blueGreen"]).default("canary"),
      rolloutName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload", details: parsed.error.message });
    const id = (req.params as any).id as string;
    const rolloutName = parsed.data.rolloutName?.trim() || `wf-${id.slice(0, 8)}`;
    const started = await startDeployment({
      workflowId: id,
      rolloutName,
      namespace: parsed.data.namespace,
      strategy: parsed.data.strategy,
    });
    await triggerWorkflow(id);
    return reply.code(202).send({ success: true, workflowId: id, deploymentId: started.deploymentId, status: started.status });
  });

  app.get("/:id", async (req) => {
    const id = (req.params as any).id as string;
    return await getWorkflow(id);
  });

  app.get("/:id/version/latest", async (req) => {
    const id = (req.params as any).id as string;
    return await getLatestVersion(id);
  });
}

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

