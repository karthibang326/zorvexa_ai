import * as k8s from "@kubernetes/client-node";
import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2";
import { env } from "../../config/env";

export type InfraConnectivity = {
  kubernetes: { ok: boolean; message: string };
  aws: { ok: boolean; message: string };
  gcp: { ok: boolean; message: string };
};

export async function getInfraConnectivity(): Promise<InfraConnectivity> {
  const kubernetes = await checkKubernetes();
  const aws = await checkAws();
  const gcp = { ok: false, message: "Not configured (set GOOGLE_APPLICATION_CREDENTIALS / project)" };
  return { kubernetes, aws, gcp };
}

async function checkKubernetes(): Promise<{ ok: boolean; message: string }> {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (!kc.getCurrentCluster()) {
      return { ok: false, message: "No current cluster in kubeconfig" };
    }
    return { ok: true, message: `Cluster: ${kc.getCurrentCluster()?.name ?? "default"}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Kubeconfig unavailable" };
  }
}

async function checkAws(): Promise<{ ok: boolean; message: string }> {
  const region = env.AWS_REGION || "us-east-1";
  try {
    const hasKeys = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
    const client = new EC2Client({
      region,
      ...(hasKeys
        ? {
            credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
    await client.send(new DescribeRegionsCommand({ RegionNames: [region] }));
    return { ok: true, message: `EC2 reachable (${region})` };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "AWS SDK check failed",
    };
  }
}
