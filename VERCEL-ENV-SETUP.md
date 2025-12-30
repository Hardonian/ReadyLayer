# Vercel Environment Variables Setup

This guide provides the exact environment variables needed for ReadyLayer deployment on Vercel.

## Required Environment Variables

Copy these into your Vercel project settings (Settings → Environment Variables):

### Database
```bash
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

**Important:** This should be your Supabase PostgreSQL connection string. Get it from:
- Supabase Dashboard → Project Settings → Database → Connection String
- Use the "Connection pooling" URL for better performance

### Supabase Authentication
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**Where to find:**
- Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY`: `service_role` `secret` key (keep this secure!)

### Redis (Queue System)
```bash
REDIS_URL=redis://[user]:[password]@[host]:[port]
```

**Options:**
- Upstash Redis (recommended for Vercel): https://upstash.com/
- Redis Cloud: https://redis.com/cloud/
- Or use database fallback (if REDIS_URL not set, queue falls back to database)

### LLM Providers (at least one required)
```bash
OPENAI_API_KEY=sk-[your-key]
# OR
ANTHROPIC_API_KEY=sk-ant-[your-key]
DEFAULT_LLM_PROVIDER=openai  # or "anthropic"
```

### GitHub App Integration
```bash
GITHUB_APP_ID=[your-app-id]
GITHUB_APP_SECRET=[your-app-secret]
GITHUB_WEBHOOK_SECRET=[your-webhook-secret]
```

**Where to find:**
- GitHub → Settings → Developer settings → GitHub Apps → Your App
- `GITHUB_APP_ID`: App ID (visible in app settings)
- `GITHUB_APP_SECRET`: Generate new client secret
- `GITHUB_WEBHOOK_SECRET`: Set in webhook settings

### Application Configuration
```bash
NODE_ENV=production
LOG_LEVEL=info
API_BASE_URL=https://[your-vercel-domain].vercel.app
API_VERSION=v1
```

## Setting Variables in Vercel

### Via Dashboard:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable above
4. Select environments: Production, Preview, Development (as needed)
5. Click "Save"

### Via CLI:
```bash
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... repeat for each variable
```

### Via GitHub Secrets (for CI/CD):
If using GitHub Actions, add these as repository secrets:
- Go to GitHub → Settings → Secrets and variables → Actions
- Add each variable above

## Verification

After setting variables, verify they're loaded:

```bash
# In Vercel deployment logs, you should see:
# ✅ Environment variables validated
# ✅ Database connection successful
```

## Security Notes

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Service Role Key** - Keep `SUPABASE_SERVICE_ROLE_KEY` secret (bypasses RLS)
3. **API Keys** - Rotate LLM API keys regularly
4. **Webhook Secrets** - Use strong, random secrets for GitHub webhooks

## Post-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migration executed (see `MIGRATION-INSTRUCTIONS.md`)
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Verify tenant isolation
- [ ] Check billing enforcement
- [ ] Monitor error logs
