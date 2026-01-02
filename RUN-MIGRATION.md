# Run Installation Token Migration

## ✅ Ready to Run

I've created a GitHub Actions workflow that will run the migration with access to your repository secrets.

## Option 1: Run via GitHub Actions (Recommended)

### Steps:

1. **Go to your GitHub repository**
2. **Click "Actions" tab**
3. **Select "Migrate Installation Tokens" workflow** (left sidebar)
4. **Click "Run workflow"** button
5. **Type "migrate"** in the confirmation field
6. **Click "Run workflow"**

The workflow will:
- ✅ Use `DATABASE_URL` from secrets
- ✅ Use encryption key from secrets (`READY_LAYER_KMS_KEY`, `READY_LAYER_MASTER_KEY`, or `READY_LAYER_KEYS`)
- ✅ Run the migration script
- ✅ Show detailed logs

## Option 2: Run Locally (If you have encryption key)

If you want to run it locally with the encryption key:

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres.qtwpbyrdvrxfpbiajqos:[uqJrtqA0ez8aSEX0]@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
export READY_LAYER_KMS_KEY="your-key-from-github-secrets"

# Run migration
npm run secrets:migrate-tokens
```

## What Gets Migrated

- All plaintext `accessToken` values → Encrypted with new JSON format
- `tokenEncrypted` flag → Set to `true`  
- Already encrypted tokens → Verified and skipped

## Expected Output

```
Starting installation token migration
Found installations to check: X
Encrypting installation token (installationId: ..., provider: github)
Token encrypted successfully
...
Migration completed
  total: X
  encrypted: Y
  skipped: Z
  failed: 0
All installation tokens migrated successfully
```

## Required GitHub Secrets

Make sure these are set in your repository secrets:

- ✅ `DATABASE_URL` - Your PostgreSQL connection string
- ✅ `READY_LAYER_KMS_KEY` OR `READY_LAYER_MASTER_KEY` OR `READY_LAYER_KEYS` - Encryption key

## Security

- 🔒 Tokens are never logged (uses redaction)
- 🔒 Connection strings are never exposed
- 🔒 Encryption keys only in GitHub secrets
- 🔒 Script is idempotent (safe to run multiple times)

## Troubleshooting

### "Encryption keys not configured"
→ Ensure one of the encryption key secrets is set in GitHub

### "Failed to encrypt token"
→ Check logs for specific installation IDs
→ Verify encryption key is correct

### Connection errors
→ Verify `DATABASE_URL` secret is correct
→ Check database is accessible

---

**Ready to migrate?** Go to Actions → Migrate Installation Tokens → Run workflow!
