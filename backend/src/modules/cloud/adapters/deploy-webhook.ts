import { env } from "../../../config/env";
import type { CloudActionResult, CloudOperationParams, CloudProvider } from "../cloud.types";

/**
 * POSTs a deploy event to your CI/CD or orchestrator when URL is set and SIMULATION_MODE is off.
 * Same URL can serve all providers; body includes `provider` for routing.
 */
export async function tryDeployWebhook(
  provider: CloudProvider,
  params: CloudOperationParams
): Promise<CloudActionResult | null> {
  const url = env.CLOUD_DEPLOY_WEBHOOK_URL.trim();
  if (!url || process.env.NODE_ENV === "test") return null;
  if (env.SIMULATION_MODE === "true") return null;

  const body = {
    event: "cloud_deploy_workflow",
    provider,
    workflowId: params.workflowId ?? null,
    workflow: params.workflow ?? null,
    region: params.region ?? null,
    namespace: params.namespace ?? null,
    deploymentName: params.deploymentName ?? null,
    serviceName: params.serviceName ?? null,
    clusterName: params.clusterName ?? null,
    ts: new Date().toISOString(),
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const tok = env.CLOUD_DEPLOY_WEBHOOK_BEARER_TOKEN.trim();
  if (tok) headers.Authorization = `Bearer ${tok}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    const ok = res.ok;
    return {
      ok,
      status: ok ? "DEPLOY_WEBHOOK_ACCEPTED" : "DEPLOY_WEBHOOK_REJECTED",
      provider,
      details: {
        live: true,
        httpStatus: res.status,
        bodyPreview: text.slice(0, 800),
      },
    };
  } catch (e) {
    return {
      ok: false,
      status: "DEPLOY_WEBHOOK_FAILED",
      provider,
      details: { live: true, error: e instanceof Error ? e.message : String(e) },
    };
  } finally {
    clearTimeout(timer);
  }
}
