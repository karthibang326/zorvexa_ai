-- CreateTable
CREATE TABLE "ai_learning" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL DEFAULT 'org-1',
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "executionSuccess" BOOLEAN NOT NULL,
    "outcomeImproved" BOOLEAN NOT NULL,
    "outcome" TEXT NOT NULL,
    "metricsBefore" JSONB NOT NULL,
    "metricsAfter" JSONB NOT NULL,
    "improvementScore" DOUBLE PRECISION,
    "latencyBefore" DOUBLE PRECISION,
    "latencyAfter" DOUBLE PRECISION,
    "costSignal" DOUBLE PRECISION,
    "patternFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_learning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_learning_orgId_createdAt_idx" ON "ai_learning"("orgId", "createdAt");
CREATE INDEX "ai_learning_resource_action_createdAt_idx" ON "ai_learning"("resource", "action", "createdAt");
CREATE INDEX "ai_learning_correlationId_idx" ON "ai_learning"("correlationId");
