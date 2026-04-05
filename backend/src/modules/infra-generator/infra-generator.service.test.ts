import { buildInfraPlan } from "./planner";
import { validateInfra } from "./validator";
import { infraGeneratorService } from "./infra-generator.service";

describe("infra generator", () => {
  it("builds plan from prompt", () => {
    const plan = buildInfraPlan("Deploy scalable Node.js app with autoscaling on AWS EKS");
    expect(plan.cloud).toBe("aws");
    expect(plan.scaling).toBe(true);
  });

  it("validates generated manifests", () => {
    const out = validateInfra({
      terraform: 'resource "aws_vpc" "main" {}',
      k8sYaml: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: x",
      helmChart: "replicaCount: 2",
    });
    expect(out.valid).toBe(true);
  });

  it("generates infra bundle", async () => {
    const out = await infraGeneratorService.generate({
      prompt: "Deploy scalable Node.js app with autoscaling on AWS EKS",
      autoDeploy: false,
      dryRun: true,
      approvalGranted: true,
    });
    expect(typeof out.terraform).toBe("string");
    expect(typeof out.k8sYaml).toBe("string");
    expect(typeof out.helmChart).toBe("string");
    expect(out.plan.cloud).toBe("aws");
  });
});

