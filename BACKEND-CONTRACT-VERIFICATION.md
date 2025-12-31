# Backend Contract Verification

This document describes the backend contract validation system for ReadyLayer.

## Overview

The backend contract validation system ensures that the live Supabase database matches the expected schema, RLS policies, functions, and infrastructure required by the application.

## Components

### 1. Database Inventory Scripts

**`scripts/db-inventory-live.ts`**
- Queries live Supabase database
- Discovers: tables, columns, indexes, constraints, RLS policies, triggers, functions, extensions
- Output: JSON inventory of actual state

**`scripts/db-inventory-expected.ts`**
- Parses Prisma schema and migration files
- Builds expected contract from code
- Output: JSON inventory of expected state

### 2. Verification Scripts

**`scripts/db-verify.ts`**
- Compares live vs expected inventory
- Reports: missing tables, missing columns, missing indexes, missing policies, RLS issues
- Exit code 0 = passed, 1 = critical issues, 2 = warnings
- Generates `db-verification-report.json`

**`scripts/db-smoke.ts`**
- Runs runtime validation tests
- Tests: connectivity, table existence, RLS enforcement, function availability
- Exit code 0 = passed, 1 = failed

### 3. Canonical Migration

**`supabase/migrations/00000000000000_backend_contract_reconcile.sql`**
- Single source of truth migration bundle
- Idempotent (safe to re-run)
- Creates: tables, indexes, constraints, RLS policies, functions, triggers
- Reconciles differences between live and expected state

### 4. Healthcheck Enhancement

**`observability/health.ts`**
- Enhanced `/api/health` and `/api/ready` endpoints
- Validates backend contract at runtime
- Returns `degraded` status if non-critical issues found
- Returns `unhealthy` if critical issues (missing tables, RLS not enabled)

### 5. Database Guard

**`lib/db-guard.ts`**
- Graceful error handling for database operations
- Detects schema errors (missing tables/columns)
- Returns user-friendly error messages instead of hard-500s
- Logs diagnostic information for debugging

## Usage

### Verify Database Contract

```bash
# Compare live vs expected
npm run db:verify

# Check output
cat db-verification-report.json
```

### Reconcile Differences

```bash
# Apply canonical migration (idempotent)
npm run db:reconcile

# Or manually
psql "$DATABASE_URL" -f supabase/migrations/00000000000000_backend_contract_reconcile.sql
```

### Run Smoke Tests

```bash
# Test runtime connectivity and RLS
npm run db:smoke
```

### Inventory Database State

```bash
# Live state
npm run db:inventory-live > live-inventory.json

# Expected state
npm run db:inventory-expected > expected-inventory.json

# Compare
diff live-inventory.json expected-inventory.json
```

## CI Integration

### Deploy Workflow

The deploy workflow (`/.github/workflows/deploy.yml`) runs:
1. Prisma schema validation
2. Database contract verification (dry-run, non-blocking)
3. Build

### Migration Workflow

The migration workflow (`/.github/workflows/migrate.yml`) runs:
1. Migration execution
2. Migration verification
3. **Database contract verification** (new)
4. **Smoke tests** (new)
5. Tenant isolation tests
6. Billing enforcement tests

## Expected Backend Contract

### Tables (13 required)

1. `User` - User accounts (linked to Supabase auth)
2. `Organization` - Organizations/tenants
3. `OrganizationMember` - Organization membership (RBAC)
4. `Repository` - Git repositories
5. `Installation` - GitHub/GitLab app installations
6. `RepositoryConfig` - Repository-level configuration
7. `OrganizationConfig` - Organization-level configuration
8. `Review` - Code review results
9. `Test` - Test generation results
10. `Doc` - Documentation sync results
11. `Job` - Background job queue
12. `Violation` - Security/quality violations
13. `ApiKey` - API keys for programmatic access
14. `Subscription` - Billing subscriptions
15. `CostTracking` - LLM/API cost tracking
16. `AuditLog` - Audit trail

### RLS Policies

All tables must have RLS enabled with tenant isolation:
- Users can only access data from their organizations
- Policies use helper functions: `current_user_id()`, `is_org_member()`, `has_org_role()`

### Helper Functions

1. `current_user_id()` - Get current user ID from Supabase auth
2. `is_org_member(org_id)` - Check if user is member of organization
3. `has_org_role(org_id, role)` - Check if user has role in organization

### Extensions

1. `uuid-ossp` - UUID generation
2. `pgcrypto` - Cryptographic functions

### Triggers

1. `on_auth_user_created` - Sync auth.users to User table
2. `update_*_updated_at` - Update updatedAt timestamps

## Verification Report Format

```json
{
  "timestamp": "2024-12-30T...",
  "missingTables": ["Table1", "Table2"],
  "missingColumns": [
    { "table": "Table1", "column": "column1" }
  ],
  "missingIndexes": [
    { "table": "Table1", "index": "index1" }
  ],
  "missingPolicies": [
    { "table": "Table1", "policy": "policy1" }
  ],
  "missingFunctions": ["function1"],
  "missingExtensions": ["extension1"],
  "rlsNotEnabled": ["Table1"],
  "extraTables": ["OldTable"]
}
```

## Troubleshooting

### Missing Tables

```bash
npm run db:verify
# Check db-verification-report.json
npm run db:reconcile
```

### RLS Not Enabled

The canonical migration enables RLS. If missing:
```bash
npm run db:reconcile
```

### Schema Mismatch

1. Run verification: `npm run db:verify`
2. Check report: `cat db-verification-report.json`
3. Reconcile: `npm run db:reconcile`
4. Re-verify: `npm run db:verify`

### Healthcheck Failing

Check health endpoint:
```bash
curl http://localhost:3000/api/health | jq
curl http://localhost:3000/api/ready | jq
```

Look for `databaseSchema` check status and `details` field.

## Best Practices

1. **Always verify before deploying**: Run `npm run db:verify` in CI
2. **Use canonical migration**: Apply `supabase/migrations/00000000000000_backend_contract_reconcile.sql` for production
3. **Monitor healthcheck**: `/api/health` and `/api/ready` validate contract at runtime
4. **Graceful degradation**: App handles missing schema gracefully (no hard-500s)
5. **Idempotent migrations**: All migrations use `IF NOT EXISTS` patterns

## Related Files

- `supabase/migrations/00000000000000_backend_contract_reconcile.sql` - Canonical migration
- `scripts/db-inventory-live.ts` - Live state discovery
- `scripts/db-inventory-expected.ts` - Expected contract builder
- `scripts/db-verify.ts` - Contract verification
- `scripts/db-smoke.ts` - Runtime smoke tests
- `observability/health.ts` - Healthcheck with contract validation
- `lib/db-guard.ts` - Graceful error handling
