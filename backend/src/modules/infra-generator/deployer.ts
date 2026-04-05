import { cloudService } from "../cloud/cloud.service";

export async function deployGeneratedInfra(params: {
  cloud: "aws" | "gcp" | "azure";
  appName: string;
  dryRun: boolean;
}) {
  if (params.dryRun) {
    return {
      deployed: false,
      status: "DRY_RUN_ONLY",
      steps: ["terraform plan", "kubectl apply --dry-run=client"],
    };
  }

  const tf = await cloudService.execute({
    provider: params.cloud,
    operation: "deployWorkflow",
    workflowId: `infra-${params.appName}`,
  });
  const k8s = await cloudService.execute({
    provider: params.cloud,
    operation: "scaleDeployment",
    deploymentName: params.appName,
    namespace: "default",
    replicas: 2,
  });
  return {
    deployed: tf.ok && k8s.ok,
    status: tf.ok && k8s.ok ? "DEPLOYED" : "FAILED",
    steps: [tf.status, k8s.status],
  };
}

