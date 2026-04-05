-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "configSchema" JSONB NOT NULL,
    "entrypoint" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstalledPlugin" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "environment" TEXT,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstalledPlugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionLabel" TEXT,
    "name" TEXT NOT NULL DEFAULT 'deployment',
    "service" TEXT NOT NULL DEFAULT 'unknown-service',
    "environment" TEXT NOT NULL DEFAULT 'env-unknown',
    "projectId" TEXT NOT NULL DEFAULT 'proj-unknown',
    "orgId" TEXT NOT NULL DEFAULT 'org-unknown',
    "namespace" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logs" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentLog" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaosExperiment" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "approvalMode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "impactSummary" JSONB,
    "createdBy" TEXT,

    CONSTRAINT "ChaosExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentCase" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT,
    "source" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "rootCause" TEXT,
    "action" TEXT,
    "status" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "success" BOOLEAN,
    "confidenceScore" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "IncidentCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionRecord" (
    "id" TEXT NOT NULL,
    "predictedIssue" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "failureProbability" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "PredictionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutonomousAction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AutonomousAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunStepLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunStepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "workflowId" TEXT,
    "type" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfHealingEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfHealingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SREAction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "environment" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SREAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostRecord" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfraGeneration" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "terraform" TEXT NOT NULL,
    "k8sYaml" TEXT NOT NULL,
    "helmChart" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deployed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfraGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Plugin_type_isOfficial_idx" ON "Plugin"("type", "isOfficial");

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_name_version_key" ON "Plugin"("name", "version");

-- CreateIndex
CREATE INDEX "InstalledPlugin_orgId_enabled_idx" ON "InstalledPlugin"("orgId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "InstalledPlugin_pluginId_orgId_projectId_environment_key" ON "InstalledPlugin"("pluginId", "orgId", "projectId", "environment");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_version_idx" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "Deployment_orgId_projectId_environment_startedAt_idx" ON "Deployment"("orgId", "projectId", "environment", "startedAt");

-- CreateIndex
CREATE INDEX "Deployment_workflowId_createdAt_idx" ON "Deployment"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "DeploymentLog_deploymentId_createdAt_idx" ON "DeploymentLog"("deploymentId", "createdAt");

-- CreateIndex
CREATE INDEX "DeploymentLog_deploymentId_timestamp_idx" ON "DeploymentLog"("deploymentId", "timestamp");

-- CreateIndex
CREATE INDEX "ChaosExperiment_startedAt_idx" ON "ChaosExperiment"("startedAt");

-- CreateIndex
CREATE INDEX "ChaosExperiment_status_idx" ON "ChaosExperiment"("status");

-- CreateIndex
CREATE INDEX "IncidentCase_detectedAt_idx" ON "IncidentCase"("detectedAt");

-- CreateIndex
CREATE INDEX "IncidentCase_status_idx" ON "IncidentCase"("status");

-- CreateIndex
CREATE INDEX "PredictionRecord_createdAt_idx" ON "PredictionRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AutonomousAction_createdAt_idx" ON "AutonomousAction"("createdAt");

-- CreateIndex
CREATE INDEX "AutonomousAction_status_idx" ON "AutonomousAction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Run_idempotencyKey_key" ON "Run"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Run_workflowId_createdAt_idx" ON "Run"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "RunStepLog_runId_createdAt_idx" ON "RunStepLog"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AIInsight_runId_createdAt_idx" ON "AIInsight"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AIInsight_workflowId_createdAt_idx" ON "AIInsight"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "SelfHealingEvent_runId_createdAt_idx" ON "SelfHealingEvent"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "SelfHealingEvent_type_createdAt_idx" ON "SelfHealingEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SREAction_orgId_createdAt_idx" ON "SREAction"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "SREAction_status_createdAt_idx" ON "SREAction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CostRecord_provider_timestamp_idx" ON "CostRecord"("provider", "timestamp");

-- CreateIndex
CREATE INDEX "CostRecord_service_timestamp_idx" ON "CostRecord"("service", "timestamp");

-- AddForeignKey
ALTER TABLE "InstalledPlugin" ADD CONSTRAINT "InstalledPlugin_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentLog" ADD CONSTRAINT "DeploymentLog_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaosExperiment" ADD CONSTRAINT "ChaosExperiment_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentCase" ADD CONSTRAINT "IncidentCase_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStepLog" ADD CONSTRAINT "RunStepLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfHealingEvent" ADD CONSTRAINT "SelfHealingEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
