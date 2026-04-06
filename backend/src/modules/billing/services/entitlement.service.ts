import { prisma } from "../../../lib/prisma";

export const entitlementService = {
  /**
   * Enterprise-grade feature gating.
   * Access is determined by current plan and active subscription status.
   */
  async hasAccess(tenantId: string, feature: string) {
    const org = await (prisma as any).organization.findUnique({
      where: { id: tenantId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!org) return false;
    const sub = org.subscriptions?.[0];
    if (!sub || sub.status !== "active") return false;

    const plan = org.billingPlan;

    const entitlements: Record<string, string[]> = {
      STARTER: ["BASIC_AI", "DASHBOARD", "SINGLE_PROJECT"],
      GROWTH: ["FULL_AI", "DASHBOARD", "MULTI_PROJECT", "API_ACCESS", "CHAOS_EXPERIMENTS"],
      ENTERPRISE: ["FULL_AI", "DASHBOARD", "CUSTOM_WORKFLOWS", "AUDIT_SERVICE", "PRIORITY_SUPPORT", "UNLIMITED_PROJECTS"]
    };

    const allowed = entitlements[plan as keyof typeof entitlements] || [];
    return allowed.includes(feature) || allowed.includes("*");
  },

  async getContext(tenantId: string) {
    const org = await (prisma as any).organization.findUnique({ where: { id: tenantId } });
    if (!org) throw new Error("Organization not found");

    return {
      org,
      plan: org.billingPlan,
      isPro: ["GROWTH", "ENTERPRISE"].includes(org.billingPlan),
      isEnterprise: org.billingPlan === "ENTERPRISE"
    };
  }
};
