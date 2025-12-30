# GitHub Secrets Setup Guide

This guide shows you how to set up GitHub Secrets for ReadyLayer CI/CD and migrations.

## Required Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

### Database
```
Name: DATABASE_URL
Value: postgresql://postgres:[password]@[host]:[port]/postgres?schema=public
```
**Get from:** Supabase Dashboard → Project Settings → Database → Connection String

### Supabase
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://[your-project].supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [your-anon-key]

Name: SUPABASE_SERVICE_ROLE_KEY
Value: [your-service-role-key]
```
**Get from:** Supabase Dashboard → Project Settings → API

### LLM Providers
```
Name: OPENAI_API_KEY
Value: sk-[your-key]

# OR

Name: ANTHROPIC_API_KEY
Value: sk-ant-[your-key]

Name: DEFAULT_LLM_PROVIDER
Value: openai
```

### GitHub App (Optional)
```
Name: GITHUB_APP_ID
Value: [your-app-id]

Name: GITHUB_APP_SECRET
Value: [your-app-secret]

Name: GITHUB_WEBHOOK_SECRET
Value: [your-webhook-secret]
```

### Redis (Optional)
```
Name: REDIS_URL
Value: redis://[connection-string]
```

### Vercel (For Deployment)
```
Name: VERCEL_TOKEN
Value: [your-vercel-token]

Name: VERCEL_ORG_ID
Value: [your-org-id]

Name: VERCEL_PROJECT_ID
Value: [your-project-id]
```

## Running Migration via GitHub Actions

### Option 1: Manual Trigger

1. Go to **Actions** tab in your GitHub repository
2. Select **Database Migration** workflow
3. Click **Run workflow**
4. Choose branch (usually `main`)
5. Optionally check "Only verify migration" to skip running
6. Click **Run workflow**

### Option 2: Automatic on Push

The migration workflow runs automatically when:
- You push changes to `prisma/migrations/**` files
- You push to `main` branch with migration changes

### Option 3: Via GitHub CLI

```bash
gh workflow run migrate.yml
```

## Verifying Secrets Are Set

Create a test workflow to verify secrets (don't expose values):

```yaml
name: Verify Secrets
on: workflow_dispatch
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Check secrets
        run: |
          echo "DATABASE_URL: ${DATABASE_URL:+SET}"
          echo "SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:+SET}"
          # Don't echo actual values!
```

## Security Best Practices

1. **Never commit secrets** - Already in `.gitignore`
2. **Use repository secrets** - Not environment secrets (unless needed)
3. **Rotate regularly** - Update secrets every 90 days
4. **Limit access** - Only give secrets to trusted workflows
5. **Audit logs** - Review who accessed secrets in GitHub audit log

## Troubleshooting

### Secret Not Found
- Verify secret name matches exactly (case-sensitive)
- Check you're using the correct repository
- Ensure workflow has access to secrets

### Migration Fails
- Check DATABASE_URL format is correct
- Verify database is accessible from GitHub Actions IPs
- Review workflow logs for specific error

### Build Fails
- Ensure all required secrets are set
- Check secret values are valid (no extra spaces)
- Verify environment variable names match

## Migration Workflow

The migration workflow (`/.github/workflows/migrate.yml`) will:

1. ✅ Checkout code
2. ✅ Install dependencies
3. ✅ Generate Prisma Client
4. ✅ Run migration (if not verify-only)
5. ✅ Verify migration structure
6. ✅ Test tenant isolation
7. ✅ Test billing enforcement

## Next Steps

After setting secrets:

1. **Run migration:** Trigger the workflow manually or push migration files
2. **Verify deployment:** Check Vercel deployment succeeds
3. **Test endpoints:** Verify `/api/health` returns 200
4. **Monitor logs:** Check GitHub Actions logs for errors

---

**Need help?** Check the workflow logs in GitHub Actions for detailed error messages.
