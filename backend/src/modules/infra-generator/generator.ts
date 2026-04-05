import { readFileSync } from "fs";
import path from "path";
import { callLLM } from "../../lib/llm";
import { InfraPlan } from "./planner";

function render(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`\${${key}}`, String(value)),
    template
  );
}

export async function generateInfraCode(plan: InfraPlan, prompt: string) {
  const tfTemplate = readFileSync(
    path.resolve(__dirname, "./templates/terraform/aws-eks.tf.tpl"),
    "utf8"
  );
  const k8sTemplate = readFileSync(
    path.resolve(__dirname, "./templates/k8s/deployment.yaml.tpl"),
    "utf8"
  );
  const helmTemplate = readFileSync(
    path.resolve(__dirname, "./templates/helm/values.yaml.tpl"),
    "utf8"
  );
  const helmDeploymentTemplate = readFileSync(
    path.resolve(__dirname, "./templates/helm/deployment.yaml.tpl"),
    "utf8"
  );

  const base = {
    appName: plan.appName,
    replicas: plan.scaling ? 3 : 1,
    image: "node:20-alpine",
    region: plan.region,
    clusterName: `${plan.appName}-${plan.cloud}`,
  };

  const terraform = render(tfTemplate, base);
  const k8sYaml = render(k8sTemplate, base);
  const helmValues = render(helmTemplate, base);
  const helmDeployment = render(helmDeploymentTemplate, base);
  const helmChart = [
    "# values.yaml",
    helmValues,
    "",
    "# templates/deployment.yaml",
    helmDeployment,
  ].join("\n");

  let aiHints = "";
  try {
    aiHints = await callLLM(
      `Improve this infra plan for prompt: ${prompt}. Return 3 concise bullet points.`,
      { timeoutMs: 5000 }
    );
  } catch {
    aiHints = "- Use managed services\n- Enable autoscaling\n- Add monitoring";
  }

  return { terraform, k8sYaml, helmChart, aiHints };
}

