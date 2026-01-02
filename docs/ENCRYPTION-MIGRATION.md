# Installation Token Encryption Migration Guide

This guide covers migrating all existing plaintext installation tokens to encrypted format using the new crypto module with key rotation support.

## Prerequisites

1. **Encryption keys configured** in GitHub repository secrets:
   - `READY_LAYER_KMS_KEY` (single key, base64-encoded 32 bytes)
   - OR `READY_LAYER_MASTER_KEY` (single key, base64-encoded 32 bytes)
   - OR `READY_LAYER_KEYS` (multiple keys for rotation: `"v1:key1;v2:key2"`)

2. **Database access** configured via `DATABASE_URL`

3. **Code deployed** with new crypto module (`/lib/crypto/index.ts`)

## Migration Steps

### Option 1: Automated Migration (Recommended)

Run the migration script that handles all installations:

```bash
npm run secrets:migrate-tokens
```

This script will:
- Check if encryption keys are configured
- Find all installations
- Encrypt plaintext tokens
- Update `tokenEncrypted` flag
- Skip already-encrypted tokens
- Log progress and errors

### Option 2: Legacy Script (Backward Compatible)

If you need to use the legacy script:

```bash
npm run secrets:encrypt-tokens
```

## What Gets Migrated

The migration script processes all `Installation` records:

1. **Plaintext tokens** → Encrypted with new format (JSON payload with `keyVersion`)
2. **Legacy encrypted tokens** → Re-encrypted with new format (if needed)
3. **Already encrypted** → Flag updated, token format verified

## New Encryption Format

Tokens are stored as JSON strings:

```json
{
  "ciphertext": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv",
  "tag": "base64-encoded-auth-tag",
  "keyVersion": "v1"
}
```

This format enables:
- **Key rotation** (multiple key versions)
- **Audit trail** (which key version was used)
- **Deterministic decryption** (same key version = same result)

## Verification

After migration, verify:

1. **Check migration logs** for any failures:
   ```bash
   # Review logs for "Failed to encrypt" messages
   ```

2. **Verify encryption** via health check:
   ```bash
   curl https://your-domain.com/api/ready
   # Should show: "secrets": { "configured": true, "keyVersions": ["v1"] }
   ```

3. **Test webhook processing** to ensure tokens decrypt correctly

## Rollback

If migration fails:

1. **Tokens remain unchanged** - script only updates on success
2. **Check encryption key configuration** - ensure keys are correct
3. **Review error logs** - identify which installations failed
4. **Re-run migration** - script is idempotent (safe to run multiple times)

## Key Rotation

To rotate encryption keys:

1. **Add new key version** to `READY_LAYER_KEYS`:
   ```
   READY_LAYER_KEYS="v1:old-key;v2:new-key"
   ```

2. **New tokens** will use `v2` automatically

3. **Old tokens** continue to decrypt with `v1` (backward compatible)

4. **Re-encrypt old tokens** (optional, for security):
   ```bash
   # Re-run migration to re-encrypt with new key
   npm run secrets:migrate-tokens
   ```

## Security Notes

- **Never log tokens** - All logging uses `redactSecret()` function
- **Keys in secrets** - Encryption keys should only be in GitHub secrets, never in code
- **Key rotation** - Rotate keys periodically for security best practices
- **Backup keys** - Store encryption keys securely (e.g., password manager)

## Troubleshooting

### Error: "No encryption keys configured"

**Solution**: Set one of:
- `READY_LAYER_KMS_KEY`
- `READY_LAYER_MASTER_KEY`
- `READY_LAYER_KEYS`

### Error: "Failed to decrypt token"

**Solution**: 
- Verify encryption key matches the one used to encrypt
- Check key format (should be base64-encoded 32 bytes)
- Ensure key version matches (if using `READY_LAYER_KEYS`)

### Some installations failed to encrypt

**Solution**:
- Review logs for specific installation IDs
- Check database connectivity
- Verify installation records exist
- Re-run migration (idempotent)

## Post-Migration

After successful migration:

1. ✅ All tokens encrypted with new format
2. ✅ `tokenEncrypted` flag set to `true`
3. ✅ Webhooks process successfully
4. ✅ Health check shows keys configured
5. ✅ No plaintext tokens in database

## Support

If migration fails or you encounter issues:

1. Check logs for detailed error messages
2. Verify encryption key configuration
3. Ensure database connectivity
4. Review installation records in database
