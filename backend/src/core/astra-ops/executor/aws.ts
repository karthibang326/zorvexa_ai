import { EC2Client, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { env } from "../../../config/env";

function ec2Client(): EC2Client {
  const region = env.AWS_REGION || "us-east-1";
  const hasStaticCreds = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
  return new EC2Client({
    region,
    ...(hasStaticCreds
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
}

/** Start a stopped EC2 instance (requires ec2:StartInstances on the instance). */
export async function startEc2Instance(instanceId: string): Promise<void> {
  const ec2 = ec2Client();
  await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
}
