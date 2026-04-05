import { z } from "zod";
import { CloudProvider } from "./cloud.types";

export type AuthMethod = "iam_role" | "access_keys" | "gcp_sa" | "azure_sp";

export const AuthMethodSchema = z.enum(["iam_role", "access_keys", "gcp_sa", "azure_sp"]);

export type LaunchCredentials = {
  roleArn?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  externalId?: string;
  region?: string;
  serviceAccountJson?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  subscriptionId?: string;
};

export type ValidateInput = {
  provider: CloudProvider;
  authMethod: AuthMethod;
  credentials: LaunchCredentials;
};

export type ValidateResult = {
  ok: boolean;
  message: string;
  accountId?: string;
  regions?: string[];
  errorCode?: string;
  simulated?: boolean;
};

const AWS_ROLE_ARN = /^arn:aws:iam::(\d{12}):role\/[\w+=,.@/-]+$/;

export function validateConnectionFormat(input: ValidateInput): ValidateResult {
  const { provider, authMethod, credentials } = input;
  if (provider === "aws") {
    if (authMethod === "iam_role") {
      const arn = credentials.roleArn?.trim() ?? "";
      if (!arn) return { ok: false, message: "IAM Role ARN is required", errorCode: "MISSING_ARN" };
      const m = AWS_ROLE_ARN.exec(arn);
      if (!m) {
        return {
          ok: false,
          message: "Invalid IAM Role ARN. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME",
          errorCode: "INVALID_ARN",
        };
      }
      return {
        ok: true,
        message: "Role ARN format is valid. Test connection verifies trust and external ID (if any).",
        accountId: m[1],
        regions: credentials.region?.trim() ? [credentials.region.trim()] : ["us-east-1", "eu-west-1"],
        simulated: true,
      };
    }
    if (authMethod === "access_keys") {
      const ak = credentials.accessKeyId?.trim() ?? "";
      const sk = credentials.secretAccessKey?.trim() ?? "";
      if (!ak || !sk) return { ok: false, message: "Access Key ID and Secret Access Key are required", errorCode: "MISSING_KEYS" };
      if (ak.length < 16 || ak.length > 128) return { ok: false, message: "Access Key ID length looks invalid", errorCode: "INVALID_AK" };
      if (sk.length < 20) return { ok: false, message: "Secret Access Key looks too short", errorCode: "INVALID_SK" };
      return {
        ok: true,
        message: "Credential shape accepted. Prefer IAM Role for production (no long-lived keys).",
        accountId: undefined,
        regions: credentials.region?.trim() ? [credentials.region.trim()] : ["us-east-1"],
        simulated: true,
      };
    }
    return { ok: false, message: "Choose IAM Role (recommended) or Access keys", errorCode: "AUTH_METHOD" };
  }
  if (provider === "gcp") {
    if (authMethod !== "gcp_sa") return { ok: false, message: "Use a service account JSON key for GCP", errorCode: "AUTH_METHOD" };
    const j = credentials.serviceAccountJson?.trim() ?? "";
    if (!j) return { ok: false, message: "Service account JSON is required", errorCode: "MISSING_SA" };
    try {
      const o = JSON.parse(j) as { type?: string; project_id?: string };
      if (o.type !== "service_account") return { ok: false, message: "JSON must be a service account key (type: service_account)", errorCode: "INVALID_SA_TYPE" };
      return {
        ok: true,
        message: "Service account JSON structure looks valid.",
        accountId: o.project_id,
        regions: ["us-central1", "europe-west1"],
        simulated: true,
      };
    } catch {
      return { ok: false, message: "Invalid JSON", errorCode: "INVALID_JSON" };
    }
  }
  if (provider === "azure") {
    if (authMethod !== "azure_sp") return { ok: false, message: "Use an Azure service principal", errorCode: "AUTH_METHOD" };
    const { tenantId, clientId, clientSecret, subscriptionId } = credentials;
    if (!tenantId?.trim() || !clientId?.trim() || !clientSecret?.trim() || !subscriptionId?.trim()) {
      return { ok: false, message: "Tenant ID, Client ID, Client Secret, and Subscription ID are required", errorCode: "MISSING_AZURE" };
    }
    return {
      ok: true,
      message: "Azure credential fields are present.",
      accountId: subscriptionId.trim(),
      regions: ["eastus", "westeurope"],
      simulated: true,
    };
  }
  return { ok: false, message: "Unknown provider", errorCode: "UNKNOWN" };
}

export type DiscoveryResult = {
  accountId: string;
  regions: string[];
  clusters: Array<{ name: string; region: string; status: string }>;
  services: string[];
  nodes: { total: number; ready: number };
};

export function discoverInfra(provider: CloudProvider, _region?: string): DiscoveryResult {
  if (provider === "aws") {
    return {
      accountId: "123456789012",
      regions: ["us-east-1", "eu-west-1", "ap-south-1"],
      clusters: [
        { name: "eks-prod-core", region: "us-east-1", status: "ACTIVE" },
        { name: "eks-prod-edge", region: "eu-west-1", status: "ACTIVE" },
        { name: "eks-staging", region: "us-east-1", status: "UPDATING" },
      ],
      services: ["payments-api", "auth-service", "ingress-nginx"],
      nodes: { total: 42, ready: 41 },
    };
  }
  if (provider === "gcp") {
    return {
      accountId: "my-gcp-project",
      regions: ["us-central1", "europe-west1"],
      clusters: [
        { name: "gke-core", region: "us-central1", status: "RUNNING" },
        { name: "gke-analytics", region: "europe-west1", status: "RUNNING" },
      ],
      services: ["payments-api", "dataflow-jobs"],
      nodes: { total: 28, ready: 28 },
    };
  }
  return {
    accountId: "sub-prod-azure",
    regions: ["westeurope", "southeastasia"],
    clusters: [
      { name: "aks-core", region: "westeurope", status: "Succeeded" },
      { name: "aks-frontend", region: "southeastasia", status: "Succeeded" },
    ],
    services: ["api-gateway", "container-apps"],
    nodes: { total: 36, ready: 35 },
  };
}

/** Full test path: format validation only in this build (no outbound STS). */
export function testConnection(input: ValidateInput): ValidateResult {
  const base = validateConnectionFormat(input);
  if (!base.ok) return base;
  return {
    ...base,
    message: base.simulated
      ? `${base.message} Simulated OK — wire STS/EKS APIs for live verification.`
      : base.message,
    simulated: true,
  };
}
