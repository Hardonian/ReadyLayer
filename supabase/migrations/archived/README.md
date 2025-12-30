# Archived Migrations

This directory contains deprecated migration files that have been superseded by the canonical migration.

## Archived Files

- `supabase_migration.sql` - OLD gamification schema (UserProfile, Badge, Achievement, etc.)
  - **Status**: Deprecated
  - **Reason**: Replaced by ReadyLayer platform schema
  - **Replaced by**: `supabase/migrations/00000000000000_backend_contract_reconcile.sql`

- `supabase_migration_readylayer.sql` - Placeholder file
  - **Status**: Deprecated
  - **Reason**: Was just a placeholder pointing to Prisma migration
  - **Replaced by**: `supabase/migrations/00000000000000_backend_contract_reconcile.sql`

## Current Migration

Use **`supabase/migrations/00000000000000_backend_contract_reconcile.sql`** as the single source of truth.

Do not use archived migrations for new deployments.
