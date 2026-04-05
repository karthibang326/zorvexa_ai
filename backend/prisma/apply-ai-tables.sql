-- Idempotent: safe when migration history is not baselined (P3005).

CREATE TABLE IF NOT EXISTS "AiStreamEvent" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "correlationId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiStreamEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiStreamEvent_phase_createdAt_idx" ON "AiStreamEvent"("phase", "createdAt");
CREATE INDEX IF NOT EXISTS "AiStreamEvent_correlationId_createdAt_idx" ON "AiStreamEvent"("correlationId", "createdAt");

CREATE TABLE IF NOT EXISTS "AiDecisionRun" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "AiDecisionRun_correlationId_key" ON "AiDecisionRun"("correlationId");
CREATE INDEX IF NOT EXISTS "AiDecisionRun_orgId_createdAt_idx" ON "AiDecisionRun"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiDecisionRun_resource_createdAt_idx" ON "AiDecisionRun"("resource", "createdAt");

CREATE TABLE IF NOT EXISTS "ai_learning" (
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
    "detection" JSONB,
    "decision" JSONB,
    "execution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_learning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_learning_orgId_createdAt_idx" ON "ai_learning"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_learning_resource_action_createdAt_idx" ON "ai_learning"("resource", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_learning_correlationId_idx" ON "ai_learning"("correlationId");

DO $$ BEGIN
  ALTER TABLE "ai_learning" ADD COLUMN "detection" JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_learning" ADD COLUMN "decision" JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_learning" ADD COLUMN "execution" JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
