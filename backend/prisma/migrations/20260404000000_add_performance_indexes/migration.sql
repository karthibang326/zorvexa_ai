-- Add performance indexes for common query patterns

-- Workflow: list by status and by creator
CREATE INDEX IF NOT EXISTS "Workflow_status_createdAt_idx" ON "Workflow"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Workflow_createdBy_createdAt_idx" ON "Workflow"("createdBy", "createdAt");

-- Run: filter by status (e.g. all failed runs)
CREATE INDEX IF NOT EXISTS "Run_status_createdAt_idx" ON "Run"("status", "createdAt");

-- InfraGeneration: filter by status and deployed flag
CREATE INDEX IF NOT EXISTS "InfraGeneration_status_createdAt_idx" ON "InfraGeneration"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "InfraGeneration_deployed_createdAt_idx" ON "InfraGeneration"("deployed", "createdAt");
