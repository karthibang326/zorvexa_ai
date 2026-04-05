export interface ValidationResult {
  valid: boolean;
  errors: string[];
  terraformValid: boolean;
  k8sValid: boolean;
  safe: boolean;
}

export function validateInfra(input: { terraform: string; k8sYaml: string; helmChart: string }): ValidationResult {
  const errors: string[] = [];
  const terraformValid = input.terraform.includes("resource") && input.terraform.includes("aws_");
  const k8sValid = input.k8sYaml.includes("apiVersion:") && input.k8sYaml.includes("kind: Deployment");
  const helmValid = input.helmChart.includes("replicaCount");
  if (!terraformValid) errors.push("Terraform validate failed.");
  if (!k8sValid) errors.push("Kubernetes schema validation failed.");
  if (!helmValid) errors.push("Helm values template invalid.");

  const unsafe = /(0\.0\.0\.0\/0)|(privileged:\s*true)|(latest)/i.test(
    `${input.terraform}\n${input.k8sYaml}\n${input.helmChart}`
  );
  if (unsafe) errors.push("Unsafe configuration detected.");

  return {
    valid: terraformValid && k8sValid && helmValid && !unsafe,
    errors,
    terraformValid,
    k8sValid,
    safe: !unsafe,
  };
}

