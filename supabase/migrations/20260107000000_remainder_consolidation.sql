-- ============================================
-- Consolidated Remainder Migration
-- ============================================
-- 
-- Purpose:
-- 1. Create missing tables defined in Prisma but missing in previous migrations (AI, Analytics, GDPR).
-- 2. Enable RLS on all tables where it was previously omitted (TestRun, ReadyLayerRun, OutboxIntent).
-- 3. Define standard tenant-isolation policies for all new/unprotected tables.
-- 4. Idempotent execution (IF NOT EXISTS / DROP IF EXISTS).
-- 
-- Generated: 2026-01-07
-- ============================================

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

-- ============================================
-- 3. Enable RLS and Create Policies
-- ============================================

-- Function to safely create organization-scoped policy
CREATE OR REPLACE FUNCTION public.create_org_scoped_policy(table_name text)
RETURNS void
LANGUAGE plpgsql
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

-- Apply generic org-scoped policies to new tables
SELECT public.create_org_scoped_policy('AIAnomaly');
SELECT public.create_org_scoped_policy('AIOptimizationSuggestion');
SELECT public.create_org_scoped_policy('TokenUsage');
SELECT public.create_org_scoped_policy('PredictiveAlert');
SELECT public.create_org_scoped_policy('ModelPerformance');
SELECT public.create_org_scoped_policy('ModelPerformanceAggregate');
SELECT public.create_org_scoped_policy('AggregatedInsight');
SELECT public.create_org_scoped_policy('DataRetentionPolicy');
SELECT public.create_org_scoped_policy('UserConsent');

-- Specific Policies for existing tables that missed RLS

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
        ("sandboxId" IS NOT NULL) -- Allow sandbox runs to be viewed (often public demo)
    );

-- OutboxIntent
ALTER TABLE "OutboxIntent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbox_intent_system_only" ON "OutboxIntent";
CREATE POLICY "outbox_intent_system_only" ON "OutboxIntent"
    FOR SELECT USING (false); -- Only accessible by service role (workers)

-- PredictionFeedback (Public/User scoped)
ALTER TABLE "PredictionFeedback" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_submit" ON "PredictionFeedback";
CREATE POLICY "feedback_submit" ON "PredictionFeedback"
    FOR INSERT WITH CHECK (true); -- Allow feedback submission
DROP POLICY IF EXISTS "feedback_view_own" ON "PredictionFeedback";
CREATE POLICY "feedback_view_own" ON "PredictionFeedback"
    FOR SELECT USING ("userId" = public.current_user_id());

-- Drop helper function
DROP FUNCTION public.create_org_scoped_policy;

-- ============================================
-- 4. Triggers for UpdatedAt
-- ============================================

DO $$
BEGIN
    -- Apply update_updated_at_column trigger to all new tables having updatedAt
    DECLARE
        t text;
    BEGIN
        FOREACH t IN ARRAY ARRAY[
            'AIAnomaly', 'AIOptimizationSuggestion', 'TokenUsage', 'PredictiveAlert', 
            'DataRetentionPolicy', 'UserConsent'
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
