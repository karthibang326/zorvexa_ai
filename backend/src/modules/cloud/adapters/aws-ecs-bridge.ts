import { env } from "../../../config/env";
import type { CloudActionResult, CloudOperationParams } from "../cloud.types";

function ecsTarget(params: CloudOperationParams): { cluster: string; service: string } | null {
  if (process.env.NODE_ENV === "test") return null;
  if (env.SIMULATION_MODE === "true" || env.AWS_ECS_LIVE_EXECUTION !== "true") return null;
  const cluster = (params.clusterName ?? env.AWS_ECS_CLUSTER).trim();
  const service = (params.deploymentName ?? params.serviceName ?? env.AWS_ECS_SERVICE).trim();
  if (!cluster || !service) return null;
  return { cluster, service };
}

function ecsRegion(): string {
  return env.AWS_REGION.trim() || "us-east-1";
}

/**
 * Live ECS desired count. Requires IAM ecs:UpdateService on the cluster/service.
 */
export async function runEcsScale(params: CloudOperationParams): Promise<CloudActionResult | null> {
  const t = ecsTarget(params);
  if (!t) return null;
  const replicas = Math.max(1, Math.min(5000, params.replicas ?? 2));
  try {
    const { ECSClient, UpdateServiceCommand } = await import("@aws-sdk/client-ecs");
    const client = new ECSClient({ region: ecsRegion() });
    const out = await client.send(
      new UpdateServiceCommand({
        cluster: t.cluster,
        service: t.service,
        desiredCount: replicas,
      })
    );
    return {
      ok: true,
      status: "AWS_ECS_SCALE_LIVE",
      provider: "aws",
      details: {
        live: true,
        engine: "ecs",
        cluster: t.cluster,
        service: t.service,
        desiredCount: replicas,
        serviceArn: out.service?.serviceArn,
      },
    };
  } catch (e) {
    return {
      ok: false,
      status: "AWS_ECS_SCALE_FAILED",
      provider: "aws",
      details: {
        live: true,
        engine: "ecs",
        error: e instanceof Error ? e.message : String(e),
        cluster: t.cluster,
        service: t.service,
      },
    };
  }
}

/** Rolling replacement via ECS forceNewDeployment. */
export async function runEcsRestart(params: CloudOperationParams): Promise<CloudActionResult | null> {
  const t = ecsTarget(params);
  if (!t) return null;
  try {
    const { ECSClient, UpdateServiceCommand } = await import("@aws-sdk/client-ecs");
    const client = new ECSClient({ region: ecsRegion() });
    const out = await client.send(
      new UpdateServiceCommand({
        cluster: t.cluster,
        service: t.service,
        forceNewDeployment: true,
      })
    );
    return {
      ok: true,
      status: "AWS_ECS_RESTART_LIVE",
      provider: "aws",
      details: {
        live: true,
        engine: "ecs",
        cluster: t.cluster,
        service: t.service,
        serviceArn: out.service?.serviceArn,
      },
    };
  } catch (e) {
    return {
      ok: false,
      status: "AWS_ECS_RESTART_FAILED",
      provider: "aws",
      details: {
        live: true,
        engine: "ecs",
        error: e instanceof Error ? e.message : String(e),
        cluster: t.cluster,
        service: t.service,
      },
    };
  }
}
