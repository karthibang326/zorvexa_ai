-- CreateTable
CREATE TABLE "EnvironmentPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "envId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxActionsPerHour" INTEGER NOT NULL DEFAULT 40,
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "blastRadius" TEXT NOT NULL DEFAULT 'medium',
    "sloAvailabilityTarget" DOUBLE PRECISION NOT NULL DEFAULT 99.5,
    "autoRollback" BOOLEAN NOT NULL DEFAULT true,
    "complianceTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvironmentPolicy_orgId_projectId_envId_idx" ON "EnvironmentPolicy"("orgId", "projectId", "envId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentPolicy_orgId_projectId_envId_key" ON "EnvironmentPolicy"("orgId", "projectId", "envId");
