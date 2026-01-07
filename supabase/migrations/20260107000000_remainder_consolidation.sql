-- ============================================
-- Consolidated Remainder Migration
-- ============================================
-- 
-- Purpose:
-- 1. Create missing tables defined in Prisma but missing in previous migrations.
-- 2. Enable RLS on all tables where it was previously omitted.
-- 3. Define standard tenant-isolation policies.
-- 4. HARDEN SECURITY DEFINER functions (Fix search_path).
-- 5. Idempotent execution.
-- 
-- Generated: 2026-01-07
-- ============================================

-- ============================================
-- 0. HARDENING: Fix Mutable Search Path
-- ============================================
-- Security Definer functions must have fixed search_path to prevent hijacking

ALTER FUNCTION public.current_user_id() SET search_path = public;
ALTER FUNCTION public.is_org_member(text) SET search_path = public;
ALTER FUNCTION public.has_org_role(text, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- ============================================
-- 1. Create Missing Tables (AI, Analytics, GDPR)
-- ============================================

-- AI Anomaly
CREATE TABLE IF NOT EXISTS "AIAnomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "file" TEXT,
    "line" INTEGER,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIAnomaly_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIAnomaly_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AI Optimization Suggestion
CREATE TABLE IF NOT EXISTS "AIOptimizationSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "effort" TEXT NOT NULL,
    "stack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "llmAccess" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "codeExample" TEXT,
    "steps" JSONB NOT NULL,
    "estimatedSavings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIOptimizationSuggestion_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIOptimizationSuggestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Token Usage
CREATE TABLE IF NOT EXISTS "TokenUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT,
    "service" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" DECIMAL(10, 4) NOT NULL,
    "contextSize" INTEGER,
    "wastePercentage" DECIMAL(5, 2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenUsage_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TokenUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TokenUsage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Predictive Alert
CREATE TABLE IF NOT EXISTS "PredictiveAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DECIMAL(5, 4) NOT NULL,
    "trustLevel" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "estimatedLikelihood" DECIMAL(5, 4) NOT NULL,
    "historicalAccuracy" DECIMAL(5, 4),
    "dataPoints" INTEGER NOT NULL,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "wasCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictiveAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PredictiveAlert_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Model Performance
CREATE TABLE IF NOT EXISTS "ModelPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "cost" DECIMAL(10, 4) NOT NULL,
    "predictionId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelPerformance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Model Performance Aggregate
CREATE TABLE IF NOT EXISTS "ModelPerformanceAggregate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "totalRequests" INTEGER NOT NULL,
    "successfulRequests" INTEGER NOT NULL,
    "failedRequests" INTEGER NOT NULL,
    "averageResponseTime" DECIMAL(10, 2) NOT NULL,
    "averageTokensUsed" INTEGER NOT NULL,
    "averageCost" DECIMAL(10, 4) NOT NULL,
    "accuracyScore" DECIMAL(5, 4) NOT NULL,
    "confidenceScore" DECIMAL(5, 4) NOT NULL,
    "trustScore" DECIMAL(5, 4) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelPerformanceAggregate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelPerformanceAggregate_organizationId_modelId_provider_key" UNIQUE ("organizationId", "modelId", "provider")
);

-- Aggregated Insight
CREATE TABLE IF NOT EXISTS "AggregatedInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "confidence" DECIMAL(5, 4) NOT NULL,
    "trustLevel" DECIMAL(5, 4) NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "trend" TEXT NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "AggregatedInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data Retention Policy
CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL UNIQUE,
    "gdprEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "requireConsent" BOOLEAN NOT NULL DEFAULT true,
    "anonymizePII" BOOLEAN NOT NULL DEFAULT true,
    "allowAggregation" BOOLEAN NOT NULL DEFAULT true,
    "aggregationWindow" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataRetentionPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- User Consent
CREATE TABLE IF NOT EXISTS "UserConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserConsent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserConsent_organizationId_userId_consentType_key" UNIQUE ("organizationId", "userId", "consentType")
);

-- Prediction Feedback
CREATE TABLE IF NOT EXISTS "PredictionFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "predictionId" TEXT NOT NULL,
    "wasCorrect" BOOLEAN NOT NULL,
    "actualOutcome" JSONB,
    "feedbackType" TEXT NOT NULL,
    "confidenceAtPrediction" DECIMAL(5, 4) NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TestRun
CREATE TABLE IF NOT EXISTS "TestRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestRun_repositoryId_prSha_workflowRunId_key" UNIQUE ("repositoryId", "prSha", "workflowRunId")
);

-- ReadyLayerRun
CREATE TABLE IF NOT EXISTS "ReadyLayerRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "correlationId" TEXT NOT NULL UNIQUE,
  "repositoryId" TEXT,
  "sandboxId" TEXT UNIQUE,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewId" TEXT UNIQUE,
  CONSTRAINT "ReadyLayerRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReadyLayerRun_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- OutboxIntent
CREATE TABLE IF NOT EXISTS "OutboxIntent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- EvidenceBundle
CREATE TABLE IF NOT EXISTS "EvidenceBundle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reviewId" TEXT UNIQUE,
  "testId" TEXT UNIQUE,
  "docId" TEXT UNIQUE,
  "inputsMetadata" JSONB NOT NULL,
  "rulesFired" JSONB NOT NULL,
  "deterministicScore" DECIMAL(10, 4) NOT NULL,
  "artifacts" JSONB,
  "policyChecksum" TEXT NOT NULL,
  "toolVersions" JSONB,
  "timings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceBundle_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EvidenceBundle_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EvidenceBundle_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PolicyPack
CREATE TABLE IF NOT EXISTS "PolicyPack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "version" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyPack_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PolicyPack_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PolicyPack_organizationId_repositoryId_version_key" UNIQUE ("organizationId", "repositoryId", "version")
);

-- PolicyRule
CREATE TABLE IF NOT EXISTS "PolicyRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "policyPackId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "severityMapping" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "params" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyRule_policyPackId_fkey" FOREIGN KEY ("policyPackId") REFERENCES "PolicyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PolicyRule_policyPackId_ruleId_key" UNIQUE ("policyPackId", "ruleId")
);

-- Waiver
CREATE TABLE IF NOT EXISTS "Waiver" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "repositoryId" TEXT,
  "ruleId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scopeValue" TEXT,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Waiver_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Waiver_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 2. Create Indexes (Idempotent)
-- ============================================

-- AI Anomaly
CREATE INDEX IF NOT EXISTS "AIAnomaly_repositoryId_idx" ON "AIAnomaly"("repositoryId");
CREATE INDEX IF NOT EXISTS "AIAnomaly_organizationId_idx" ON "AIAnomaly"("organizationId");
CREATE INDEX IF NOT EXISTS "AIAnomaly_type_idx" ON "AIAnomaly"("type");
CREATE INDEX IF NOT EXISTS "AIAnomaly_severity_idx" ON "AIAnomaly"("severity");
CREATE INDEX IF NOT EXISTS "AIAnomaly_detectedAt_idx" ON "AIAnomaly"("detectedAt");

-- AI Optimization Suggestion
CREATE INDEX IF NOT EXISTS "AIOptimizationSuggestion_repositoryId_idx" ON "AIOptimizationSuggestion"("repositoryId");
CREATE INDEX IF NOT EXISTS "AIOptimizationSuggestion_organizationId_idx" ON "AIOptimizationSuggestion"("organizationId");
CREATE INDEX IF NOT EXISTS "AIOptimizationSuggestion_type_idx" ON "AIOptimizationSuggestion"("type");
CREATE INDEX IF NOT EXISTS "AIOptimizationSuggestion_difficulty_idx" ON "AIOptimizationSuggestion"("difficulty");
CREATE INDEX IF NOT EXISTS "AIOptimizationSuggestion_status_idx" ON "AIOptimizationSuggestion"("status");

-- Token Usage
CREATE INDEX IF NOT EXISTS "TokenUsage_repositoryId_idx" ON "TokenUsage"("repositoryId");
CREATE INDEX IF NOT EXISTS "TokenUsage_organizationId_idx" ON "TokenUsage"("organizationId");
CREATE INDEX IF NOT EXISTS "TokenUsage_reviewId_idx" ON "TokenUsage"("reviewId");
CREATE INDEX IF NOT EXISTS "TokenUsage_service_idx" ON "TokenUsage"("service");
CREATE INDEX IF NOT EXISTS "TokenUsage_createdAt_idx" ON "TokenUsage"("createdAt");

-- Predictive Alert
CREATE INDEX IF NOT EXISTS "PredictiveAlert_organizationId_idx" ON "PredictiveAlert"("organizationId");
CREATE INDEX IF NOT EXISTS "PredictiveAlert_repositoryId_idx" ON "PredictiveAlert"("repositoryId");
CREATE INDEX IF NOT EXISTS "PredictiveAlert_alertType_idx" ON "PredictiveAlert"("alertType");
CREATE INDEX IF NOT EXISTS "PredictiveAlert_severity_idx" ON "PredictiveAlert"("severity");
CREATE INDEX IF NOT EXISTS "PredictiveAlert_confidence_idx" ON "PredictiveAlert"("confidence");
CREATE INDEX IF NOT EXISTS "PredictiveAlert_trustLevel_idx" ON "PredictiveAlert"("trustLevel");

-- Model Performance
CREATE INDEX IF NOT EXISTS "ModelPerformance_organizationId_idx" ON "ModelPerformance"("organizationId");
CREATE INDEX IF NOT EXISTS "ModelPerformance_modelId_idx" ON "ModelPerformance"("modelId");
CREATE INDEX IF NOT EXISTS "ModelPerformance_provider_idx" ON "ModelPerformance"("provider");
CREATE INDEX IF NOT EXISTS "ModelPerformance_timestamp_idx" ON "ModelPerformance"("timestamp");

-- Model Performance Aggregate
CREATE INDEX IF NOT EXISTS "ModelPerformanceAggregate_organizationId_idx" ON "ModelPerformanceAggregate"("organizationId");
CREATE INDEX IF NOT EXISTS "ModelPerformanceAggregate_modelId_idx" ON "ModelPerformanceAggregate"("modelId");
CREATE INDEX IF NOT EXISTS "ModelPerformanceAggregate_provider_idx" ON "ModelPerformanceAggregate"("provider");

-- Aggregated Insight
CREATE INDEX IF NOT EXISTS "AggregatedInsight_organizationId_idx" ON "AggregatedInsight"("organizationId");
CREATE INDEX IF NOT EXISTS "AggregatedInsight_insightType_idx" ON "AggregatedInsight"("insightType");
CREATE INDEX IF NOT EXISTS "AggregatedInsight_confidence_idx" ON "AggregatedInsight"("confidence");

-- Data Retention Policy
CREATE INDEX IF NOT EXISTS "DataRetentionPolicy_organizationId_idx" ON "DataRetentionPolicy"("organizationId");

-- User Consent
CREATE INDEX IF NOT EXISTS "UserConsent_organizationId_idx" ON "UserConsent"("organizationId");
CREATE INDEX IF NOT EXISTS "UserConsent_userId_idx" ON "UserConsent"("userId");
CREATE INDEX IF NOT EXISTS "UserConsent_consentType_idx" ON "UserConsent"("consentType");
CREATE INDEX IF NOT EXISTS "UserConsent_granted_idx" ON "UserConsent"("granted");

-- Prediction Feedback
CREATE INDEX IF NOT EXISTS "PredictionFeedback_predictionId_idx" ON "PredictionFeedback"("predictionId");
CREATE INDEX IF NOT EXISTS "PredictionFeedback_userId_idx" ON "PredictionFeedback"("userId");
CREATE INDEX IF NOT EXISTS "PredictionFeedback_timestamp_idx" ON "PredictionFeedback"("timestamp");
CREATE INDEX IF NOT EXISTS "PredictionFeedback_wasCorrect_idx" ON "PredictionFeedback"("wasCorrect");

-- TestRun
CREATE INDEX IF NOT EXISTS "TestRun_repositoryId_idx" ON "TestRun"("repositoryId");
CREATE INDEX IF NOT EXISTS "TestRun_prNumber_idx" ON "TestRun"("prNumber");
CREATE INDEX IF NOT EXISTS "TestRun_prSha_idx" ON "TestRun"("prSha");
CREATE INDEX IF NOT EXISTS "TestRun_workflowRunId_idx" ON "TestRun"("workflowRunId");
CREATE INDEX IF NOT EXISTS "TestRun_status_idx" ON "TestRun"("status");

-- ReadyLayerRun
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_correlationId_idx" ON "ReadyLayerRun"("correlationId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_repositoryId_idx" ON "ReadyLayerRun"("repositoryId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_sandboxId_idx" ON "ReadyLayerRun"("sandboxId");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_status_idx" ON "ReadyLayerRun"("status");
CREATE INDEX IF NOT EXISTS "ReadyLayerRun_trigger_idx" ON "ReadyLayerRun"("trigger");

-- OutboxIntent
CREATE INDEX IF NOT EXISTS "OutboxIntent_runId_idx" ON "OutboxIntent"("runId");
CREATE INDEX IF NOT EXISTS "OutboxIntent_repositoryId_idx" ON "OutboxIntent"("repositoryId");
CREATE INDEX IF NOT EXISTS "OutboxIntent_status_idx" ON "OutboxIntent"("status");
CREATE INDEX IF NOT EXISTS "OutboxIntent_idempotencyKey_idx" ON "OutboxIntent"("idempotencyKey");

-- PolicyPack
CREATE INDEX IF NOT EXISTS "PolicyPack_organizationId_idx" ON "PolicyPack"("organizationId");
CREATE INDEX IF NOT EXISTS "PolicyPack_repositoryId_idx" ON "PolicyPack"("repositoryId");
CREATE INDEX IF NOT EXISTS "PolicyPack_checksum_idx" ON "PolicyPack"("checksum");

-- Waiver
CREATE INDEX IF NOT EXISTS "Waiver_organizationId_idx" ON "Waiver"("organizationId");
CREATE INDEX IF NOT EXISTS "Waiver_repositoryId_idx" ON "Waiver"("repositoryId");
CREATE INDEX IF NOT EXISTS "Waiver_ruleId_idx" ON "Waiver"("ruleId");
CREATE INDEX IF NOT EXISTS "Waiver_expiresAt_idx" ON "Waiver"("expiresAt");

-- EvidenceBundle
CREATE INDEX IF NOT EXISTS "EvidenceBundle_reviewId_idx" ON "EvidenceBundle"("reviewId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_testId_idx" ON "EvidenceBundle"("testId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_docId_idx" ON "EvidenceBundle"("docId");
CREATE INDEX IF NOT EXISTS "EvidenceBundle_policyChecksum_idx" ON "EvidenceBundle"("policyChecksum");

-- ============================================
-- 3. Enable RLS and Create Policies
-- ============================================

-- Function to safely create organization-scoped policy
CREATE OR REPLACE FUNCTION public.create_org_scoped_policy(table_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop existing policy to update it (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_members_only" ON %I', table_name, table_name);
    
    -- Create policy
    EXECUTE format('
        CREATE POLICY "%s_org_members_only" ON %I
        FOR ALL
        USING (public.is_org_member("organizationId"))
    ', table_name, table_name);
END;
$$;

-- Apply generic org-scoped policies
SELECT public.create_org_scoped_policy('AIAnomaly');
SELECT public.create_org_scoped_policy('AIOptimizationSuggestion');
SELECT public.create_org_scoped_policy('TokenUsage');
SELECT public.create_org_scoped_policy('PredictiveAlert');
SELECT public.create_org_scoped_policy('ModelPerformance');
SELECT public.create_org_scoped_policy('ModelPerformanceAggregate');
SELECT public.create_org_scoped_policy('AggregatedInsight');
SELECT public.create_org_scoped_policy('DataRetentionPolicy');
SELECT public.create_org_scoped_policy('UserConsent');
SELECT public.create_org_scoped_policy('PolicyPack');
SELECT public.create_org_scoped_policy('Waiver');

-- Specific Policies

-- TestRun
ALTER TABLE "TestRun" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "test_run_repo_access" ON "TestRun";
CREATE POLICY "test_run_repo_access" ON "TestRun"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "Repository"
            WHERE "Repository".id = "TestRun"."repositoryId"
            AND public.is_org_member("Repository"."organizationId")
        )
    );

-- ReadyLayerRun
ALTER TABLE "ReadyLayerRun" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "readylayer_run_repo_access" ON "ReadyLayerRun";
CREATE POLICY "readylayer_run_repo_access" ON "ReadyLayerRun"
    FOR ALL USING (
        ("repositoryId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Repository"
            WHERE "Repository".id = "ReadyLayerRun"."repositoryId"
            AND public.is_org_member("Repository"."organizationId")
        ))
        OR
        ("sandboxId" IS NOT NULL)
    );

-- OutboxIntent
ALTER TABLE "OutboxIntent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbox_intent_system_only" ON "OutboxIntent";
CREATE POLICY "outbox_intent_system_only" ON "OutboxIntent"
    FOR SELECT USING (false); -- Service role only

-- PredictionFeedback
ALTER TABLE "PredictionFeedback" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_submit" ON "PredictionFeedback";
CREATE POLICY "feedback_submit" ON "PredictionFeedback"
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "feedback_view_own" ON "PredictionFeedback";
CREATE POLICY "feedback_view_own" ON "PredictionFeedback"
    FOR SELECT USING ("userId" = public.current_user_id());

-- EvidenceBundle
ALTER TABLE "EvidenceBundle" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_bundle_access" ON "EvidenceBundle";
CREATE POLICY "evidence_bundle_access" ON "EvidenceBundle"
    FOR SELECT USING (
        ("reviewId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Review" R JOIN "Repository" Rep ON R."repositoryId" = Rep.id
            WHERE R.id = "EvidenceBundle"."reviewId" AND public.is_org_member(Rep."organizationId")
        )) OR
        ("testId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Test" T JOIN "Repository" Rep ON T."repositoryId" = Rep.id
            WHERE T.id = "EvidenceBundle"."testId" AND public.is_org_member(Rep."organizationId")
        )) OR
        ("docId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Doc" D JOIN "Repository" Rep ON D."repositoryId" = Rep.id
            WHERE D.id = "EvidenceBundle"."docId" AND public.is_org_member(Rep."organizationId")
        ))
    );

-- PolicyRule
ALTER TABLE "PolicyRule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_rule_access" ON "PolicyRule";
CREATE POLICY "policy_rule_access" ON "PolicyRule"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "PolicyPack" P
            WHERE P.id = "PolicyRule"."policyPackId"
            AND public.is_org_member(P."organizationId")
        )
    );

-- Drop helper
DROP FUNCTION public.create_org_scoped_policy;

-- ============================================
-- 4. Triggers for UpdatedAt
-- ============================================

DO $$
BEGIN
    DECLARE
        t text;
    BEGIN
        FOREACH t IN ARRAY ARRAY[
            'AIAnomaly', 'AIOptimizationSuggestion', 'TokenUsage', 'PredictiveAlert', 
            'DataRetentionPolicy', 'UserConsent', 'TestRun', 'ReadyLayerRun', 
            'OutboxIntent', 'PolicyPack', 'PolicyRule', 'Waiver'
        ] LOOP
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_' || lower(t) || '_updated_at') THEN
                EXECUTE format('
                    CREATE TRIGGER update_%s_updated_at 
                    BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
                ', lower(t), t);
            END IF;
        END LOOP;
    END;
END $$;
