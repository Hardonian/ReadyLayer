-- ============================================
-- Policy Engine Models Migration
-- ============================================
-- 
-- Adds PolicyPack, PolicyRule, Waiver, and EvidenceBundle models
-- for Policy-as-Code governance layer.
-- 
-- Generated: 2026-01-02
-- ============================================

-- ============================================
-- Policy Pack Table
-- ============================================

CREATE TABLE IF NOT EXISTS "PolicyPack" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "version" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PolicyPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PolicyPack_organizationId_repositoryId_version_key" ON "PolicyPack"("organizationId", "repositoryId", "version");
CREATE INDEX IF NOT EXISTS "PolicyPack_organizationId_idx" ON "PolicyPack"("organizationId");
CREATE INDEX IF NOT EXISTS "PolicyPack_repositoryId_idx" ON "PolicyPack"("repositoryId");
CREATE INDEX IF NOT EXISTS "PolicyPack_checksum_idx" ON "PolicyPack"("checksum");
CREATE INDEX IF NOT EXISTS "PolicyPack_createdAt_idx" ON "PolicyPack"("createdAt");

ALTER TABLE "PolicyPack" ADD CONSTRAINT "PolicyPack_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyPack" ADD CONSTRAINT "PolicyPack_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Policy Rule Table
-- ============================================

CREATE TABLE IF NOT EXISTS "PolicyRule" (
  "id" TEXT NOT NULL,
  "policyPackId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "severityMapping" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "params" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PolicyRule_policyPackId_ruleId_key" ON "PolicyRule"("policyPackId", "ruleId");
CREATE INDEX IF NOT EXISTS "PolicyRule_policyPackId_idx" ON "PolicyRule"("policyPackId");
CREATE INDEX IF NOT EXISTS "PolicyRule_ruleId_idx" ON "PolicyRule"("ruleId");

ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_policyPackId_fkey" FOREIGN KEY ("policyPackId") REFERENCES "PolicyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Waiver Table
-- ============================================

CREATE TABLE IF NOT EXISTS "Waiver" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "ruleId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scopeValue" TEXT,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Waiver_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Waiver_organizationId_idx" ON "Waiver"("organizationId");
CREATE INDEX IF NOT EXISTS "Waiver_repositoryId_idx" ON "Waiver"("repositoryId");
CREATE INDEX IF NOT EXISTS "Waiver_ruleId_idx" ON "Waiver"("ruleId");
CREATE INDEX IF NOT EXISTS "Waiver_expiresAt_idx" ON "Waiver"("expiresAt");
CREATE INDEX IF NOT EXISTS "Waiver_createdAt_idx" ON "Waiver"("createdAt");

ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Evidence Bundle Table
-- ============================================

CREATE TABLE IF NOT EXISTS "EvidenceBundle" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT,
  "testId" TEXT,
  "docId" TEXT,
  "inputsMetadata" JSONB NOT NULL,
  "rulesFired" JSONB NOT NULL,
  "deterministicScore" DECIMAL(10, 4) NOT NULL,
  "artifacts" JSONB,
  "policyChecksum" TEXT NOT NULL,
  "toolVersions" JSONB,
  "timings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvidenceBundle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EvidenceBundle_reviewId_key" ON "EvidenceBundle"("reviewId");
CREATE UNIQUE INDEX IF NOT EXISTS "EvidenceBundle_testId_key" ON "EvidenceBundle"("testId");
CREATE UNIQUE INDEX IF NOT EXISTS "EvidenceBundle_docId_key" ON "EvidenceBundle"("docId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_reviewId_idx" ON "EvidenceBundle"("reviewId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_testId_idx" ON "EvidenceBundle"("testId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_docId_idx" ON "EvidenceBundle"("docId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_policyChecksum_idx" ON "EvidenceBundle"("policyChecksum");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_createdAt_idx" ON "EvidenceBundle"("createdAt");

ALTER TABLE "EvidenceBundle" ADD CONSTRAINT "EvidenceBundle_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceBundle" ADD CONSTRAINT "EvidenceBundle_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceBundle" ADD CONSTRAINT "EvidenceBundle_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Enable RLS on Policy Tables
-- ============================================

ALTER TABLE "PolicyPack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PolicyRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Waiver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceBundle" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see policy packs in their organizations
DROP POLICY IF EXISTS "policy_pack_org_members_only" ON "PolicyPack";
CREATE POLICY "policy_pack_org_members_only"
  ON "PolicyPack"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- Policy: Users can only see policy rules for packs in their organizations
DROP POLICY IF EXISTS "policy_rule_org_members_only" ON "PolicyRule";
CREATE POLICY "policy_rule_org_members_only"
  ON "PolicyRule"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "PolicyPack"
      WHERE "PolicyPack"."id" = "PolicyRule"."policyPackId"
      AND public.is_org_member("PolicyPack"."organizationId")
    )
  );

-- Policy: Users can only see waivers in their organizations
DROP POLICY IF EXISTS "waiver_org_members_only" ON "Waiver";
CREATE POLICY "waiver_org_members_only"
  ON "Waiver"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- Policy: Users can only see evidence bundles for reviews/tests/docs in their organizations
DROP POLICY IF EXISTS "evidence_bundle_org_members_only" ON "EvidenceBundle";
CREATE POLICY "evidence_bundle_org_members_only"
  ON "EvidenceBundle"
  FOR ALL
  USING (
    (
      "reviewId" IS NULL OR EXISTS (
        SELECT 1 FROM "Review"
        WHERE "Review"."id" = "EvidenceBundle"."reviewId"
        AND public.is_org_member(
          (SELECT "organizationId" FROM "Repository" WHERE "id" = "Review"."repositoryId")
        )
      )
    ) AND (
      "testId" IS NULL OR EXISTS (
        SELECT 1 FROM "Test"
        WHERE "Test"."id" = "EvidenceBundle"."testId"
        AND public.is_org_member(
          (SELECT "organizationId" FROM "Repository" WHERE "id" = "Test"."repositoryId")
        )
      )
    ) AND (
      "docId" IS NULL OR EXISTS (
        SELECT 1 FROM "Doc"
        WHERE "Doc"."id" = "EvidenceBundle"."docId"
        AND public.is_org_member(
          (SELECT "organizationId" FROM "Repository" WHERE "id" = "Doc"."repositoryId")
        )
      )
    )
  );
