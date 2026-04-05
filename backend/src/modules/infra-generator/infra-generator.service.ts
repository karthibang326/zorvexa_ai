import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { usePrismaPersistence } from "../../lib/prisma-env";
import { finopsService } from "../finops/finops.service";
import { deployGeneratedInfra } from "./deployer";
import { generateInfraCode } from "./generator";
import { buildInfraPlan } from "./planner";
import { validateInfra } from "./validator";

export const infraGeneratorService = {
  async generate(params: {
    prompt: string;
    dryRun?: boolean;
    autoDeploy?: boolean;
    approvalGranted?: boolean;
  }) {
    const plan = buildInfraPlan(params.prompt);
    const generated = await generateInfraCode(plan, params.prompt);
    const validation = validateInfra(generated);

    const prediction = await finopsService.predict();
    const estimatedMonthlyCost = prediction.nextMonth;
    const budget = env.FINOPS_BUDGET_THRESHOLD_DAILY * 30;
    const blockedByCost = estimatedMonthlyCost > budget;

    const dryRun = params.dryRun ?? env.INFRA_DRY_RUN_DEFAULT === "true";
    const requiresApproval = env.INFRA_APPROVAL_REQUIRED === "true";
    const approvalOk = !requiresApproval || params.approvalGranted === true;

    let deploy = { deployed: false, status: "NOT_DEPLOYED", steps: [] as string[] };
    if (params.autoDeploy && validation.valid && !blockedByCost && approvalOk) {
      deploy = await deployGeneratedInfra({
        cloud: plan.cloud,
        appName: plan.appName,
        dryRun,
      });
    } else if (params.autoDeploy && !approvalOk) {
      deploy = { deployed: false, status: "PENDING_APPROVAL", steps: [] };
    } else if (blockedByCost) {
      deploy = { deployed: false, status: "BLOCKED_BY_COST", steps: [] };
    }

    if (usePrismaPersistence()) {
      try {
        await prisma.infraGeneration.create({
          data: {
            prompt: params.prompt,
            plan: plan as any,
            terraform: generated.terraform,
            k8sYaml: generated.k8sYaml,
            helmChart: generated.helmChart,
            status: deploy.status,
            deployed: deploy.deployed,
          },
        });
      } catch {
        // ignore db write failures
      }
    }

    return {
      terraform: generated.terraform,
      k8sYaml: generated.k8sYaml,
      helmChart: generated.helmChart,
      aiHints: generated.aiHints,
      plan,
      validation,
      costEstimate: { monthly: estimatedMonthlyCost, blockedByCost, budget },
      deploy,
    };
  },
};

