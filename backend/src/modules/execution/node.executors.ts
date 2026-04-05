import { prisma } from "../../lib/prisma";
import { cloudService } from "../cloud/cloud.service";

export async function executeNode(node: any): Promise<{ ok: boolean; message: string }> {
  const t = String(node.type || "GENERIC").toUpperCase();
  const provider = node.provider as "aws" | "gcp" | "azure" | undefined;
  if (provider) {
    const operation = String(node.config?.operation || "deployWorkflow");
    if (operation === "getMetrics") {
      const metrics = await cloudService.metrics(provider);
      return { ok: true, message: `Cloud metrics ${provider}: ${JSON.stringify(metrics[0])}` };
    }
    const out = await cloudService.execute({
      provider,
      operation: operation as any,
      namespace: node.config?.namespace,
      deploymentName: node.config?.deploymentName,
      serviceName: node.config?.serviceName,
      clusterName: node.config?.clusterName,
      region: node.config?.region,
      replicas: node.config?.replicas,
      workflowId: node.config?.workflowId,
    });
    if (!out.ok) throw new Error(out.status);
    return { ok: true, message: `${provider.toUpperCase()} ${out.status}` };
  }

  switch (t) {
    case "HTTP": {
      const url = String(node.config?.url || "");
      if (!url) throw new Error("HTTP node missing config.url");
      const res = await fetch(url, { method: String(node.config?.method || "GET") });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { ok: true, message: `HTTP ${res.status}` };
    }
    case "SQL": {
      const query = String(node.config?.query || "");
      if (!query) throw new Error("SQL node missing config.query");
      await prisma.$queryRawUnsafe(query);
      return { ok: true, message: "SQL executed" };
    }
    case "AI": {
      return { ok: true, message: "AI placeholder executed" };
    }
    case "K8S": {
      return { ok: true, message: "Kubernetes action placeholder executed" };
    }
    default:
      return { ok: true, message: "Generic step completed" };
  }
}

