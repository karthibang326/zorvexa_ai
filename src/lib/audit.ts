import { api } from "./api";

export async function getAuditLogs(opts?: { limit?: number; offset?: number }) {
  const { data } = await api.get<{
    items: Array<{
      id: string;
      orgId: string;
      userId: string;
      action: string;
      resourceType: string;
      resourceId: string | null;
      metadata: unknown;
      createdAt: string;
    }>;
    total: number;
  }>("/audit/logs", { params: opts });
  return data;
}
