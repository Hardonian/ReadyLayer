# Backend Migrations - Summary

## ✅ Changes Completed

### 1. Migration Structure
- ✅ Migrations located in `backend/prisma/migrations/`
- ✅ Archived migrations folder: `backend/prisma/migrations/archived/`
- ✅ Root `prisma/migrations/` ignored in `.gitignore`

### 2. GitHub Actions Workflow
- ✅ **Automatic execution** on push to main when migrations change
- ✅ **Manual trigger** also available via `workflow_dispatch`
- ✅ Executes migrations via GitHub Actions (no manual SQL editor/CLI needed)
- ✅ Auto-archives successful migrations
- ✅ Commits archived migrations to git

### 3. Migration Execution
- ✅ Runs automatically when migration files are pushed to main
- ✅ Executes SQL via Prisma script (no Supabase SQL editor needed)
- ✅ Runs against backend database (from `DATABASE_URL` secret)
- ✅ Supports running specific migrations or latest
- ✅ Automatically moves completed migrations to `archived/`

### 4. Migration Scripts
- ✅ `scripts/run-migration-from-file.ts` - Executes migration SQL files
- ✅ Verification scripts work with backend folder structure

### 5. Documentation Updates
- ✅ Updated `MIGRATION-INSTRUCTIONS.md` - Automatic execution via GitHub Actions
- ✅ Updated `GITHUB-SECRETS-SETUP.md` - Automatic trigger info
- ✅ Updated `QUICK-START.md` - Backend folder paths
- ✅ Created `backend/README.md` - Backend migration guide
- ✅ Created `backend/prisma/migrations/archived/README.md` - Archive policy

## 📁 Folder Structure

```
backend/
  prisma/
    migrations/
      20241230000000_init_readylayer/
        migration.sql
      archived/
        (completed migrations moved here automatically)
```

## 🚀 How It Works

### Automatic Execution (Recommended)

1. **Add Migration File**
   - Create migration in `backend/prisma/migrations/YYYYMMDDHHMMSS_description/`
   - Add `migration.sql` file
   - Commit and push to main branch

2. **Workflow Triggers Automatically**
   - GitHub Actions detects migration file change
   - Workflow runs automatically
   - Migration executes against backend database
   - No manual SQL editor or CLI needed!

3. **Auto-Archive on Success**
   - Migration moved to `backend/prisma/migrations/archived/`
   - Git commit created automatically
   - Changes pushed back to main branch

### Manual Execution (Optional)

You can also manually trigger:

1. Go to **Actions** → **Database Migration**
2. Click **Run workflow**
3. Configure options:
   - `migration_file`: Specific migration (or leave empty for latest)
   - `verify_only`: Only verify, don't run
   - `archive_after`: Archive after success (default: true)
4. Click **Run workflow**

## ⚙️ Workflow Configuration

The workflow (`/.github/workflows/migrate.yml`) triggers:

**Automatic:**
- On push to `main` branch
- When files in `backend/prisma/migrations/**` change
- When workflow file itself changes

**Manual:**
- Via `workflow_dispatch` (Actions → Run workflow)

## 🔄 Migration Flow

```
1. Developer adds migration file
   ↓
2. Commit & push to main
   ↓
3. GitHub Actions detects change
   ↓
4. Workflow runs automatically
   ↓
5. Migration executes via Prisma script
   ↓
6. Verification tests run
   ↓
7. Migration archived automatically
   ↓
8. Git commit created & pushed
```

## ⚠️ Important Notes

- ✅ **Automatic Execution**: Migrations run automatically on push to main
- ✅ **No Manual SQL Editor**: All migrations execute via GitHub Actions
- ✅ **No CLI Required**: Everything happens in CI/CD pipeline
- ✅ **Backend Database**: Migrations run against backend database (from `DATABASE_URL` secret)
- ✅ **Auto-Archive**: Successful migrations automatically archived
- ✅ **Git Tracking**: Archived migrations committed to git for history

## 📋 Migration Naming Convention

Use timestamp prefix: `YYYYMMDDHHMMSS_description`

Examples:
- `20241230000000_init_readylayer`
- `20241230120000_add_user_preferences`
- `20250101150000_add_audit_logging`

## ✅ Verification

After migration:
- ✅ Tables created
- ✅ RLS policies enabled
- ✅ Indexes created
- ✅ Tenant isolation tested
- ✅ Billing enforcement tested
- ✅ Migration archived

## 🎯 Usage Examples

### Adding a New Migration

```bash
# 1. Create migration folder
mkdir -p backend/prisma/migrations/20250101120000_add_new_feature

# 2. Create migration.sql file
cat > backend/prisma/migrations/20250101120000_add_new_feature/migration.sql << 'EOF'
-- Your SQL migration here
CREATE TABLE IF NOT EXISTS "NewTable" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);
EOF

# 3. Commit and push
git add backend/prisma/migrations/
git commit -m "feat: add new feature migration"
git push origin main

# 4. Workflow runs automatically!
# 5. Migration executes via GitHub Actions
# 6. Auto-archived on success
```

### Manual Trigger (if needed)

```bash
# Via GitHub CLI
gh workflow run migrate.yml

# Or via GitHub UI
# Actions → Database Migration → Run workflow
```

## 🔧 Troubleshooting

### Migration Doesn't Run Automatically

**Check:**
- Migration file is in `backend/prisma/migrations/`
- File is committed and pushed to `main` branch
- Workflow file path matches: `backend/prisma/migrations/**`

### Migration Fails

**Check:**
- `DATABASE_URL` secret is set correctly
- SQL syntax is valid
- Database connection is accessible from GitHub Actions IPs

### Archive Fails

**Check:**
- Git permissions for workflow
- Branch protection rules
- Workflow has write permissions

## 📚 Related Documentation

- **Migration Guide**: `MIGRATION-INSTRUCTIONS.md`
- **GitHub Secrets**: `GITHUB-SECRETS-SETUP.md`
- **Quick Start**: `QUICK-START.md`
- **Backend README**: `backend/README.md`

---

**✅ Migrations now run automatically via GitHub Actions - no manual SQL editor or CLI needed!**
