import { prisma } from "./prisma";
import { logInfo } from "./logger";

const CANONICAL_ORG_ID = "org-1";
const CANONICAL_PROJECT_ID = "proj-1";
const CANONICAL_ENV_ID = "env-prod";
const DEV_USER_ID = "dev-user";

function defaultOrgName() {
  return (process.env.DEV_DEFAULT_ORG_NAME ?? "My organization").trim() || "My organization";
}
function defaultProjectName() {
  return (process.env.DEV_DEFAULT_PROJECT_NAME ?? "Default project").trim() || "Default project";
}
function defaultEnvName() {
  return (process.env.DEV_DEFAULT_ENV_NAME ?? "Production").trim() || "Production";
}

/**
 * Ensures the default dev tenant rows exist in Postgres so Prisma-backed routes
 * (e.g. GET /api/tenant/summary) agree with the UI default context (org-1 / proj-1 / env-prod).
 * Context validation can fall back to in-memory mocks when rows are missing, which previously
 * caused JWT + headers to reference org-1 while tenant APIs returned 404.
 */
export async function ensureDevBootstrapTenant(): Promise<void> {
  const bypass = process.env.AUTH_DEV_BYPASS === "true";
  const dev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
  const disabled = process.env.DEV_BOOTSTRAP_ORG_DEFAULT === "false";
  if (!bypass || !dev || disabled) return;

  try {
    await prisma.user.upsert({
      where: { email: "dev@local" },
      update: {},
      create: { id: DEV_USER_ID, email: "dev@local", role: "owner" },
    });

    const orgName = defaultOrgName();
    const projectName = defaultProjectName();
    const envName = defaultEnvName();

    await prisma.organization.upsert({
      where: { id: CANONICAL_ORG_ID },
      update: { name: orgName },
      create: {
        id: CANONICAL_ORG_ID,
        name: orgName,
        ownerId: DEV_USER_ID,
      },
    });

    await prisma.project.upsert({
      where: { id: CANONICAL_PROJECT_ID },
      update: { organizationId: CANONICAL_ORG_ID, name: projectName },
      create: {
        id: CANONICAL_PROJECT_ID,
        name: projectName,
        organizationId: CANONICAL_ORG_ID,
      },
    });

    await prisma.environment.upsert({
      where: { id: CANONICAL_ENV_ID },
      update: { projectId: CANONICAL_PROJECT_ID, name: envName },
      create: {
        id: CANONICAL_ENV_ID,
        name: envName,
        projectId: CANONICAL_PROJECT_ID,
      },
    });

    const existing = await prisma.membership.findFirst({
      where: { userId: DEV_USER_ID, organizationId: CANONICAL_ORG_ID },
    });
    if (!existing) {
      await prisma.membership.create({
        data: {
          userId: DEV_USER_ID,
          organizationId: CANONICAL_ORG_ID,
          role: "OWNER",
        },
      });
    }

    logInfo("dev_bootstrap_tenant_ok", { orgId: CANONICAL_ORG_ID });
  } catch (e) {
    logInfo("dev_bootstrap_tenant_skipped", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
