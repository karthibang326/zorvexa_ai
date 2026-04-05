-- CreateTable
CREATE TABLE "AiDecisionRun" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL DEFAULT 'org-1',
    "projectId" TEXT NOT NULL DEFAULT 'proj-1',
    "envId" TEXT NOT NULL DEFAULT 'env-prod',
    "resource" TEXT NOT NULL,
    "detection" JSONB NOT NULL,
    "decision" JSONB,
    "execution" JSONB,
    "verification" JSONB,
    "outcome" TEXT NOT NULL,
    "improvementScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDecisionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiDecisionRun_correlationId_key" ON "AiDecisionRun"("correlationId");

-- CreateIndex
CREATE INDEX "AiDecisionRun_orgId_createdAt_idx" ON "AiDecisionRun"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecisionRun_resource_createdAt_idx" ON "AiDecisionRun"("resource", "createdAt");
