# Database Migration Instructions

This guide walks you through running the ReadyLayer database migration.

## Prerequisites

- ✅ Supabase project created
- ✅ Database URL available (set in GitHub Secrets)
- ✅ Migration SQL file ready: `backend/prisma/migrations/20241230000000_init_readylayer/migration.sql`

## Important: Automatic Execution

✅ **Migrations run automatically** when you push migration files to main branch via GitHub Actions - no manual SQL editor or CLI needed!

## Option 1: Automatic Execution via GitHub Actions (Recommended)

### Step 1: Add Migration File
1. Create migration in `backend/prisma/migrations/YYYYMMDDHHMMSS_description/`
2. Add `migration.sql` file with your SQL
3. Commit and push to main branch

### Step 2: Workflow Runs Automatically
- GitHub Actions detects the migration file change
- Workflow triggers automatically
- Migration executes via Prisma script (no SQL editor needed!)
- Verification tests run
- Migration archived automatically on success

### Step 3: Monitor Execution
- Go to **Actions** tab → **Database Migration**
- Watch workflow logs for progress
- Migration will be archived automatically on success

**No manual steps required!** Just push and the workflow handles everything.

## Option 2: Supabase SQL Editor (Manual)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Copy Migration SQL
```bash
# Copy the entire contents of:
cat backend/prisma/migrations/20241230000000_init_readylayer/migration.sql
```

### Step 3: Execute Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** (or press `Ctrl+Enter`)
3. Wait for execution to complete (may take 30-60 seconds)

### Step 4: Verify Success
You should see:
- ✅ "Success. No rows returned" (for DDL statements)
- ✅ All tables created
- ✅ RLS policies enabled
- ✅ Indexes created

### Step 5: Verify Tables
Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- `User`
- `Organization`
- `OrganizationMember`
- `Repository`
- `Installation`
- `RepositoryConfig`
- `OrganizationConfig`
- `Review`
- `Test`
- `Doc`
- `Job`
- `Violation`
- `ApiKey`
- `Subscription`
- `CostTracking`
- `AuditLog`

### Step 6: Verify RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('Organization', 'Repository', 'Review');
```

All should show `rowsecurity = true`.

## Option 3: Prisma Script (Local Development)

If you have `DATABASE_URL` set locally:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run specific migration file
npx tsx scripts/run-migration-from-file.ts backend/prisma/migrations/20241230000000_init_readylayer/migration.sql

# Verify migration
npm run migrate:verify
```

## Option 4: Direct psql Connection

If you have `psql` installed and `DATABASE_URL`:

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Run migration
psql "$DATABASE_URL" -f backend/prisma/migrations/20241230000000_init_readylayer/migration.sql
```

## Verification Scripts

After migration, run these to verify:

```bash
# Verify migration structure
npm run migrate:verify

# Test tenant isolation
npm run test:tenant-isolation

# Test billing enforcement
npm run test:billing
```

## Troubleshooting

### Error: "relation already exists"
- **Cause:** Migration already partially run
- **Fix:** The migration uses `IF NOT EXISTS`, so this is safe to ignore
- **Action:** Continue with verification steps

### Error: "permission denied"
- **Cause:** Database user lacks CREATE privileges
- **Fix:** Use Supabase SQL Editor (runs as superuser) or grant privileges:
  ```sql
  GRANT CREATE ON SCHEMA public TO [your-user];
  ```

### Error: "extension already exists"
- **Cause:** Extensions (`uuid-ossp`, `pgcrypto`) already installed
- **Fix:** Safe to ignore, migration uses `IF NOT EXISTS`

### Error: "function already exists"
- **Cause:** Helper functions already created
- **Fix:** Migration uses `CREATE OR REPLACE`, so this is safe

## Post-Migration Checklist

- [ ] All 16 tables created
- [ ] RLS enabled on all tables
- [ ] Helper functions exist (`current_user_id`, `is_org_member`, `has_org_role`)
- [ ] Indexes created (30+ indexes)
- [ ] Triggers created (10+ update triggers)
- [ ] Test tenant isolation passes
- [ ] Test billing enforcement passes

## Next Steps

After successful migration:

1. **Set Environment Variables** (see `VERCEL-ENV-SETUP.md`)
2. **Deploy to Vercel** (push to main branch or deploy manually)
3. **Test Authentication** (sign up/login flow)
4. **Test API Endpoints** (create org, repo, review)
5. **Verify Tenant Isolation** (users can't access other orgs' data)
6. **Monitor Logs** (check for errors)

## Rollback (If Needed)

If you need to rollback:

```sql
-- Drop all tables (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "CostTracking" CASCADE;
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "ApiKey" CASCADE;
DROP TABLE IF EXISTS "Violation" CASCADE;
DROP TABLE IF EXISTS "Job" CASCADE;
DROP TABLE IF EXISTS "Doc" CASCADE;
DROP TABLE IF EXISTS "Test" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "OrganizationConfig" CASCADE;
DROP TABLE IF EXISTS "RepositoryConfig" CASCADE;
DROP TABLE IF EXISTS "Installation" CASCADE;
DROP TABLE IF EXISTS "Repository" CASCADE;
DROP TABLE IF EXISTS "OrganizationMember" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.has_org_role(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_org_member(TEXT);
DROP FUNCTION IF EXISTS public.current_user_id();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

**⚠️ WARNING:** This will delete all data. Only use in development or if you have backups.
