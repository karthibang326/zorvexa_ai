import { validateDag } from "./dag.validator";
import { workflowRepository } from "./workflow.repository";
import { CreateWorkflowInput, SaveWorkflowInput } from "./workflow.schemas";

export const workflowService = {
  async list() {
    const rows = await workflowRepository.list();
    return rows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      type: "agent" as const,
      version: wf.version,
      status: wf.status,
      createdBy: wf.createdBy,
      createdAt: wf.createdAt.toISOString(),
      updatedAt: wf.updatedAt.toISOString(),
    }));
  },

  async create(input: CreateWorkflowInput, createdBy: string) {
    validateDag(input.nodes, input.edges);
    const wf = await workflowRepository.create({
      name: input.name,
      createdBy,
      nodes: input.nodes as any,
      edges: input.edges as any,
    });
    return wf;
  },

  async getById(id: string) {
    const wf = await workflowRepository.getById(id);
    if (!wf) throw new Error("Workflow not found");
    const latest = wf.versions?.[0];
    return {
      id: wf.id,
      name: wf.name,
      type: "agent",
      version: wf.version,
      status: wf.status,
      createdAt: wf.createdAt,
      updatedAt: wf.updatedAt,
      nodes: (latest?.nodes as any[]) ?? [],
      edges: (latest?.edges as any[]) ?? [],
    };
  },

  async saveVersion(id: string, input: SaveWorkflowInput) {
    validateDag(input.nodes, input.edges);
    const wf = await workflowRepository.saveVersion(id, input.nodes as any, input.edges as any);
    return {
      id: wf.id,
      version: wf.version,
      status: wf.status,
      updatedAt: wf.updatedAt,
      nodes: input.nodes,
      edges: input.edges,
    };
  },

  async revert(id: string, version: number) {
    const old = await workflowRepository.findVersion(id, version);
    if (!old) throw new Error("Workflow version not found");
    await workflowRepository.setVersion(id, version);
    return old;
  },
};

