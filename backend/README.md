# Backend Migrations

This folder contains database migrations for the ReadyLayer backend.

## Structure

```
backend/
  prisma/
    migrations/
      20241230000000_init_readylayer/
        migration.sql
      archived/
        (completed migrations moved here)
```

## Migration Workflow

1. **Create Migration**: Add new migration files to `backend/prisma/migrations/`
2. **Run Migration**: Use GitHub Actions workflow (manual trigger only)
3. **Archive**: After successful migration, it's automatically moved to `archived/`

## Running Migrations

### Via GitHub Actions (Recommended)

1. Go to **Actions** tab → **Database Migration** workflow
2. Click **Run workflow**
3. Optionally specify:
   - `migration_file`: Specific migration to run (defaults to latest)
   - `verify_only`: Only verify, don't run
   - `archive_after`: Archive after success (default: true)
4. Click **Run workflow**

### Manual (Local)

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run specific migration
npx tsx scripts/run-migration-from-file.ts backend/prisma/migrations/20241230000000_init_readylayer/migration.sql

# Verify
npm run migrate:verify
```

## Migration Naming Convention

Use timestamp prefix: `YYYYMMDDHHMMSS_description`

Example: `20241230000000_init_readylayer`

## Archive Policy

- Migrations are automatically archived after successful execution
- Archived migrations are moved to `backend/prisma/migrations/archived/`
- Archived migrations are committed to git
- Do not manually delete archived migrations

## Important Notes

- ⚠️ Migrations do NOT run automatically on push or merge
- ⚠️ Migrations must be manually triggered via GitHub Actions
- ✅ Migrations are idempotent (safe to re-run)
- ✅ Migrations use `IF NOT EXISTS` for safety
