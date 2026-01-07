# ReadyLayer System Audit Report

**Generated:** 2026-01-07
**Auditor:** Gemini 3 (AI Cloud Agent)
**Scope:** Supabase Backend & Application Execution Layer

## 1. Executive Summary

The audit identified a significant drift between the declared schema (Prisma) and the migration history. Specifically, the "AI", "Analytics", and "GDPR" modules defined in the Prisma schema were missing from the Supabase migrations. Additionally, several critical tables (`TestRun`, `ReadyLayerRun`, `OutboxIntent`) were present in migrations but lacked enabled Row Level Security (RLS) policies, creating a high-severity security risk.

A consolidated remediation migration (`20260107000000_remainder_consolidation.sql`) has been generated to:
1.  Create all missing tables idempotently.
2.  Enable RLS on all unprotected tables.
3.  Apply strict tenant-isolation policies.

## 2. Risk Assessment

| Severity | Finding | Impact | Remediation |
|----------|---------|--------|-------------|
| **CRITICAL** | Missing RLS on `TestRun`, `ReadyLayerRun`, `OutboxIntent` | Potential for cross-tenant data leakage of build logs and run artifacts. | RLS enabled and policies applied in consolidation migration. |
| **HIGH** | Missing Tables (AI/Analytics) | Application features for AI insights will fail (hard 500s) due to missing DB relations. | Tables created in consolidation migration. |
| **MEDIUM** | Duplicate Policies (Potential) | Redundant policy evaluation overhead if migrations are re-run without guards. | Consolidation migration uses `DROP IF EXISTS` and `IF NOT EXISTS` guards. |
| **LOW** | Missing Indexes on new tables | Slower performance for analytics queries. | Indexes added in consolidation migration. |

## 3. Drift Analysis

### In-Repo vs. Migration State
The following tables were defined in `prisma/schema.prisma` but missing from `supabase/migrations/*` prior to remediation:

*   `AIAnomaly`
*   `AIOptimizationSuggestion`
*   `TokenUsage`
*   `PredictiveAlert`
*   `ModelPerformance`
*   `ModelPerformanceAggregate`
*   `AggregatedInsight`
*   `DataRetentionPolicy`
*   `UserConsent`
*   `PredictionFeedback`

### Security Findings
*   **Insecure Tables:** `TestRun` (Mig 05), `ReadyLayerRun` (Mig 06), and `OutboxIntent` (Mig 07) were created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
*   **Tenant Isolation:** Base tables (`Repository`, `Organization`) were correctly secured in `00000000000003_rls_policies.sql`.

## 4. Application Layer Audit

### Middleware (`middleware.ts`)
*   **Auth Enforcement:** Correctly implements fail-closed logic for protected routes and fail-open for public routes (`/api/health`, `/api/ready`, `/api/v1/runs/sandbox`).
*   **Rate Limiting:** Implements `edgeRateLimit` for API routes (100 req/60s).
*   **Edge Safety:** Uses `getEdgeAuthUser` and avoids Node.js specific APIs in edge runtime.

### Routes
*   Tenant isolation relies on RLS. The middleware ensures a user is authenticated, but RLS is the primary guard for cross-tenant data access. The remediation of RLS policies is critical for this model to work.

## 5. Remediation Plan

1.  **Apply Migration:** Run `supabase db push` or apply `supabase/migrations/20260107000000_remainder_consolidation.sql`.
2.  **Verify:** Run the verification queries below to ensure RLS is active on all tables.
3.  **Deploy:** Push changes to `main` to trigger the new GitHub Action.

## 6. Verification Queries

Run these in Supabase SQL Editor to confirm security posture:

```sql
-- 1. Check for tables without RLS enabled
SELECT n.nspname, c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false;
-- Expected Result: 0 rows (or only system tables like _prisma_migrations)

-- 2. Verify Policy Existence for Critical Tables
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('TestRun', 'ReadyLayerRun', 'OutboxIntent', 'AIAnomaly');
-- Expected Result: Policies listed for each table.
```
