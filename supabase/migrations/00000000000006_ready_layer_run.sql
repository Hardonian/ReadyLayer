-- ReadyLayer Run Model Migration
-- Adds ReadyLayerRun model for unified pipeline orchestration

-- ReadyLayer Run Table
CREATE TABLE IF NOT EXISTS "ReadyLayerRun" (
  "id" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "sandboxId" TEXT,
  "trigger" TEXT NOT NULL,
  "triggerMetadata" JSONB,
  "reviewGuardStatus" TEXT NOT NULL DEFAULT 'pending',
  "testEngineStatus" TEXT NOT NULL DEFAULT 'pending',
  "docSyncStatus" TEXT NOT NULL DEFAULT 'pending',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "conclusion" TEXT,
  "reviewGuardResult" JSONB,
  "testEngineResult" JSONB,
  "docSyncResult" JSONB,
  "aiTouchedDetected" BOOLEAN NOT NULL DEFAULT false,
  "aiTouchedFiles" JSONB,
  "gatesPassed" BOOLEAN NOT NULL DEFAULT false,
  "gatesFailed" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "reviewGuardStartedAt" TIMESTAMP(3),
  "reviewGuardCompletedAt" TIMESTAMP(3),
  "testEngineStartedAt" TIMESTAMP(3),
  "testEngineCompletedAt" TIMESTAMP(3),
  "docSyncStartedAt" TIMESTAMP(3),
  "docSyncCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewId" TEXT,
  CONSTRAINT "ReadyLayerRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReadyLayerRun_correlationId_key" ON "ReadyLayerRun"("correlationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadyLayerRun_sandboxId_key" ON "ReadyLayerRun"("sandboxId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadyLayerRun_reviewId_key" ON "ReadyLayerRun"("reviewId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_correlationId_idx" ON "ReadyLayerRun"("correlationId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_repositoryId_idx" ON "ReadyLayerRun"("repositoryId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_sandboxId_idx" ON "ReadyLayerRun"("sandboxId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_status_idx" ON "ReadyLayerRun"("status");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_createdAt_idx" ON "ReadyLayerRun"("createdAt");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_trigger_idx" ON "ReadyLayerRun"("trigger");

-- Foreign Keys
ALTER TABLE "ReadyLayerRun" ADD CONSTRAINT "ReadyLayerRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReadyLayerRun" ADD CONSTRAINT "ReadyLayerRun_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add runId to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "runId" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_runId_idx" ON "AuditLog"("runId");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReadyLayerRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add runId to Job
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "runId" TEXT;
CREATE INDEX IF NOT EXISTS "Job_runId_idx" ON "Job"("runId");
