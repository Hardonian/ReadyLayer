-- Outbox Pattern for Provider Status Updates
-- Ensures idempotent delivery of status updates to git providers

CREATE TABLE IF NOT EXISTS "OutboxIntent" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "sandboxId" TEXT,
  "intentType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "error" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboxIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutboxIntent_idempotencyKey_key" ON "OutboxIntent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "OutboxIntent_runId_idx" ON "OutboxIntent"("runId");
CREATE INDEX IF NOT EXISTS "OutboxIntent_repositoryId_idx" ON "OutboxIntent"("repositoryId");
CREATE INDEX IF NOT EXISTS "OutboxIntent_sandboxId_idx" ON "OutboxIntent"("sandboxId");
CREATE INDEX IF NOT EXISTS "OutboxIntent_status_idx" ON "OutboxIntent"("status");
CREATE INDEX IF NOT EXISTS "OutboxIntent_idempotencyKey_idx" ON "OutboxIntent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "OutboxIntent_createdAt_idx" ON "OutboxIntent"("createdAt");
