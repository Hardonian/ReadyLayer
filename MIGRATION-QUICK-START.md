# Quick Start: Migrate Installation Tokens

## Prerequisites

You need two environment variables:

1. **DATABASE_URL** - Your PostgreSQL connection string (already provided)
2. **Encryption Key** - From GitHub repository secrets

## Step 1: Set Environment Variables

### Option A: Export in Terminal (One-time)

```bash
# Database connection (you provided this)
export DATABASE_URL="postgresql://postgres.qtwpbyrdvrxfpbiajqos:[uqJrtqA0ez8aSEX0]@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# Encryption key (get from GitHub secrets)
export READY_LAYER_KMS_KEY="your-key-from-github-secrets"
# OR
export READY_LAYER_MASTER_KEY="your-key-from-github-secrets"
# OR (for key rotation)
export READY_LAYER_KEYS="v1:key1;v2:key2"
```

### Option B: Use Helper Script

```bash
# Set both variables, then run:
./scripts/run-migration-with-env.sh
```

## Step 2: Run Migration

```bash
npm run secrets:migrate-tokens
```

## Step 3: Verify

Check the logs for:
- ✅ "All installation tokens migrated successfully"
- ✅ No "Failed to encrypt" errors

## What Gets Migrated

- All plaintext `accessToken` values → Encrypted with new format
- `tokenEncrypted` flag → Set to `true`
- Already encrypted tokens → Verified and flagged

## Troubleshooting

### "No encryption keys configured"
→ Set `READY_LAYER_KMS_KEY`, `READY_LAYER_MASTER_KEY`, or `READY_LAYER_KEYS`

### "Failed to decrypt token"
→ Verify encryption key matches the one in GitHub secrets

### Connection errors
→ Verify `DATABASE_URL` is correct and database is accessible

## Security Note

⚠️ **Never commit encryption keys or connection strings to git!**

- Use GitHub secrets for production
- Use `.env` file locally (already in `.gitignore`)
- Keys are never logged by the migration script
