import fs from "fs";
import path from "path";
import os from "os";
import { env } from "../../config/env";
import type { AiTargetProvider } from "../ai-decision-engine/types";
import { CREDENTIAL_ENV_HINTS } from "./multi-cloud-security";

export type CloudControlPlaneStatus = {
  id: AiTargetProvider;
  label: string;
  connected: boolean;
  authMode: string;
  detail?: string;
};

function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function kubeconfigLikelyPresent(): boolean {
  const kc = process.env.KUBECONFIG;
  if (kc) {
    const first = kc.split(path.delimiter)[0]?.trim();
    if (first && fs.existsSync(first)) return true;
  }
  const def = path.join(os.homedir(), ".kube", "config");
  return fs.existsSync(def);
}

/**
 * Lightweight credential presence checks for dashboard “connection” indicators (not full auth tests).
 */
export function getMultiCloudControlPlaneStatus(): CloudControlPlaneStatus[] {
  const awsIam =
    envSet("AWS_ROLE_ARN") ||
    envSet("AWS_WEB_IDENTITY_TOKEN_FILE") ||
    (envSet("AWS_ACCESS_KEY_ID") && envSet("AWS_SECRET_ACCESS_KEY"));
  const awsEcsReady =
    env.AWS_ECS_LIVE_EXECUTION === "true" &&
    Boolean(env.AWS_ECS_CLUSTER.trim() && env.AWS_ECS_SERVICE.trim() && env.AWS_REGION.trim());
  const gcp = envSet("GOOGLE_APPLICATION_CREDENTIALS") || envSet("GCP_PROJECT");
  const azure =
    envSet("AZURE_CLIENT_ID") && envSet("AZURE_TENANT_ID") ||
    envSet("AZURE_SUBSCRIPTION_ID");

  return [
    {
      id: "aws",
      label: "AWS (ECS / EKS / IAM)",
      connected: awsIam,
      authMode: envSet("AWS_ROLE_ARN")
        ? "IAM role / IRSA"
        : awsIam
          ? "IAM access keys or instance profile"
          : "Not configured",
      detail: [
        CREDENTIAL_ENV_HINTS.aws.join(", "),
        awsEcsReady ? "ECS targets configured (needs IAM for live API)" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      id: "gcp",
      label: "GCP (GKE / Compute)",
      connected: gcp,
      authMode: gcp ? "Service account JSON or Workload Identity" : "Not configured",
      detail: CREDENTIAL_ENV_HINTS.gcp.join(", "),
    },
    {
      id: "azure",
      label: "Azure (AKS / VMSS)",
      connected: Boolean(azure),
      authMode: azure ? "Managed Identity / service principal" : "Not configured",
      detail: CREDENTIAL_ENV_HINTS.azure.join(", "),
    },
    {
      id: "kubernetes",
      label: "Kubernetes (kubeconfig)",
      connected: kubeconfigLikelyPresent(),
      authMode: kubeconfigLikelyPresent() ? "kubeconfig file" : "Not configured",
      detail: CREDENTIAL_ENV_HINTS.kubernetes.join(", "),
    },
  ];
}
