-- CreateTable
CREATE TABLE "AgentExperience" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "environment" TEXT,
    "agentType" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "nextState" JSONB,
    "reward" DOUBLE PRECISION,
    "result" TEXT,
    "rewardComponents" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentExperience_orgId_createdAt_idx" ON "AgentExperience"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentExperience_orgId_agentType_createdAt_idx" ON "AgentExperience"("orgId", "agentType", "createdAt");

-- CreateIndex
CREATE INDEX "AgentExperience_status_createdAt_idx" ON "AgentExperience"("status", "createdAt");
