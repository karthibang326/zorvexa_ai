import type { UserRole } from "../../lib/auth";
import { env } from "../../config/env";

/** Roles allowed to list pending approvals and audit (compliance readers included). */
export function astraOpsReadOpsRoles(): UserRole[] {
  const base: UserRole[] = ["owner", "admin", "operator", "auditor"];
  if (env.ASTRA_VIEWER_CAN_READ_OPS === "true") {
    return [...base, "viewer"];
  }
  return base;
}

/** Roles allowed to approve / reject queued decisions (stricter in admin-only mode). */
export function astraOpsApprovalRoles(): UserRole[] {
  if (env.ASTRA_APPROVAL_ADMIN_ONLY === "true") {
    return ["owner", "admin"];
  }
  return ["owner", "admin", "operator"];
}

/** Ingest triggers the AI pipeline — operators and admins only (not read-only viewers). */
export function astraOpsIngestRoles(): UserRole[] {
  return ["admin", "operator"];
}
