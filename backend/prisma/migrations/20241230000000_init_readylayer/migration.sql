-- ============================================
-- ReadyLayer Platform Migration
-- Generated from Prisma Schema
-- Includes: Tables, Indexes, RLS Policies, Triggers
-- Safe DDL Practices: IF NOT EXISTS, idempotent operations
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Link User table to Supabase Auth
-- ============================================

-- Create a function to sync auth.users with our User table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, image, "createdAt")
  VALUES (
    NEW.id::TEXT,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, "User".name),
    image = COALESCE(EXCLUDED.image, "User".image),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.users to User table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Core Tables
-- ============================================

-- User Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT UNIQUE,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_id_check" CHECK (length("id") > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_unique_idx" ON "User"("email") WHERE "email" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Organization Table
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_name_check" CHECK (length("name") > 0),
    CONSTRAINT "Organization_slug_check" CHECK (length("slug") > 0),
    CONSTRAINT "Organization_plan_check" CHECK ("plan" IN ('starter', 'growth', 'scale'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_unique_idx" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");

-- OrganizationMember Table
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_role_check" CHECK ("role" IN ('owner', 'admin', 'member')),
    CONSTRAINT "OrganizationMember_organizationId_userId_key" UNIQUE ("organizationId", "userId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_unique_idx" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- Repository Table
CREATE TABLE IF NOT EXISTS "Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "url" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Repository_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Repository_name_check" CHECK (length("name") > 0),
    CONSTRAINT "Repository_fullName_check" CHECK (length("fullName") > 0),
    CONSTRAINT "Repository_provider_check" CHECK ("provider" IN ('github', 'gitlab', 'bitbucket')),
    CONSTRAINT "Repository_fullName_provider_key" UNIQUE ("fullName", "provider")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Repository_fullName_provider_unique_idx" ON "Repository"("fullName", "provider");
CREATE INDEX IF NOT EXISTS "Repository_organizationId_idx" ON "Repository"("organizationId");
CREATE INDEX IF NOT EXISTS "Repository_provider_providerId_idx" ON "Repository"("provider", "providerId");
CREATE INDEX IF NOT EXISTS "Repository_fullName_idx" ON "Repository"("fullName");

-- Installation Table
CREATE TABLE IF NOT EXISTS "Installation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "repositoryId" TEXT,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "selectedRepos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Installation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Installation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Installation_provider_check" CHECK ("provider" IN ('github', 'gitlab', 'bitbucket')),
    CONSTRAINT "Installation_provider_providerId_key" UNIQUE ("provider", "providerId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Installation_provider_providerId_unique_idx" ON "Installation"("provider", "providerId");
CREATE INDEX IF NOT EXISTS "Installation_organizationId_idx" ON "Installation"("organizationId");
CREATE INDEX IF NOT EXISTS "Installation_repositoryId_idx" ON "Installation"("repositoryId");

-- RepositoryConfig Table
CREATE TABLE IF NOT EXISTS "RepositoryConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL UNIQUE,
    "config" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "rawConfig" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepositoryConfig_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RepositoryConfig_repositoryId_unique_idx" ON "RepositoryConfig"("repositoryId");
CREATE INDEX IF NOT EXISTS "RepositoryConfig_repositoryId_idx" ON "RepositoryConfig"("repositoryId");

-- OrganizationConfig Table
CREATE TABLE IF NOT EXISTS "OrganizationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL UNIQUE,
    "config" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationConfig_organizationId_unique_idx" ON "OrganizationConfig"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationConfig_organizationId_idx" ON "OrganizationConfig"("organizationId");

-- Review Table
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prSha" TEXT NOT NULL,
    "prTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "issuesFound" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "summary" JSONB,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Review_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_status_check" CHECK ("status" IN ('pending', 'completed', 'failed', 'blocked')),
    CONSTRAINT "Review_prNumber_check" CHECK ("prNumber" > 0),
    CONSTRAINT "Review_repositoryId_prNumber_prSha_key" UNIQUE ("repositoryId", "prNumber", "prSha")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_repositoryId_prNumber_prSha_unique_idx" ON "Review"("repositoryId", "prNumber", "prSha");
CREATE INDEX IF NOT EXISTS "Review_repositoryId_idx" ON "Review"("repositoryId");
CREATE INDEX IF NOT EXISTS "Review_status_idx" ON "Review"("status");
CREATE INDEX IF NOT EXISTS "Review_isBlocked_idx" ON "Review"("isBlocked");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

-- Test Table
CREATE TABLE IF NOT EXISTS "Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER,
    "prSha" TEXT,
    "filePath" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "testContent" TEXT,
    "coverage" JSONB,
    "placement" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Test_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Test_status_check" CHECK ("status" IN ('pending', 'generated', 'failed')),
    CONSTRAINT "Test_filePath_check" CHECK (length("filePath") > 0)
);

CREATE INDEX IF NOT EXISTS "Test_repositoryId_idx" ON "Test"("repositoryId");
CREATE INDEX IF NOT EXISTS "Test_prNumber_idx" ON "Test"("prNumber");
CREATE INDEX IF NOT EXISTS "Test_status_idx" ON "Test"("status");
CREATE INDEX IF NOT EXISTS "Test_filePath_idx" ON "Test"("filePath");

-- Doc Table
CREATE TABLE IF NOT EXISTS "Doc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "version" TEXT,
    "content" TEXT,
    "spec" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "driftDetected" BOOLEAN NOT NULL DEFAULT false,
    "driftDetails" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Doc_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Doc_status_check" CHECK ("status" IN ('pending', 'generated', 'failed', 'published')),
    CONSTRAINT "Doc_format_check" CHECK ("format" IN ('openapi', 'markdown')),
    CONSTRAINT "Doc_repositoryId_ref_format_key" UNIQUE ("repositoryId", "ref", "format")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Doc_repositoryId_ref_format_unique_idx" ON "Doc"("repositoryId", "ref", "format");
CREATE INDEX IF NOT EXISTS "Doc_repositoryId_idx" ON "Doc"("repositoryId");
CREATE INDEX IF NOT EXISTS "Doc_status_idx" ON "Doc"("status");
CREATE INDEX IF NOT EXISTS "Doc_driftDetected_idx" ON "Doc"("driftDetected");

-- Job Table
CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "result" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT,
    "userId" TEXT,
    CONSTRAINT "Job_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_status_check" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    CONSTRAINT "Job_retryCount_check" CHECK ("retryCount" >= 0),
    CONSTRAINT "Job_maxRetries_check" CHECK ("maxRetries" >= 0)
);

CREATE INDEX IF NOT EXISTS "Job_type_idx" ON "Job"("type");
CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status");
CREATE INDEX IF NOT EXISTS "Job_scheduledAt_idx" ON "Job"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Job_repositoryId_idx" ON "Job"("repositoryId");

-- Violation Table
CREATE TABLE IF NOT EXISTS "Violation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "reviewId" TEXT,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Violation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Violation_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Violation_severity_check" CHECK ("severity" IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT "Violation_line_check" CHECK ("line" > 0),
    CONSTRAINT "Violation_file_check" CHECK (length("file") > 0),
    CONSTRAINT "Violation_message_check" CHECK (length("message") > 0)
);

CREATE INDEX IF NOT EXISTS "Violation_repositoryId_idx" ON "Violation"("repositoryId");
CREATE INDEX IF NOT EXISTS "Violation_ruleId_idx" ON "Violation"("ruleId");
CREATE INDEX IF NOT EXISTS "Violation_severity_idx" ON "Violation"("severity");
CREATE INDEX IF NOT EXISTS "Violation_detectedAt_idx" ON "Violation"("detectedAt");

-- ApiKey Table
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiKey_name_check" CHECK (length("name") > 0),
    CONSTRAINT "ApiKey_keyHash_check" CHECK (length("keyHash") > 0)
);

CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- Subscription Table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_plan_check" CHECK ("plan" IN ('starter', 'growth', 'scale')),
    CONSTRAINT "Subscription_status_check" CHECK ("status" IN ('active', 'cancelled', 'expired', 'trialing')),
    CONSTRAINT "Subscription_organizationId_key" UNIQUE ("organizationId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_unique_idx" ON "Subscription"("organizationId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CostTracking Table
CREATE TABLE IF NOT EXISTS "CostTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "service" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" DECIMAL(10, 4) NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostTracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostTracking_amount_check" CHECK ("amount" >= 0),
    CONSTRAINT "CostTracking_units_check" CHECK ("units" >= 0),
    CONSTRAINT "CostTracking_organizationId_date_service_provider_key" UNIQUE ("organizationId", "date", "service", "provider")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CostTracking_organizationId_date_service_provider_unique_idx" ON "CostTracking"("organizationId", "date", "service", "provider");
CREATE INDEX IF NOT EXISTS "CostTracking_organizationId_idx" ON "CostTracking"("organizationId");
CREATE INDEX IF NOT EXISTS "CostTracking_date_idx" ON "CostTracking"("date");
CREATE INDEX IF NOT EXISTS "CostTracking_service_idx" ON "CostTracking"("service");

-- AuditLog Table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_action_check" CHECK (length("action") > 0),
    CONSTRAINT "AuditLog_resourceType_check" CHECK (length("resourceType") > 0)
);

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ============================================
-- Functions for UpdatedAt Timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updatedAt columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_updated_at') THEN
        CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_updated_at') THEN
        CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON "Organization"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_repository_updated_at') THEN
        CREATE TRIGGER update_repository_updated_at BEFORE UPDATE ON "Repository"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_installation_updated_at') THEN
        CREATE TRIGGER update_installation_updated_at BEFORE UPDATE ON "Installation"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_repositoryconfig_updated_at') THEN
        CREATE TRIGGER update_repositoryconfig_updated_at BEFORE UPDATE ON "RepositoryConfig"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizationconfig_updated_at') THEN
        CREATE TRIGGER update_organizationconfig_updated_at BEFORE UPDATE ON "OrganizationConfig"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_review_updated_at') THEN
        CREATE TRIGGER update_review_updated_at BEFORE UPDATE ON "Review"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_test_updated_at') THEN
        CREATE TRIGGER update_test_updated_at BEFORE UPDATE ON "Test"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_doc_updated_at') THEN
        CREATE TRIGGER update_doc_updated_at BEFORE UPDATE ON "Doc"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_job_updated_at') THEN
        CREATE TRIGGER update_job_updated_at BEFORE UPDATE ON "Job"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_apikey_updated_at') THEN
        CREATE TRIGGER update_apikey_updated_at BEFORE UPDATE ON "ApiKey"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_updated_at') THEN
        CREATE TRIGGER update_subscription_updated_at BEFORE UPDATE ON "Subscription"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Repository" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Installation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RepositoryConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Test" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Doc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Violation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from Supabase auth
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS TEXT AS $$
  SELECT COALESCE(auth.uid()::TEXT, NULL);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OrganizationMember"
    WHERE "organizationId" = org_id
    AND "userId" = public.current_user_id()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user has role in organization
CREATE OR REPLACE FUNCTION public.has_org_role(org_id TEXT, required_role TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OrganizationMember"
    WHERE "organizationId" = org_id
    AND "userId" = public.current_user_id()
    AND (
      "role" = required_role OR
      (required_role = 'admin' AND "role" = 'owner') OR
      (required_role = 'member' AND "role" IN ('admin', 'owner'))
    )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- User Policies
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (public.current_user_id() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON "User";
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (public.current_user_id() = id);

-- Organization Policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON "Organization";
CREATE POLICY "Users can view organizations they belong to" ON "Organization"
    FOR SELECT USING (public.is_org_member(id));

DROP POLICY IF EXISTS "Org owners can update organization" ON "Organization";
CREATE POLICY "Org owners can update organization" ON "Organization"
    FOR UPDATE USING (public.has_org_role(id, 'owner'));

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "Organization";
CREATE POLICY "Authenticated users can create organizations" ON "Organization"
    FOR INSERT WITH CHECK (public.current_user_id() IS NOT NULL);

-- OrganizationMember Policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON "OrganizationMember";
CREATE POLICY "Users can view members of their organizations" ON "OrganizationMember"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org admins can add members" ON "OrganizationMember";
CREATE POLICY "Org admins can add members" ON "OrganizationMember"
    FOR INSERT WITH CHECK (public.has_org_role("organizationId", 'admin'));

DROP POLICY IF EXISTS "Org admins can remove members" ON "OrganizationMember";
CREATE POLICY "Org admins can remove members" ON "OrganizationMember"
    FOR DELETE USING (public.has_org_role("organizationId", 'admin'));

-- Repository Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view repositories in their organizations" ON "Repository";
CREATE POLICY "Users can view repositories in their organizations" ON "Repository"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org members can create repositories" ON "Repository";
CREATE POLICY "Org members can create repositories" ON "Repository"
    FOR INSERT WITH CHECK (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org admins can update repositories" ON "Repository";
CREATE POLICY "Org admins can update repositories" ON "Repository"
    FOR UPDATE USING (public.has_org_role("organizationId", 'admin'));

DROP POLICY IF EXISTS "Org admins can delete repositories" ON "Repository";
CREATE POLICY "Org admins can delete repositories" ON "Repository"
    FOR DELETE USING (public.has_org_role("organizationId", 'admin'));

-- Installation Policies
DROP POLICY IF EXISTS "Users can view installations in their organizations" ON "Installation";
CREATE POLICY "Users can view installations in their organizations" ON "Installation"
    FOR SELECT USING (
        ("organizationId" IS NOT NULL AND public.is_org_member("organizationId")) OR
        ("repositoryId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Installation"."repositoryId"
            AND public.is_org_member("Repository"."organizationId")
        ))
    );

DROP POLICY IF EXISTS "Org admins can manage installations" ON "Installation";
CREATE POLICY "Org admins can manage installations" ON "Installation"
    FOR ALL USING (
        ("organizationId" IS NOT NULL AND public.has_org_role("organizationId", 'admin')) OR
        ("repositoryId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Installation"."repositoryId"
            AND public.has_org_role("Repository"."organizationId", 'admin')
        ))
    );

-- RepositoryConfig Policies
DROP POLICY IF EXISTS "Users can view configs for repositories in their organizations" ON "RepositoryConfig";
CREATE POLICY "Users can view configs for repositories in their organizations" ON "RepositoryConfig"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "RepositoryConfig"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "Org admins can manage repository configs" ON "RepositoryConfig";
CREATE POLICY "Org admins can manage repository configs" ON "RepositoryConfig"
    FOR ALL USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "RepositoryConfig"."repositoryId"
        AND public.has_org_role("Repository"."organizationId", 'admin')
    ));

-- OrganizationConfig Policies
DROP POLICY IF EXISTS "Users can view configs for their organizations" ON "OrganizationConfig";
CREATE POLICY "Users can view configs for their organizations" ON "OrganizationConfig"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org admins can manage organization configs" ON "OrganizationConfig";
CREATE POLICY "Org admins can manage organization configs" ON "OrganizationConfig"
    FOR ALL USING (public.has_org_role("organizationId", 'admin'));

-- Review Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view reviews for repositories in their organizations" ON "Review";
CREATE POLICY "Users can view reviews for repositories in their organizations" ON "Review"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Review"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "Org members can create reviews" ON "Review";
CREATE POLICY "Org members can create reviews" ON "Review"
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Review"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "Org members can update reviews" ON "Review";
CREATE POLICY "Org members can update reviews" ON "Review"
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Review"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

-- Test Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view tests for repositories in their organizations" ON "Test";
CREATE POLICY "Users can view tests for repositories in their organizations" ON "Test"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Test"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "Org members can manage tests" ON "Test";
CREATE POLICY "Org members can manage tests" ON "Test"
    FOR ALL USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Test"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

-- Doc Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view docs for repositories in their organizations" ON "Doc";
CREATE POLICY "Users can view docs for repositories in their organizations" ON "Doc"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Doc"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "Org members can manage docs" ON "Doc";
CREATE POLICY "Org members can manage docs" ON "Doc"
    FOR ALL USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Doc"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

-- Job Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view jobs for their organizations" ON "Job";
CREATE POLICY "Users can view jobs for their organizations" ON "Job"
    FOR SELECT USING (
        ("repositoryId" IS NULL AND "userId" = public.current_user_id()) OR
        ("repositoryId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Job"."repositoryId"
            AND public.is_org_member("Repository"."organizationId")
        ))
    );

DROP POLICY IF EXISTS "Users can create jobs" ON "Job";
CREATE POLICY "Users can create jobs" ON "Job"
    FOR INSERT WITH CHECK (
        ("repositoryId" IS NULL AND "userId" = public.current_user_id()) OR
        ("repositoryId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Job"."repositoryId"
            AND public.is_org_member("Repository"."organizationId")
        ))
    );

-- Violation Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view violations for repositories in their organizations" ON "Violation";
CREATE POLICY "Users can view violations for repositories in their organizations" ON "Violation"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Violation"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

DROP POLICY IF EXISTS "System can create violations" ON "Violation";
CREATE POLICY "System can create violations" ON "Violation"
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM "Repository" WHERE "Repository"."id" = "Violation"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    ));

-- ApiKey Policies
DROP POLICY IF EXISTS "Users can view own API keys" ON "ApiKey";
CREATE POLICY "Users can view own API keys" ON "ApiKey"
    FOR SELECT USING (public.current_user_id() = "userId");

DROP POLICY IF EXISTS "Users can manage own API keys" ON "ApiKey";
CREATE POLICY "Users can manage own API keys" ON "ApiKey"
    FOR ALL USING (public.current_user_id() = "userId");

-- Subscription Policies
DROP POLICY IF EXISTS "Users can view subscriptions for their organizations" ON "Subscription";
CREATE POLICY "Users can view subscriptions for their organizations" ON "Subscription"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org owners can manage subscriptions" ON "Subscription";
CREATE POLICY "Org owners can manage subscriptions" ON "Subscription"
    FOR ALL USING (public.has_org_role("organizationId", 'owner'));

-- CostTracking Policies
DROP POLICY IF EXISTS "Users can view cost tracking for their organizations" ON "CostTracking";
CREATE POLICY "Users can view cost tracking for their organizations" ON "CostTracking"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "System can create cost tracking" ON "CostTracking";
CREATE POLICY "System can create cost tracking" ON "CostTracking"
    FOR INSERT WITH CHECK (public.is_org_member("organizationId"));

-- AuditLog Policies
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON "AuditLog";
CREATE POLICY "Users can view audit logs for their organizations" ON "AuditLog"
    FOR SELECT USING (
        ("organizationId" IS NULL AND "userId" = public.current_user_id()) OR
        ("organizationId" IS NOT NULL AND public.is_org_member("organizationId"))
    );

DROP POLICY IF EXISTS "System can create audit logs" ON "AuditLog";
CREATE POLICY "System can create audit logs" ON "AuditLog"
    FOR INSERT WITH CHECK (true); -- System can log all actions

-- ============================================
-- Performance Indexes for Common Queries
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "Review_repositoryId_status_createdAt_idx" ON "Review"("repositoryId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Repository_organizationId_enabled_idx" ON "Repository"("organizationId", "enabled");
CREATE INDEX IF NOT EXISTS "Job_status_scheduledAt_idx" ON "Job"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Violation_repositoryId_severity_detectedAt_idx" ON "Violation"("repositoryId", "severity", "detectedAt" DESC);
CREATE INDEX IF NOT EXISTS "CostTracking_organizationId_date_idx" ON "CostTracking"("organizationId", "date" DESC);

-- ============================================
-- Migration Complete
-- ============================================
