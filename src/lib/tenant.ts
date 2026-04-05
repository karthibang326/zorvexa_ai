import { api } from "./api";

export async function getTenantSummary() {
  const { data } = await api.get<{
    tenant: { id: string; name: string; slug: string | null; billingPlan: string };
    scope: { orgId: string; projectId: string; envId: string };
    healthScore: number;
    counts: { deployments: number; sreActions: number; auditEvents: number };
    aiActivity: { decisions24h: number; automationsApplied: number };
  }>("/tenant/summary");
  return data;
}

export async function getTenantBilling() {
  const { data } = await api.get<{
    tenantId: string;
    plan: string;
    monthlySpendUsd: number;
    aiSavingsUsd: number;
    netEffectiveUsd: number;
  }>("/tenant/billing");
  return data;
}
