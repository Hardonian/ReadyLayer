-- ============================================
-- Phase 1: DB Job Queue Migration
-- RLS-Safe Design with Worker Concurrency
-- ============================================
-- 
-- Purpose:
-- 1. Enhance Job table with tenant isolation and worker claiming
-- 2. Add RPC functions for safe job queue operations
-- 3. Implement proper RLS policies for tenant separation
-- 4. Create idempotency and retry infrastructure
-- 
-- Generated: 2026-01-30
-- ============================================

-- ============================================
-- 0. HARDENING: Fix Mutable Search Path (if functions exist)
-- ============================================

DO $$
BEGIN
    -- Fix search_path on existing helper functions if they exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_id') THEN
        ALTER FUNCTION public.current_user_id() SET search_path = public;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_member') THEN
        ALTER FUNCTION public.is_org_member(text) SET search_path = public;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_org_role') THEN
        ALTER FUNCTION public.has_org_role(text, text) SET search_path = public;
    END IF;
END $$;

-- ============================================
-- 1. Job Table Enhancement
-- ============================================

-- Add new columns to Job table (idempotent)
DO $$
BEGIN
    -- Add organizationId for tenant isolation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'organizationId') THEN
        ALTER TABLE "Job" ADD COLUMN "organizationId" TEXT;
    END IF;

    -- Add idempotencyKey for duplicate prevention
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'idempotencyKey') THEN
        ALTER TABLE "Job" ADD COLUMN "idempotencyKey" TEXT;
    END IF;

    -- Add lockedAt for worker claiming
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'lockedAt') THEN
        ALTER TABLE "Job" ADD COLUMN "lockedAt" TIMESTAMP(3);
    END IF;

    -- Add lockedBy for worker identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'lockedBy') THEN
        ALTER TABLE "Job" ADD COLUMN "lockedBy" TEXT;
    END IF;

    -- Add runId link to ReadyLayerRun (already exists in Prisma, ensure in DB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'runId') THEN
        ALTER TABLE "Job" ADD COLUMN "runId" TEXT;
    END IF;
END $$;

-- Add foreign key constraint for organizationId (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Job_organizationId_fkey' 
        AND table_name = 'Job'
    ) THEN
        ALTER TABLE "Job" 
        ADD CONSTRAINT "Job_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for runId (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Job_runId_fkey' 
        AND table_name = 'Job'
    ) THEN
        ALTER TABLE "Job" 
        ADD CONSTRAINT "Job_runId_fkey" 
        FOREIGN KEY ("runId") REFERENCES "ReadyLayerRun"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Update status check constraint to support new statuses
-- Note: We need to drop and recreate since CHECK constraints can't be altered
DO $$
BEGIN
    -- Check if old constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Job_status_check' 
        AND table_name = 'Job'
    ) THEN
        -- Drop old constraint
        ALTER TABLE "Job" DROP CONSTRAINT "Job_status_check";
    END IF;

    -- Add new status constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Job_status_check' 
        AND table_name = 'Job'
    ) THEN
        ALTER TABLE "Job" 
        ADD CONSTRAINT "Job_status_check" 
        CHECK ("status" IN ('queued', 'running', 'succeeded', 'failed', 'dead', 'canceled', 'pending', 'processing', 'completed', 'retrying'));
    END IF;
END $$;

-- Add unique constraint for idempotency (tenant_id, type, idempotency_key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Job_org_type_idempotency_key' 
        AND table_name = 'Job'
    ) THEN
        -- Partial unique index: only enforce uniqueness when idempotencyKey is not null
        CREATE UNIQUE INDEX "Job_org_type_idempotency_key" 
        ON "Job"("organizationId", "type", "idempotencyKey") 
        WHERE "idempotencyKey" IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- 2. Job Queue Performance Indexes
-- ============================================

-- Index for claiming jobs (most critical for worker performance)
CREATE INDEX IF NOT EXISTS "Job_status_runAt_claim_idx" 
ON "Job"("status", "scheduledAt") 
WHERE "status" IN ('queued', 'pending') AND "lockedBy" IS NULL;

-- Index for worker heartbeat lookups
CREATE INDEX IF NOT EXISTS "Job_lockedBy_idx" ON "Job"("lockedBy") WHERE "lockedBy" IS NOT NULL;

-- Index for tenant-scoped job queries
CREATE INDEX IF NOT EXISTS "Job_organizationId_status_idx" ON "Job"("organizationId", "status");

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS "Job_idempotencyKey_idx" ON "Job"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Composite index for job type + status queries
CREATE INDEX IF NOT EXISTS "Job_type_status_scheduledAt_idx" 
ON "Job"("type", "status", "scheduledAt") 
WHERE "status" IN ('queued', 'pending', 'retrying');

-- ============================================
-- 3. RPC Functions for Job Queue Operations
-- ============================================

-- Function: Enqueue a new job (server-side only)
-- Returns: job_id
CREATE OR REPLACE FUNCTION public.enqueue_job(
    p_organization_id TEXT,
    p_type TEXT,
    p_payload JSONB,
    p_idempotency_key TEXT DEFAULT NULL,
    p_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_max_attempts INTEGER DEFAULT 3,
    p_repository_id TEXT DEFAULT NULL,
    p_user_id TEXT DEFAULT NULL,
    p_run_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_id TEXT;
    v_existing_id TEXT;
BEGIN
    -- Check idempotency if key provided
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM "Job"
        WHERE "organizationId" = p_organization_id
          AND "type" = p_type
          AND "idempotencyKey" = p_idempotency_key;
        
        IF v_existing_id IS NOT NULL THEN
            RETURN v_existing_id; -- Return existing job id
        END IF;
    END IF;

    -- Generate job ID
    v_job_id := 'job_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 9);

    -- Insert new job
    INSERT INTO "Job" (
        id,
        "organizationId",
        "type",
        "status",
        payload,
        "idempotencyKey",
        "scheduledAt",
        "maxRetries",
        "retryCount",
        "repositoryId",
        "userId",
        "runId",
        "createdAt",
        "updatedAt"
    ) VALUES (
        v_job_id,
        p_organization_id,
        p_type,
        'queued',
        p_payload,
        p_idempotency_key,
        p_run_at,
        p_max_attempts,
        0,
        p_repository_id,
        p_user_id,
        p_run_id,
        NOW(),
        NOW()
    );

    RETURN v_job_id;
END;
$$;

-- Function: Claim jobs for processing (worker use)
-- Uses FOR UPDATE SKIP LOCKED for safe concurrent access
-- Returns: TABLE of claimed jobs
CREATE OR REPLACE FUNCTION public.claim_jobs(
    p_worker_id TEXT,
    p_limit INTEGER DEFAULT 1,
    p_job_types TEXT[] DEFAULT NULL, -- Optional: filter by job types
    p_organization_id TEXT DEFAULT NULL -- Optional: filter by tenant (for dedicated workers)
)
RETURNS TABLE (
    job_id TEXT,
    job_type TEXT,
    job_payload JSONB,
    job_attempts INTEGER,
    job_max_attempts INTEGER,
    job_organization_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT j.id
        FROM "Job" j
        WHERE j.status IN ('queued', 'pending', 'retrying')
          AND j."scheduledAt" <= NOW()
          AND j."lockedBy" IS NULL
          AND (p_organization_id IS NULL OR j."organizationId" = p_organization_id)
          AND (p_job_types IS NULL OR j.type = ANY(p_job_types))
        ORDER BY j."scheduledAt" ASC, j."createdAt" ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE "Job" j
    SET 
        "lockedBy" = p_worker_id,
        "lockedAt" = NOW(),
        status = 'running',
        "startedAt" = NOW(),
        "updatedAt" = NOW()
    FROM claimed c
    WHERE j.id = c.id
    RETURNING 
        j.id,
        j.type,
        j.payload,
        j."retryCount",
        j."maxRetries",
        j."organizationId";
END;
$$;

-- Function: Complete a job (mark as succeeded, failed, or dead)
CREATE OR REPLACE FUNCTION public.complete_job(
    p_job_id TEXT,
    p_worker_id TEXT,
    p_status TEXT, -- 'succeeded', 'failed', 'dead'
    p_error TEXT DEFAULT NULL,
    p_result JSONB DEFAULT NULL,
    p_result_ref TEXT DEFAULT NULL -- Optional reference to external result storage
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_record RECORD;
    v_next_run_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate status
    IF p_status NOT IN ('succeeded', 'failed', 'dead') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    -- Get job record with lock
    SELECT * INTO v_job_record
    FROM "Job"
    WHERE id = p_job_id AND "lockedBy" = p_worker_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE; -- Job not found or not locked by this worker
    END IF;

    -- Handle retry logic for failed jobs
    IF p_status = 'failed' AND v_job_record."retryCount" < v_job_record."maxRetries" THEN
        -- Calculate exponential backoff: 2^attempts * 1 second (with jitter)
        v_next_run_at := NOW() + (POWER(2, v_job_record."retryCount" + 1) * INTERVAL '1 second') + (RANDOM() * INTERVAL '1 second');
        
        UPDATE "Job"
        SET 
            status = 'queued',
            "lockedBy" = NULL,
            "lockedAt" = NULL,
            "retryCount" = v_job_record."retryCount" + 1,
            error = p_error,
            "scheduledAt" = v_next_run_at,
            "updatedAt" = NOW()
        WHERE id = p_job_id;
        
        RETURN TRUE;
    END IF;

    -- Mark as final status (succeeded, failed with max retries, or dead)
    UPDATE "Job"
    SET 
        status = p_status,
        "lockedBy" = NULL,
        "lockedAt" = NULL,
        error = p_error,
        result = p_result,
        "completedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = p_job_id;

    RETURN TRUE;
END;
$$;

-- Function: Heartbeat to keep job alive (prevent stale job detection)
CREATE OR REPLACE FUNCTION public.heartbeat_job(
    p_job_id TEXT,
    p_worker_id TEXT,
    p_heartbeat_data JSONB DEFAULT NULL -- Optional: store progress data
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update lockedAt timestamp to prevent reaping
    UPDATE "Job"
    SET 
        "lockedAt" = NOW(),
        "updatedAt" = NOW(),
        result = COALESCE(p_heartbeat_data, result)
    WHERE id = p_job_id 
      AND "lockedBy" = p_worker_id 
      AND status = 'running';

    RETURN FOUND;
END;
$$;

-- Function: Cancel a queued or running job
CREATE OR REPLACE FUNCTION public.cancel_job(
    p_job_id TEXT,
    p_organization_id TEXT, -- For authorization
    p_reason TEXT DEFAULT 'User canceled'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE "Job"
    SET 
        status = 'canceled',
        "lockedBy" = NULL,
        "lockedAt" = NULL,
        error = p_reason,
        "completedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = p_job_id 
      AND "organizationId" = p_organization_id
      AND status IN ('queued', 'pending', 'retrying', 'running');

    RETURN FOUND;
END;
$$;

-- Function: Reap stale jobs (jobs running too long without heartbeat)
-- Should be called periodically by a maintenance worker
CREATE OR REPLACE FUNCTION public.reap_stale_jobs(
    p_max_run_duration INTERVAL DEFAULT INTERVAL '5 minutes',
    p_mark_as_dead BOOLEAN DEFAULT FALSE -- If true, mark as dead; else retry
)
RETURNS TABLE (reaped_job_id TEXT, reaped_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH stale_jobs AS (
        SELECT j.id, j."retryCount", j."maxRetries"
        FROM "Job" j
        WHERE j.status = 'running'
          AND j."lockedAt" < NOW() - p_max_run_duration
        FOR UPDATE SKIP LOCKED
    ),
    updated AS (
        UPDATE "Job" j
        SET 
            status = CASE 
                WHEN p_mark_as_dead OR sj."retryCount" >= sj."maxRetries" THEN 'dead'
                ELSE 'queued'
            END,
            "lockedBy" = NULL,
            "lockedAt" = NULL,
            error = CASE 
                WHEN p_mark_as_dead OR sj."retryCount" >= sj."maxRetries" THEN 'Job exceeded maximum runtime and was reaped'
                ELSE 'Job timed out, retrying'
            END,
            "retryCount" = CASE 
                WHEN p_mark_as_dead OR sj."retryCount" >= sj."maxRetries" THEN sj."retryCount"
                ELSE sj."retryCount" + 1
            END,
            "scheduledAt" = CASE 
                WHEN p_mark_as_dead OR sj."retryCount" >= sj."maxRetries" THEN j."scheduledAt"
                ELSE NOW() + (POWER(2, sj."retryCount" + 1) * INTERVAL '1 second')
            END,
            "updatedAt" = NOW()
        FROM stale_jobs sj
        WHERE j.id = sj.id
        RETURNING j.id, j.status
    )
    SELECT updated.id, updated.status FROM updated;
END;
$$;

-- ============================================
-- 4. RLS Policies for Job Table
-- ============================================

-- Enable RLS on Job table (already enabled by reconcile migration, idempotent)
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate (idempotent)
DROP POLICY IF EXISTS "job_tenant_select" ON "Job";
DROP POLICY IF EXISTS "job_tenant_insert" ON "Job";
DROP POLICY IF EXISTS "job_tenant_update" ON "Job";
DROP POLICY IF EXISTS "job_service_insert" ON "Job";
DROP POLICY IF EXISTS "Users can view jobs for their organizations" ON "Job";
DROP POLICY IF EXISTS "Users can create jobs" ON "Job";
DROP POLICY IF EXISTS "Users can view jobs for their organizations" ON "Job";
DROP POLICY IF EXISTS "Users can create jobs" ON "Job";

-- Policy: End-users can only read their tenant's jobs
CREATE POLICY "job_tenant_select" ON "Job"
    FOR SELECT USING (
        -- User can see jobs from their organization
        public.is_org_member("organizationId")
        OR
        -- Or jobs they created (personal jobs without org)
        ("userId" = public.current_user_id() AND "organizationId" IS NULL)
        OR
        -- Or jobs linked to repositories they have access to
        EXISTS (
            SELECT 1 FROM "Repository" r
            WHERE r.id = "Job"."repositoryId"
            AND public.is_org_member(r."organizationId")
        )
    );

-- Policy: Only service role can insert jobs (server-side only)
-- End-users cannot directly enqueue jobs; must use API
CREATE POLICY "job_service_insert" ON "Job"
    FOR INSERT WITH CHECK (false); -- Service role bypasses RLS

-- Policy: Only service role or job locker can update jobs
CREATE POLICY "job_service_update" ON "Job"
    FOR UPDATE USING (
        -- Service role can update any job (bypasses via security definer)
        -- Workers can update jobs they have locked
        "lockedBy" IS NOT NULL
        OR
        -- Or users can update their own queued jobs (to cancel)
        ("userId" = public.current_user_id() AND status IN ('queued', 'pending'))
    );

-- ============================================
-- 5. Harden RPC Functions (Fix Search Path)
-- ============================================

ALTER FUNCTION public.enqueue_job(TEXT, TEXT, JSONB, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT) 
    SET search_path = public;

ALTER FUNCTION public.claim_jobs(TEXT, INTEGER, TEXT[], TEXT) 
    SET search_path = public;

ALTER FUNCTION public.complete_job(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) 
    SET search_path = public;

ALTER FUNCTION public.heartbeat_job(TEXT, TEXT, JSONB) 
    SET search_path = public;

ALTER FUNCTION public.cancel_job(TEXT, TEXT, TEXT) 
    SET search_path = public;

ALTER FUNCTION public.reap_stale_jobs(INTERVAL, BOOLEAN) 
    SET search_path = public;

-- ============================================
-- 6. Seed Job Types for Testing
-- ============================================

-- Create a seed helper function for smoke tests
CREATE OR REPLACE FUNCTION public.create_seed_job(
    p_organization_id TEXT,
    p_seed_type TEXT DEFAULT 'smoke.test.echo'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_id TEXT;
BEGIN
    v_job_id := public.enqueue_job(
        p_organization_id := p_organization_id,
        p_type := p_seed_type,
        p_payload := jsonb_build_object(
            'test', true,
            'seed', true,
            'createdAt', NOW()
        ),
        p_idempotency_key := 'seed_' || p_organization_id || '_' || p_seed_type || '_' || DATE(NOW())::TEXT,
        p_max_attempts := 1
    );
    
    RETURN v_job_id;
END;
$$;

-- ============================================
-- 7. Migration Complete Verification
-- ============================================

-- Verify all required columns exist
DO $$
DECLARE
    v_missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check organizationId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'organizationId') THEN
        v_missing_columns := array_append(v_missing_columns, 'organizationId');
    END IF;

    -- Check idempotencyKey
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'idempotencyKey') THEN
        v_missing_columns := array_append(v_missing_columns, 'idempotencyKey');
    END IF;

    -- Check lockedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'lockedAt') THEN
        v_missing_columns := array_append(v_missing_columns, 'lockedAt');
    END IF;

    -- Check lockedBy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'lockedBy') THEN
        v_missing_columns := array_append(v_missing_columns, 'lockedBy');
    END IF;

    IF array_length(v_missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns in Job table: %', array_to_string(v_missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required Job table columns verified.';
    END IF;
END $$;

-- Verify functions exist
DO $$
DECLARE
    v_missing_functions TEXT[] := ARRAY[]::TEXT[];
    v_required_functions TEXT[] := ARRAY['enqueue_job', 'claim_jobs', 'complete_job', 'heartbeat_job', 'cancel_job', 'reap_stale_jobs'];
    v_func TEXT;
BEGIN
    FOREACH v_func IN ARRAY v_required_functions LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = v_func) THEN
            v_missing_functions := array_append(v_missing_functions, v_func);
        END IF;
    END LOOP;

    IF array_length(v_missing_functions, 1) > 0 THEN
        RAISE WARNING 'Missing functions: %', array_to_string(v_missing_functions, ', ');
    ELSE
        RAISE NOTICE 'All required RPC functions verified.';
    END IF;
END $$;

-- ============================================
-- Rollback Instructions (if needed)
-- ============================================
-- To rollback this migration:
--
-- 1. Remove RPC functions:
--    DROP FUNCTION IF EXISTS public.enqueue_job(TEXT, TEXT, JSONB, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT);
--    DROP FUNCTION IF EXISTS public.claim_jobs(TEXT, INTEGER, TEXT[], TEXT);
--    DROP FUNCTION IF EXISTS public.complete_job(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);
--    DROP FUNCTION IF EXISTS public.heartbeat_job(TEXT, TEXT, JSONB);
--    DROP FUNCTION IF EXISTS public.cancel_job(TEXT, TEXT, TEXT);
--    DROP FUNCTION IF EXISTS public.reap_stale_jobs(INTERVAL, BOOLEAN);
--    DROP FUNCTION IF EXISTS public.create_seed_job(TEXT, TEXT);
--
-- 2. Remove RLS policies:
--    DROP POLICY IF EXISTS "job_tenant_select" ON "Job";
--    DROP POLICY IF EXISTS "job_service_insert" ON "Job";
--    DROP POLICY IF EXISTS "job_service_update" ON "Job";
--
-- 3. Remove indexes:
--    DROP INDEX IF EXISTS "Job_status_runAt_claim_idx";
--    DROP INDEX IF EXISTS "Job_lockedBy_idx";
--    DROP INDEX IF EXISTS "Job_organizationId_status_idx";
--    DROP INDEX IF EXISTS "Job_idempotencyKey_idx";
--    DROP INDEX IF EXISTS "Job_type_status_scheduledAt_idx";
--    DROP INDEX IF EXISTS "Job_org_type_idempotency_key";
--
-- 4. Remove columns (optional - data loss):
--    ALTER TABLE "Job" DROP COLUMN IF EXISTS "organizationId";
--    ALTER TABLE "Job" DROP COLUMN IF EXISTS "idempotencyKey";
--    ALTER TABLE "Job" DROP COLUMN IF EXISTS "lockedAt";
--    ALTER TABLE "Job" DROP COLUMN IF EXISTS "lockedBy";
--
-- ============================================
-- Migration Complete
-- ============================================
