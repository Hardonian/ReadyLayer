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
2. **Commit & Push**: Push to main branch
3. **Automatic Execution**: GitHub Actions runs migration automatically
4. **Archive**: After successful migration, it's automatically moved to `archived/`

**No manual SQL editor or CLI needed!** All migrations execute via GitHub Actions.

## Running Migrations

### Automatic Execution (Recommended)

**Just push to main!**

1. Add migration file to `backend/prisma/migrations/YYYYMMDDHHMMSS_description/`
2. Create `migration.sql` file
3. Commit and push to main branch
4. **Workflow runs automatically** - no manual steps needed!

The workflow will:
- Detect the new migration
- Execute it via GitHub Actions (no SQL editor needed)
- Verify the migration
- Archive it automatically on success

### Manual Trigger (Optional)

You can also manually trigger if needed:

1. Go to **Actions** tab → **Database Migration** workflow
2. Click **Run workflow**
3. Optionally specify:
   - `migration_file`: Specific migration to run (defaults to latest)
   - `verify_only`: Only verify, don't run
   - `archive_after`: Archive after success (default: true)
4. Click **Run workflow**

### Manual (Local - Development Only)

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

- ✅ Migrations run **automatically** on push to main
- ✅ No manual SQL editor or CLI needed - all via GitHub Actions
- ✅ Migrations are idempotent (safe to re-run)
- ✅ Migrations use `IF NOT EXISTS` for safety
- ✅ Successful migrations are automatically archived
