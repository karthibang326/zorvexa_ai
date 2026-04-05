-- CreateTable
CREATE TABLE "AiStreamEvent" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "correlationId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiStreamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiStreamEvent_phase_createdAt_idx" ON "AiStreamEvent"("phase", "createdAt");

-- CreateIndex
CREATE INDEX "AiStreamEvent_correlationId_createdAt_idx" ON "AiStreamEvent"("correlationId", "createdAt");
