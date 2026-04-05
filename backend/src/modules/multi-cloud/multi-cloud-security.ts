/**
 * Multi-cloud security — credentials are never passed through the AI decision payload.
 *
 * **AWS** — Prefer IAM roles for workloads (IRSA on EKS, instance profiles on EC2).
 * Use short-lived keys via STS; avoid long-lived access keys in production.
 * Env: `AWS_REGION`, `AWS_ROLE_ARN` / instance metadata, or `AWS_ACCESS_KEY_ID` (dev only).
 *
 * **GCP** — Workload Identity (GKE) or attached service account on Compute/GKE.
 * Env: `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON) or metadata server on GCE/GKE.
 *
 * **Azure** — Managed Identity on AKS/VMSS (`DefaultAzureCredential` chain).
 * Env: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE` (OIDC), or interactive dev login.
 *
 * **Kubernetes** — In-cluster `ServiceAccount` + least-privilege `Role` (see `backend/k8s/rbac/`).
 * Env: kubeconfig via `KUBECONFIG` or `~/.kube/config`.
 */

export const CREDENTIAL_ENV_HINTS = {
  aws: [
    "AWS_REGION",
    "AWS_ROLE_ARN",
    "AWS_WEB_IDENTITY_TOKEN_FILE",
    "AWS_ACCESS_KEY_ID",
    "AWS_ECS_CLUSTER",
    "AWS_ECS_SERVICE",
  ],
  gcp: ["GOOGLE_APPLICATION_CREDENTIALS", "GCP_PROJECT", "GCP_REGION"],
  azure: ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"],
  kubernetes: ["KUBECONFIG"],
} as const;
