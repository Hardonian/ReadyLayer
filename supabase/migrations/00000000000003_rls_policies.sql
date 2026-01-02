-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- 
-- Enables database-level tenant isolation using RLS policies.
-- All policies use the helper functions created in the backend contract migration.
-- 
-- Safe to run multiple times - uses IF NOT EXISTS patterns.
-- 
-- Generated: 2026-01-02
-- ============================================

-- ============================================
-- Enable RLS on all tenant-scoped tables
-- ============================================

ALTER TABLE "Repository" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Test" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Doc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Violation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RepositoryConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Installation" ENABLE ROW LEVEL SECURITY;

-- Note: User, Organization, Subscription, ApiKey, AuditLog, Job tables
-- are handled differently (User/Org are public, others have specific policies)

-- ============================================
-- Repository Policies
-- ============================================

-- Policy: Users can only see repositories in their organizations
DROP POLICY IF EXISTS "repository_org_members_only" ON "Repository";
CREATE POLICY "repository_org_members_only"
  ON "Repository"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- Review Policies
-- ============================================

-- Policy: Users can only see reviews for repositories in their organizations
DROP POLICY IF EXISTS "review_org_members_only" ON "Review";
CREATE POLICY "review_org_members_only"
  ON "Review"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "Review"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- Test Policies
-- ============================================

-- Policy: Users can only see tests for repositories in their organizations
DROP POLICY IF EXISTS "test_org_members_only" ON "Test";
CREATE POLICY "test_org_members_only"
  ON "Test"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "Test"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- Doc Policies
-- ============================================

-- Policy: Users can only see docs for repositories in their organizations
DROP POLICY IF EXISTS "doc_org_members_only" ON "Doc";
CREATE POLICY "doc_org_members_only"
  ON "Doc"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "Doc"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- Violation Policies
-- ============================================

-- Policy: Users can only see violations for repositories in their organizations
DROP POLICY IF EXISTS "violation_org_members_only" ON "Violation";
CREATE POLICY "violation_org_members_only"
  ON "Violation"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "Violation"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- RepositoryConfig Policies
-- ============================================

-- Policy: Users can only see configs for repositories in their organizations
DROP POLICY IF EXISTS "repository_config_org_members_only" ON "RepositoryConfig";
CREATE POLICY "repository_config_org_members_only"
  ON "RepositoryConfig"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "RepositoryConfig"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- CostTracking Policies
-- ============================================

-- Policy: Users can only see cost tracking for their organizations
DROP POLICY IF EXISTS "cost_tracking_org_members_only" ON "CostTracking";
CREATE POLICY "cost_tracking_org_members_only"
  ON "CostTracking"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- OrganizationMember Policies
-- ============================================

-- Policy: Users can only see memberships for organizations they belong to
DROP POLICY IF EXISTS "org_member_self_only" ON "OrganizationMember";
CREATE POLICY "org_member_self_only"
  ON "OrganizationMember"
  FOR SELECT
  USING (
    "userId" = public.current_user_id()
    OR public.is_org_member("organizationId")
  );

-- Policy: Only org owners/admins can insert/update memberships
DROP POLICY IF EXISTS "org_member_admin_only" ON "OrganizationMember";
CREATE POLICY "org_member_admin_only"
  ON "OrganizationMember"
  FOR INSERT
  WITH CHECK (public.has_org_role("organizationId", 'admin'));

DROP POLICY IF EXISTS "org_member_admin_update_only" ON "OrganizationMember";
CREATE POLICY "org_member_admin_update_only"
  ON "OrganizationMember"
  FOR UPDATE
  USING (public.has_org_role("organizationId", 'admin'));

-- ============================================
-- Installation Policies
-- ============================================

-- Policy: Users can only see installations for their organizations
DROP POLICY IF EXISTS "installation_org_members_only" ON "Installation";
CREATE POLICY "installation_org_members_only"
  ON "Installation"
  FOR ALL
  USING (
    "organizationId" IS NULL
    OR public.is_org_member("organizationId")
  );

-- ============================================
-- AuditLog Policies
-- ============================================

-- Enable RLS on AuditLog
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see audit logs for their organizations
DROP POLICY IF EXISTS "audit_log_org_members_only" ON "AuditLog";
CREATE POLICY "audit_log_org_members_only"
  ON "AuditLog"
  FOR SELECT
  USING (
    "organizationId" IS NULL
    OR public.is_org_member("organizationId")
  );

-- ============================================
-- ApiKey Policies
-- ============================================

-- Enable RLS on ApiKey
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own API keys
DROP POLICY IF EXISTS "api_key_owner_only" ON "ApiKey";
CREATE POLICY "api_key_owner_only"
  ON "ApiKey"
  FOR ALL
  USING ("userId" = public.current_user_id());

-- ============================================
-- Job Policies
-- ============================================

-- Enable RLS on Job
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see jobs for repositories in their organizations
-- Service role can see all jobs (for workers)
DROP POLICY IF EXISTS "job_org_members_only" ON "Job";
CREATE POLICY "job_org_members_only"
  ON "Job"
  FOR SELECT
  USING (
    "repositoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "Job"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- Verification Queries
-- ============================================

-- Verify RLS is enabled (run manually to verify)
-- SELECT tablename, relrowsecurity 
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
-- AND c.relkind = 'r'
-- AND tablename IN (
--   'Repository', 'Review', 'Test', 'Doc', 'Violation',
--   'RepositoryConfig', 'CostTracking', 'OrganizationMember',
--   'Installation', 'AuditLog', 'ApiKey', 'Job'
-- );
