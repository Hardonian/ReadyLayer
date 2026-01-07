# Verification & Rollback Runbook

## 1. Local Verification
Run these commands to verify the migration before merging.

```bash
# 1. Start local Supabase
supabase start

# 2. Reset local DB to clean state
supabase db reset

# 3. Apply consolidated migration
# (Should happen automatically on reset, but to verify idempotent behavior:)
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/migrations/20260107000000_remainder_consolidation.sql

# 4. Verify RLS is enabled on all tables
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace 
AND relkind = 'r' 
AND relname NOT LIKE '_prisma%';"

# 5. Verify Search Path Fix
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
SELECT proname, proconfig 
FROM pg_proc 
WHERE proname IN ('current_user_id', 'is_org_member');"
# Expected: {search_path=public}
```

## 2. Production Deployment (CI)
1. Merge PR to `main`.
2. Watch `Supabase Migrate` workflow in GitHub Actions.
3. If workflow succeeds, the DB is up to date.

## 3. Rollback Plan
**Trigger:** If `Supabase Migrate` fails or application throws 500s after deploy.

### A. Migration Failed (Safe)
If the migration script failed mid-execution:
1. View CI logs to see error.
2. Fix the SQL file.
3. Push new commit.
(Since we use `IF NOT EXISTS` and idempotent patterns, re-running is safe).

### B. Migration Succeeded but App Broken (Critical)
1. **Immediate:** Revert the application code commit (if code caused it).
2. **Database:** Since we added new tables/policies, they shouldn't break existing code unless:
   - RLS is too strict for a new feature.
   - `SECURITY DEFINER` change broke a function.
3. **Rollback SQL:**
   Create a reversion script `rollback_20260107.sql`:
   ```sql
   -- CAUTION: Drops data in new tables
   DROP TABLE IF EXISTS "AIAnomaly", "TokenUsage" CASCADE;
   -- Revert function security (if needed)
   ALTER FUNCTION public.current_user_id() RESET search_path;
   ```
   Run via Supabase Dashboard SQL Editor or CLI.
