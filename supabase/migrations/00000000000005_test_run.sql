-- ============================================
-- Test Run Model Migration
-- ============================================
-- 
-- Adds TestRun model for tracking CI/CD test execution runs
-- with coverage and pass/fail results.
-- 
-- Generated: 2026-01-02
-- ============================================

-- ============================================
-- Test Run Table
-- ============================================

CREATE TABLE IF NOT EXISTS "TestRun" (
  "id" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "prNumber" INTEGER,
  "prSha" TEXT NOT NULL,
  "workflowRunId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "conclusion" TEXT,
  "coverage" JSONB,
  "summary" JSONB,
  "artifactsUrl" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TestRun_repositoryId_prSha_workflowRunId_key" ON "TestRun"("repositoryId", "prSha", "workflowRunId");
CREATE INDEX IF NOT EXISTS "TestRun_repositoryId_idx" ON "TestRun"("repositoryId");
CREATE INDEX IF NOT EXISTS "TestRun_prNumber_idx" ON "TestRun"("prNumber");
CREATE INDEX IF NOT EXISTS "TestRun_prSha_idx" ON "TestRun"("prSha");
CREATE INDEX IF NOT EXISTS "TestRun_workflowRunId_idx" ON "TestRun"("workflowRunId");
CREATE INDEX IF NOT EXISTS "TestRun_status_idx" ON "TestRun"("status");
CREATE INDEX IF NOT EXISTS "TestRun_createdAt_idx" ON "TestRun"("createdAt");

ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Add TestRun relation to Test model
-- ============================================
-- Note: This is a many-to-many relationship handled via junction table
-- For now, we'll use a JSON array in TestRun to reference test IDs
-- This keeps the schema simple while allowing multiple tests per run
