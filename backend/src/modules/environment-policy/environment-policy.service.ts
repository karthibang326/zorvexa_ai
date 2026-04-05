type PolicyTier = "dev" | "staging" | "prod";

export type AllowedActionKind = "scale" | "restart" | "deploy" | "optimize" | "rollback";

export type AutonomyMode = "simulation" | "assisted" | "autonomous";
export type ApprovalScope = "high_risk" | "medium_risk" | "all_actions";
export type BlastRadiusScope = "service" | "namespace" | "cluster";

export type EnvironmentPolicy = {
  orgId: string;
  projectId: string;
  envId: string;
  tier: PolicyTier;
  autonomyMode: AutonomyMode;
  approvalScope: ApprovalScope;
  approvalRequired: boolean;
  maxActionsPerHour: number;
  monthlyBudgetUsd: number;
  /** Legacy coarse blast level; kept in sync with blastRadiusScope where possible */
  blastRadius: "low" | "medium" | "high";
  blastRadiusScope: BlastRadiusScope;
  sloAvailabilityTarget: number;
  autoRollback: boolean;
  rollbackOnPerformanceDegradation: boolean;
  pauseAutomationWhenBudgetExceeded: boolean;
  minConfidenceToAutoExecute: number;
  allowDestructiveActions: boolean;
  allowedActionKinds: AllowedActionKind[];
  complianceTags: string[];
  updatedAt: string;
};

const store = new Map<string, EnvironmentPolicy>();

function keyOf(orgId: string, projectId: string, envId: string) {
  return `${orgId}::${projectId}::${envId}`;
}

const ALL_ACTIONS: AllowedActionKind[] = ["scale", "restart", "deploy", "optimize", "rollback"];
const NON_DESTRUCTIVE: AllowedActionKind[] = ["scale", "restart", "optimize"];

function blastFromScope(scope: BlastRadiusScope): "low" | "medium" | "high" {
  if (scope === "service") return "low";
  if (scope === "namespace") return "medium";
  return "high";
}

function approvalRequiredFromScope(scope: ApprovalScope): boolean {
  return scope === "all_actions" || scope === "medium_risk";
}

function defaultsForTier(tier: PolicyTier): Omit<EnvironmentPolicy, "orgId" | "projectId" | "envId" | "updatedAt"> {
  const blastRadiusScope: BlastRadiusScope = tier === "prod" ? "service" : tier === "staging" ? "namespace" : "cluster";
  const basePolicy = {
    autonomyMode: "assisted" as AutonomyMode,
    approvalScope: "medium_risk" as ApprovalScope,
    blastRadiusScope,
    rollbackOnPerformanceDegradation: true,
    pauseAutomationWhenBudgetExceeded: true,
    minConfidenceToAutoExecute: 85,
    allowDestructiveActions: false,
    allowedActionKinds: NON_DESTRUCTIVE,
  };

  if (tier === "prod") {
    return {
      ...basePolicy,
      tier,
      approvalRequired: approvalRequiredFromScope("medium_risk"),
      maxActionsPerHour: 10,
      monthlyBudgetUsd: 25000,
      blastRadius: blastFromScope(blastRadiusScope),
      sloAvailabilityTarget: 99.95,
      autoRollback: true,
      complianceTags: ["pci", "soc2"],
    };
  }
  if (tier === "staging") {
    return {
      ...basePolicy,
      tier,
      approvalRequired: approvalRequiredFromScope("medium_risk"),
      maxActionsPerHour: 40,
      monthlyBudgetUsd: 6000,
      blastRadius: blastFromScope(blastRadiusScope),
      sloAvailabilityTarget: 99.5,
      autoRollback: true,
      allowedActionKinds: ALL_ACTIONS,
      allowDestructiveActions: true,
      complianceTags: ["internal"],
    };
  }
  return {
    ...basePolicy,
    tier,
    autonomyMode: "simulation",
    approvalRequired: approvalRequiredFromScope("high_risk"),
    approvalScope: "high_risk",
    maxActionsPerHour: 80,
    monthlyBudgetUsd: 2500,
    blastRadius: blastFromScope(blastRadiusScope),
    sloAvailabilityTarget: 98.5,
    autoRollback: false,
    allowedActionKinds: ALL_ACTIONS,
    allowDestructiveActions: true,
    complianceTags: ["sandbox"],
  };
}

export const environmentPolicyService = {
  getOrCreate(scope: { orgId: string; projectId: string; envId: string; tier?: PolicyTier }) {
    const key = keyOf(scope.orgId, scope.projectId, scope.envId);
    const existing = store.get(key);
    if (existing) {
      const d = defaultsForTier(existing.tier);
      let next: EnvironmentPolicy = existing;
      let changed = false;
      if (!existing.allowedActionKinds?.length) {
        next = { ...next, allowedActionKinds: d.allowedActionKinds };
        changed = true;
      }
      const ex = existing as Partial<EnvironmentPolicy>;
      if (ex.autonomyMode === undefined) {
        next = {
          ...next,
          autonomyMode: d.autonomyMode,
          approvalScope: d.approvalScope,
          blastRadiusScope: d.blastRadiusScope,
          rollbackOnPerformanceDegradation: d.rollbackOnPerformanceDegradation,
          pauseAutomationWhenBudgetExceeded: d.pauseAutomationWhenBudgetExceeded,
          minConfidenceToAutoExecute: d.minConfidenceToAutoExecute,
          allowDestructiveActions: d.allowDestructiveActions,
        };
        changed = true;
      }
      if (changed) {
        next = { ...next, updatedAt: new Date().toISOString() };
        store.set(key, next);
      }
      return next;
    }
    const base = defaultsForTier(scope.tier ?? "dev");
    const created: EnvironmentPolicy = {
      orgId: scope.orgId,
      projectId: scope.projectId,
      envId: scope.envId,
      updatedAt: new Date().toISOString(),
      ...base,
    };
    store.set(key, created);
    return created;
  },

  update(
    scope: { orgId: string; projectId: string; envId: string },
    patch: Partial<Omit<EnvironmentPolicy, "orgId" | "projectId" | "envId" | "updatedAt">>
  ) {
    const current = this.getOrCreate({ ...scope, tier: "dev" });
    let next: EnvironmentPolicy = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.blastRadiusScope !== undefined) {
      next.blastRadius = blastFromScope(patch.blastRadiusScope);
    }
    if (patch.approvalScope !== undefined) {
      next.approvalRequired = approvalRequiredFromScope(patch.approvalScope);
    }
    store.set(keyOf(scope.orgId, scope.projectId, scope.envId), next);
    return next;
  },
};

