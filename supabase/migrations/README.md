# Supabase Migrations

This directory contains canonical, idempotent migration bundles for the ReadyLayer backend contract.

## Canonical Migration

**`00000000000000_backend_contract_reconcile.sql`** - The single source of truth for backend schema.

This migration:
- ✅ Creates all required tables, indexes, constraints
- ✅ Sets up RLS policies with tenant isolation
- ✅ Creates helper functions for auth and authorization
- ✅ Sets up triggers for updatedAt timestamps and auth sync
- ✅ Is **idempotent** - safe to run multiple times
- ✅ Uses `IF NOT EXISTS` patterns to prevent errors

## Usage

### Apply Migration

```bash
# Using psql directly
psql "$DATABASE_URL" -f supabase/migrations/00000000000000_backend_contract_reconcile.sql

# Or using npm script
npm run db:reconcile
```

### Verify Database Contract

```bash
# Compare live database vs expected contract
npm run db:verify

# Run smoke tests
npm run db:smoke

# Inventory live database state
npm run db:inventory-live > live-inventory.json

# Generate expected contract from schema
npm run db:inventory-expected > expected-inventory.json
```

## Migration Strategy

1. **Canonical Migration**: `supabase/migrations/00000000000000_backend_contract_reconcile.sql`
   - Single source of truth
   - Idempotent and safe to re-run
   - Contains complete schema + RLS + functions + triggers

2. **Prisma Migrations**: `backend/prisma/migrations/`
   - Used for local development
   - Can be archived after applying to production
   - Production should use canonical Supabase migration

3. **Old Migration Fragments**: Archived in repo root
   - `supabase_migration.sql` - OLD gamification schema (deprecated)
   - `supabase_migration_readylayer.sql` - Placeholder (deprecated)

## Verification

The healthcheck endpoint (`/api/health`, `/api/ready`) validates:
- Required tables exist
- RLS is enabled on critical tables
- Helper functions exist
- Extensions installed

See `observability/health.ts` for implementation.

## RLS Policies

All tables have RLS enabled with tenant isolation:
- Users can only access data from their organizations
- Policies use `current_user_id()`, `is_org_member()`, `has_org_role()` helpers
- Service role bypasses RLS (server-side only)

## Troubleshooting

### Missing Tables
```bash
npm run db:verify
# Check db-verification-report.json for details
npm run db:reconcile
```

### RLS Not Enabled
The canonical migration enables RLS on all tables. If RLS is missing:
```bash
npm run db:reconcile
```

### Schema Mismatch
Compare live vs expected:
```bash
npm run db:inventory-live > live.json
npm run db:inventory-expected > expected.json
diff live.json expected.json
```
