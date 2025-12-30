# PR Merge Checklist - Migration Setup

## ✅ Pre-Merge Verification

Before merging this PR, verify:

- [x] Migration file exists: `backend/prisma/migrations/20241230000000_init_readylayer/migration.sql`
- [x] Workflow file exists: `.github/workflows/migrate.yml`
- [x] Workflow configured to trigger on push to main
- [x] Workflow path matches: `backend/prisma/migrations/**`
- [x] Migration script exists: `scripts/run-migration-from-file.ts`

## 🚀 What Happens When PR Merges

### Automatic Execution Flow

1. **PR Merges to Main**
   - Migration file: `backend/prisma/migrations/20241230000000_init_readylayer/`
   - Workflow file: `.github/workflows/migrate.yml`

2. **GitHub Actions Detects Change**
   - Workflow triggers automatically (on push to main)
   - Path matches: `backend/prisma/migrations/**`

3. **Migration Executes**
   - Finds latest non-archived migration: `20241230000000_init_readylayer`
   - Executes SQL via `scripts/run-migration-from-file.ts`
   - Runs against backend database (from `DATABASE_URL` secret)

4. **Verification Runs**
   - Verifies tables created
   - Verifies RLS policies enabled
   - Tests tenant isolation
   - Tests billing enforcement

5. **Auto-Archive**
   - Moves migration to `backend/prisma/migrations/archived/`
   - Commits archived migration to git
   - Pushes back to main branch

## 📋 Required GitHub Secrets

Ensure these secrets are set in GitHub:

- [ ] `DATABASE_URL` - Backend database connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider key

**Location:** GitHub → Settings → Secrets and variables → Actions

## 🔍 Post-Merge Monitoring

After merging, monitor:

1. **GitHub Actions**
   - Go to **Actions** tab
   - Find **Database Migration** workflow run
   - Check execution logs

2. **Expected Output**
   ```
   ✅ Running migration: 20241230000000_init_readylayer
   ✅ Migration execution complete
   ✅ Found 16 core tables
   ✅ RLS enabled on core tables
   ✅ Migration archived
   ```

3. **Verify Archive**
   - Check `backend/prisma/migrations/archived/20241230000000_init_readylayer/`
   - Verify git commit created

## ⚠️ Troubleshooting

### Migration Doesn't Run

**Check:**
- Workflow file path: `.github/workflows/migrate.yml`
- Migration file path: `backend/prisma/migrations/20241230000000_init_readylayer/migration.sql`
- GitHub Secrets are set
- Workflow has permissions to write to repository

### Migration Fails

**Check:**
- `DATABASE_URL` secret is correct
- Database is accessible from GitHub Actions IPs
- SQL syntax is valid
- Database user has CREATE privileges

### Archive Fails

**Check:**
- Workflow has write permissions
- Branch protection rules allow workflow commits
- Git config is correct

## ✅ Success Criteria

After merge, verify:

- [ ] Workflow runs automatically
- [ ] Migration executes successfully
- [ ] All 16 tables created
- [ ] RLS policies enabled
- [ ] Migration archived
- [ ] Git commit created for archived migration

---

**Ready to merge!** The migration will run automatically when this PR is merged to main.
