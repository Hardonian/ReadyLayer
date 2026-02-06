-- ============================================
-- Missing RLS Policies - Tenant Isolation Complete Coverage
-- ============================================
--
-- This migration adds RLS policies for tables that were missing coverage.
-- All tenant-scoped tables now have proper row-level security.
--
-- Generated: 2026-02-06
-- ============================================

-- ============================================
-- ReadyLayerRun Policies
-- ============================================

ALTER TABLE "ReadyLayerRun" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "readylayerrun_org_members_only" ON "ReadyLayerRun";
CREATE POLICY "readylayerrun_org_members_only"
  ON "ReadyLayerRun"
  FOR ALL
  USING (
    "repositoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "ReadyLayerRun"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- GovernanceRun Policies
-- ============================================

ALTER TABLE "GovernanceRun" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "governancerun_org_members_only" ON "GovernanceRun";
CREATE POLICY "governancerun_org_members_only"
  ON "GovernanceRun"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- PolicyPack Policies
-- ============================================

ALTER TABLE "PolicyPack" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policypack_org_members_only" ON "PolicyPack";
CREATE POLICY "policypack_org_members_only"
  ON "PolicyPack"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- Waiver Policies
-- ============================================

ALTER TABLE "Waiver" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waiver_org_members_only" ON "Waiver";
CREATE POLICY "waiver_org_members_only"
  ON "Waiver"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- TokenUsage Policies
-- ============================================

ALTER TABLE "TokenUsage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokenusage_org_members_only" ON "TokenUsage";
CREATE POLICY "tokenusage_org_members_only"
  ON "TokenUsage"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- ModelPerformance Policies
-- ============================================

ALTER TABLE "ModelPerformance" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modelperformance_org_members_only" ON "ModelPerformance";
CREATE POLICY "modelperformance_org_members_only"
  ON "ModelPerformance"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- ModelPerformanceAggregate Policies
-- ============================================

ALTER TABLE "ModelPerformanceAggregate" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modelperformanceaggregate_org_members_only" ON "ModelPerformanceAggregate";
CREATE POLICY "modelperformanceaggregate_org_members_only"
  ON "ModelPerformanceAggregate"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- AggregatedInsight Policies
-- ============================================

ALTER TABLE "AggregatedInsight" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aggregatedinsight_org_members_only" ON "AggregatedInsight";
CREATE POLICY "aggregatedinsight_org_members_only"
  ON "AggregatedInsight"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- DataRetentionPolicy Policies
-- ============================================

ALTER TABLE "DataRetentionPolicy" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dataretentionpolicy_org_members_only" ON "DataRetentionPolicy";
CREATE POLICY "dataretentionpolicy_org_members_only"
  ON "DataRetentionPolicy"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- UserConsent Policies
-- ============================================

ALTER TABLE "UserConsent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "userconsent_org_members_only" ON "UserConsent";
CREATE POLICY "userconsent_org_members_only"
  ON "UserConsent"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- AIAnomaly Policies
-- ============================================

ALTER TABLE "AIAnomaly" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aianomaly_org_members_only" ON "AIAnomaly";
CREATE POLICY "aianomaly_org_members_only"
  ON "AIAnomaly"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- AIOptimizationSuggestion Policies
-- ============================================

ALTER TABLE "AIOptimizationSuggestion" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aioptimizationsuggestion_org_members_only" ON "AIOptimizationSuggestion";
CREATE POLICY "aioptimizationsuggestion_org_members_only"
  ON "AIOptimizationSuggestion"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- PredictiveAlert Policies
-- ============================================

ALTER TABLE "PredictiveAlert" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictivealert_org_members_only" ON "PredictiveAlert";
CREATE POLICY "predictivealert_org_members_only"
  ON "PredictiveAlert"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- TrustVerification Policies
-- ============================================

ALTER TABLE "TrustVerification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trustverification_org_members_only" ON "TrustVerification";
CREATE POLICY "trustverification_org_members_only"
  ON "TrustVerification"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- ProviderConfig Policies
-- ============================================

ALTER TABLE "ProviderConfig" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providerconfig_org_members_only" ON "ProviderConfig";
CREATE POLICY "providerconfig_org_members_only"
  ON "ProviderConfig"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- MergeConfidenceCertificate Policies
-- ============================================

ALTER TABLE "MergeConfidenceCertificate" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mergeconfidencecertificate_org_members_only" ON "MergeConfidenceCertificate";
CREATE POLICY "mergeconfidencecertificate_org_members_only"
  ON "MergeConfidenceCertificate"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "MergeConfidenceCertificate"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- ReadinessScoreSnapshot Policies
-- ============================================

ALTER TABLE "ReadinessScoreSnapshot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "readinessscoresnapshot_org_members_only" ON "ReadinessScoreSnapshot";
CREATE POLICY "readinessscoresnapshot_org_members_only"
  ON "ReadinessScoreSnapshot"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Repository"
      WHERE "Repository".id = "ReadinessScoreSnapshot"."repositoryId"
      AND public.is_org_member("Repository"."organizationId")
    )
  );

-- ============================================
-- AIRiskExposureIndex Policies
-- ============================================

ALTER TABLE "AIRiskExposureIndex" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airiskexposureindex_org_members_only" ON "AIRiskExposureIndex";
CREATE POLICY "airiskexposureindex_org_members_only"
  ON "AIRiskExposureIndex"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- ReviewSignal Policies
-- ============================================

ALTER TABLE "ReviewSignal" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviewsignal_org_members_only" ON "ReviewSignal";
CREATE POLICY "reviewsignal_org_members_only"
  ON "ReviewSignal"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Review"
      WHERE "Review".id = "ReviewSignal"."reviewId"
      AND EXISTS (
        SELECT 1 FROM "Repository"
        WHERE "Repository".id = "Review"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
      )
    )
  );

-- ============================================
-- IntentArtifact Policies
-- ============================================

ALTER TABLE "IntentArtifact" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intentartifact_org_members_only" ON "IntentArtifact";
CREATE POLICY "intentartifact_org_members_only"
  ON "IntentArtifact"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "GovernanceRun"
      WHERE "GovernanceRun"."intentArtifactId" = "IntentArtifact".id
      AND public.is_org_member("GovernanceRun"."organizationId")
    )
  );

-- ============================================
-- GovernanceRunResult Policies
-- ============================================

ALTER TABLE "GovernanceRunResult" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "governancerunresult_org_members_only" ON "GovernanceRunResult";
CREATE POLICY "governancerunresult_org_members_only"
  ON "GovernanceRunResult"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "GovernanceRun"
      WHERE "GovernanceRun"."governanceRunResultId" = "GovernanceRunResult".id
      AND public.is_org_member("GovernanceRun"."organizationId")
    )
  );

-- ============================================
-- Subscription Policies (add RLS)
-- ============================================

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_org_members_only" ON "Subscription";
CREATE POLICY "subscription_org_members_only"
  ON "Subscription"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- OrganizationConfig Policies (add RLS)
-- ============================================

ALTER TABLE "OrganizationConfig" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizationconfig_org_members_only" ON "OrganizationConfig";
CREATE POLICY "organizationconfig_org_members_only"
  ON "OrganizationConfig"
  FOR ALL
  USING (public.is_org_member("organizationId"));

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify all tables have RLS enabled:
-- SELECT tablename, relrowsecurity
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
-- AND c.relkind = 'r'
-- AND tablename IN (
--   'Repository', 'Review', 'Test', 'TestRun', 'Doc', 'Violation',
--   'RepositoryConfig', 'OrganizationConfig', 'CostTracking', 'OrganizationMember',
--   'Installation', 'AuditLog', 'ApiKey', 'Job', 'ReadyLayerRun',
--   'GovernanceRun', 'PolicyPack', 'Waiver', 'TokenUsage',
--   'ModelPerformance', 'ModelPerformanceAggregate', 'AggregatedInsight',
--   'DataRetentionPolicy', 'UserConsent', 'AIAnomaly', 'AIOptimizationSuggestion',
--   'PredictiveAlert', 'TrustVerification', 'ProviderConfig',
--   'MergeConfidenceCertificate', 'ReadinessScoreSnapshot', 'AIRiskExposureIndex',
--   'ReviewSignal', 'IntentArtifact', 'GovernanceRunResult', 'Subscription',
--   'EvidenceBundle', 'OAuthState', 'OutboxIntent', 'PredictionFeedback'
-- );
