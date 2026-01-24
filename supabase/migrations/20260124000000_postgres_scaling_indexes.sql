-- ============================================================================
-- Postgres Scaling Optimization - Composite Indexes
-- ============================================================================
--
-- Purpose: Add composite indexes for common query patterns to reduce DB load
-- Based on: OpenAI Postgres scaling playbook + codebase query pattern analysis
--
-- Safe to run: Uses CONCURRENTLY to avoid locking tables in production
--
-- Generated: 2026-01-24
-- Audit: postgres-scale-audit
-- ============================================================================

-- ============================================================================
-- TokenUsage - Analytics Query Optimization
-- ============================================================================
-- Query pattern: Organization-scoped token usage over time ranges
-- Example: GET /api/dashboard/metrics?timeRange=30d

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_org_created
ON "TokenUsage" ("organizationId", "createdAt" DESC);

COMMENT ON INDEX idx_token_usage_org_created IS 'Optimizes org-scoped token usage timeline queries';

-- Repository-scoped token usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_repo_created
ON "TokenUsage" ("repositoryId", "createdAt" DESC)
WHERE "repositoryId" IS NOT NULL;

COMMENT ON INDEX idx_token_usage_repo_created IS 'Optimizes repo-scoped token usage queries (partial index for non-null repos)';

-- ============================================================================
-- Job - Queue Processing Optimization
-- ============================================================================
-- Query pattern: Worker fetches pending/retrying jobs by scheduledAt
-- Example: SELECT * FROM Job WHERE status IN ('pending', 'retrying') ORDER BY scheduledAt LIMIT 10 FOR UPDATE SKIP LOCKED

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_pending_scheduled
ON "Job" ("status", "scheduledAt")
WHERE "status" IN ('pending', 'retrying');

COMMENT ON INDEX idx_jobs_pending_scheduled IS 'Optimizes job queue processing with partial index for pending jobs';

-- Job type-based processing (for job workers that specialize)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_type_status_scheduled
ON "Job" ("type", "status", "scheduledAt");

COMMENT ON INDEX idx_jobs_type_status_scheduled IS 'Optimizes type-specific job queue queries';

-- ============================================================================
-- Violation - Timeline & Pattern Analysis
-- ============================================================================
-- Query pattern: Repository violation history (active violations)
-- Example: GET /api/dashboard/findings?repositoryId=X

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_repo_detected
ON "Violation" ("repositoryId", "detectedAt" DESC);

COMMENT ON INDEX idx_violations_repo_detected IS 'Optimizes repo violation timeline queries (already exists per schema but ensuring it exists)';

-- Severity-based filtering (for critical violation alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_severity_detected
ON "Violation" ("severity", "detectedAt" DESC)
WHERE "severity" IN ('critical', 'high');

COMMENT ON INDEX idx_violations_severity_detected IS 'Optimizes high-severity violation queries (partial index)';

-- ============================================================================
-- ReadyLayerRun - Dashboard Performance
-- ============================================================================
-- Query pattern: Org-scoped run timeline (via repository join)
-- Example: GET /api/dashboard/runs?organizationId=X&limit=50
-- NOTE: Cannot directly index repository.organizationId from ReadyLayerRun
-- Instead: Add repositoryId + createdAt composite (repository filter handled in query)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_repo_created
ON "ReadyLayerRun" ("repositoryId", "createdAt" DESC)
WHERE "repositoryId" IS NOT NULL;

COMMENT ON INDEX idx_runs_repo_created IS 'Optimizes repo-scoped run queries (partial index for non-sandbox runs)';

-- Status-based filtering (for filtering by run status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_repo_status_created
ON "ReadyLayerRun" ("repositoryId", "status", "createdAt" DESC)
WHERE "repositoryId" IS NOT NULL;

COMMENT ON INDEX idx_runs_repo_status_created IS 'Optimizes filtered repo run queries (e.g., failed runs)';

-- ============================================================================
-- CostTracking - Analytics Optimization
-- ============================================================================
-- Query pattern: Daily cost aggregation per organization
-- Example: SELECT SUM(amount) FROM CostTracking WHERE organizationId = X AND date >= ?

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_tracking_org_date
ON "CostTracking" ("organizationId", "date" DESC);

COMMENT ON INDEX idx_cost_tracking_org_date IS 'Optimizes org cost timeline queries';

-- Service-specific cost queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_tracking_org_service_date
ON "CostTracking" ("organizationId", "service", "date" DESC);

COMMENT ON INDEX idx_cost_tracking_org_service_date IS 'Optimizes service-specific cost queries (e.g., LLM spend)';

-- ============================================================================
-- AuditLog - Compliance & Forensics
-- ============================================================================
-- Query pattern: Org-scoped audit trail (time-descending)
-- Example: GET /api/admin/audit?organizationId=X&limit=100

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_org_created
ON "AuditLog" ("organizationId", "createdAt" DESC)
WHERE "organizationId" IS NOT NULL;

COMMENT ON INDEX idx_audit_log_org_created IS 'Optimizes org audit log queries (partial index)';

-- User-scoped audit trail
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_created
ON "AuditLog" ("userId", "createdAt" DESC)
WHERE "userId" IS NOT NULL;

COMMENT ON INDEX idx_audit_log_user_created IS 'Optimizes user audit log queries';

-- Action-based filtering (for security alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action_created
ON "AuditLog" ("action", "createdAt" DESC)
WHERE "action" IN ('delete', 'override', 'block', 'export');

COMMENT ON INDEX idx_audit_log_action_created IS 'Optimizes critical action audit queries (partial index)';

-- ============================================================================
-- Review - Dashboard Queries (Already Optimized in Schema)
-- ============================================================================
-- NOTE: Review model already has these indexes from P1-FIX:
-- - idx_review_repo_created (repositoryId, createdAt)
-- - idx_review_repo_status_created (repositoryId, status, createdAt)
-- Ensuring they exist (idempotent)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_repo_created
ON "Review" ("repositoryId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_repo_status_created
ON "Review" ("repositoryId", "status", "createdAt" DESC);

-- ============================================================================
-- Installation - Provider Lookup Optimization
-- ============================================================================
-- Query pattern: Lookup installation by provider + org
-- Example: Webhook validation, installation checks

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installation_provider_org
ON "Installation" ("provider", "organizationId")
WHERE "isActive" = true;

COMMENT ON INDEX idx_installation_provider_org IS 'Optimizes active installation lookups (partial index)';

-- ============================================================================
-- ANALYZE for Query Planner
-- ============================================================================
-- Update statistics for query planner after index creation

ANALYZE "TokenUsage";
ANALYZE "Job";
ANALYZE "Violation";
ANALYZE "ReadyLayerRun";
ANALYZE "CostTracking";
ANALYZE "AuditLog";
ANALYZE "Review";
ANALYZE "Installation";

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Verify all indexes were created successfully

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_token_usage_%' OR
    indexname LIKE 'idx_jobs_%' OR
    indexname LIKE 'idx_violations_%' OR
    indexname LIKE 'idx_runs_%' OR
    indexname LIKE 'idx_cost_tracking_%' OR
    indexname LIKE 'idx_audit_log_%' OR
    indexname LIKE 'idx_review_%' OR
    indexname LIKE 'idx_installation_%'
  )
ORDER BY tablename, indexname;
