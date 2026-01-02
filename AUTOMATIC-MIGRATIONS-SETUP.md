# Automatic Migrations Setup ✅

## Overview

Both migrations are now configured to **run automatically** when code is merged to `main` branch.

---

## 🔄 Migration Workflows

### 1. Policy Engine Migration
**File**: `.github/workflows/policy-engine-migration.yml`

**Triggers**:
- ✅ Push to `main` branch
- ✅ When these files change:
  - `prisma/schema.prisma`
  - `supabase/migrations/00000000000004_policy_engine.sql`
  - `.github/workflows/policy-engine-migration.yml`
- ✅ Manual trigger via `workflow_dispatch`

**What it does**:
1. Runs SQL migration: `00000000000004_policy_engine.sql`
2. Creates PolicyPack, PolicyRule, Waiver, EvidenceBundle tables
3. Sets up RLS policies
4. Verifies migration with Prisma

---

### 2. Token Encryption Migration
**File**: `.github/workflows/migrate-tokens.yml`

**Triggers**:
- ✅ Push to `main` branch
- ✅ When these files change:
  - `services/policy-engine/**`
  - `lib/crypto/**`
  - `lib/secrets/**`
  - `scripts/migrate-installation-tokens.ts`
  - `prisma/schema.prisma`
  - `.github/workflows/migrate-tokens.yml`
- ✅ Manual trigger via `workflow_dispatch` (optional confirmation)

**What it does**:
1. Checks encryption keys are configured
2. Finds all installations
3. Encrypts plaintext tokens
4. Updates `tokenEncrypted` flag
5. Skips already-encrypted tokens (idempotent)

---

## 🔒 Required Secrets

Both workflows require these GitHub repository secrets:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `READY_LAYER_KMS_KEY` OR `READY_LAYER_MASTER_KEY` OR `READY_LAYER_KEYS` - Encryption key

---

## ✅ Safety Features

### Idempotent
- Both migrations are safe to run multiple times
- Token migration skips already-encrypted tokens
- Policy migration uses `IF NOT EXISTS` patterns

### Error Handling
- Validates secrets before running
- Clear error messages
- Fails fast if prerequisites missing

### Logging
- Detailed logs for debugging
- Never logs tokens (uses redaction)
- Migration summary at end

---

## 🚀 Workflow

```
1. Developer commits code
2. PR created and reviewed
3. PR merged to main
4. GitHub Actions triggers:
   ├─ Policy Engine Migration (if schema changed)
   └─ Token Encryption Migration (if crypto files changed)
5. Migrations run automatically
6. Verify in GitHub Actions logs
```

---

## 📊 Monitoring

After merge, check:
1. **GitHub Actions** → "Policy Engine Database Migration" workflow
2. **GitHub Actions** → "Migrate Installation Tokens" workflow
3. Both should show ✅ green checkmarks
4. Review logs for any warnings

---

## 🛠️ Manual Trigger (If Needed)

If you need to run migrations manually:

1. Go to **Actions** tab
2. Select workflow:
   - "Policy Engine Database Migration" OR
   - "Migrate Installation Tokens"
3. Click **"Run workflow"**
4. Select branch (usually `main`)
5. Click **"Run workflow"**

---

## ✅ Status

**Both migrations are configured and ready to run automatically on merge to main!**

No manual intervention needed - just merge the PR and migrations will run.
