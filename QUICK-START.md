# ReadyLayer Quick Start Guide

Get ReadyLayer running in production in 15 minutes.

## Step 1: Database Migration (5 min)

⚠️ **Migrations do NOT run automatically** - manual trigger required.

**Option A: GitHub Actions (Recommended)**

1. Go to **Actions** tab → **Database Migration** workflow
2. Click **Run workflow**
3. Select branch: `main`
4. Leave `migration_file` empty (runs latest)
5. Set `archive_after: true`
6. Click **Run workflow**
7. Wait ~2-3 minutes

**Option B: Supabase SQL Editor**

1. **Open Supabase SQL Editor**
   - Go to your Supabase project → SQL Editor → New query

2. **Copy & Run Migration**
   ```bash
   # Copy entire file:
   cat backend/prisma/migrations/20241230000000_init_readylayer/migration.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Wait ~30 seconds

3. **Verify Tables**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   - Should see 16 tables

## Step 2: Environment Variables (5 min)

**In Vercel Dashboard → Settings → Environment Variables:**

```bash
# Database (from Supabase → Settings → Database → Connection String)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Supabase (from Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Redis (optional - use Upstash or Redis Cloud)
REDIS_URL=redis://[connection-string]

# LLM (at least one required)
OPENAI_API_KEY=sk-[key]
DEFAULT_LLM_PROVIDER=openai

# GitHub App (from GitHub → Settings → Developer settings → GitHub Apps)
GITHUB_APP_ID=[app-id]
GITHUB_APP_SECRET=[app-secret]
GITHUB_WEBHOOK_SECRET=[webhook-secret]

# App Config
NODE_ENV=production
LOG_LEVEL=info
API_BASE_URL=https://[your-domain].vercel.app
```

## Step 3: Deploy (2 min)

**Option A: Auto-deploy (if connected to GitHub)**
```bash
git push origin main
```

**Option B: Manual deploy**
```bash
vercel --prod
```

## Step 4: Verify (3 min)

1. **Check Health**
   ```bash
   curl https://[your-domain].vercel.app/api/health
   # Should return: {"status":"ok"}
   ```

2. **Test Frontend**
   - Visit: `https://[your-domain].vercel.app`
   - Should see landing page

3. **Test Authentication**
   - Click "Sign In"
   - Sign up with email
   - Should redirect to dashboard

4. **Test Tenant Isolation**
   - Create Organization A
   - Create Repository in Org A
   - Sign out, create new account
   - Create Organization B
   - Verify you cannot see Org A's data

## Troubleshooting

### Migration Fails
- Check Supabase SQL Editor for error messages
- Ensure you're using the project owner account
- Try running statements individually

### Environment Variables Not Loading
- Verify variables are set for correct environment (Production)
- Redeploy after adding variables
- Check Vercel logs for validation errors

### Build Fails
- Check `npm run build` locally first
- Review Vercel build logs
- Ensure all dependencies are in `package.json`

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure IP allowlist includes Vercel IPs (if enabled)

## Next Steps

- [ ] Connect your first GitHub repository
- [ ] Create your first review
- [ ] Test billing limits
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure custom domain

## Support

- **Documentation:** See `DEPLOYMENT-GUIDE.md`
- **Migration Help:** See `MIGRATION-INSTRUCTIONS.md`
- **Env Setup:** See `VERCEL-ENV-SETUP.md`

---

**🎉 You're live!** ReadyLayer is now running in production.
