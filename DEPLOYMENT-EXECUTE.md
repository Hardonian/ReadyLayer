# Execute Deployment - Step by Step

Follow these steps to deploy ReadyLayer using GitHub Secrets.

## Step 1: Set GitHub Secrets (5 minutes)

1. Go to your GitHub repository
2. **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add each secret from `GITHUB-SECRETS-SETUP.md`

**Minimum required:**
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

## Step 2: Run Migration (via GitHub Actions)

### Option A: Manual Trigger (Recommended)

1. Go to **Actions** tab
2. Select **Database Migration** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Leave "Only verify migration" unchecked
6. Click **Run workflow**
7. Wait for completion (~2-3 minutes)

### Option B: Push Migration Files

```bash
# If migration files changed, push to trigger:
git add prisma/migrations/
git commit -m "chore: update migration"
git push origin main
```

### Option C: GitHub CLI

```bash
gh workflow run migrate.yml
gh run watch
```

## Step 3: Verify Migration Success

Check the workflow run:

1. Go to **Actions** tab
2. Click on the latest **Database Migration** run
3. Expand **Verify Migration** step
4. Should see: ✅ All checks passed

**Expected output:**
```
✅ All 16 tables exist
✅ RLS enabled on all tables
✅ All helper functions exist
✅ Found 30+ indexes
✅ Found 10+ update triggers
🎉 Migration verification PASSED!
```

## Step 4: Set Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project
2. **Settings → Environment Variables**
3. Add all variables from `VERCEL-ENV-SETUP.md`
4. Set for **Production**, **Preview**, **Development**
5. Click **Save**

**Note:** These are separate from GitHub Secrets. Vercel needs them for runtime.

## Step 5: Deploy to Vercel

### Option A: Auto-Deploy (if connected to GitHub)

```bash
# Push to main triggers deployment
git push origin main
```

### Option B: Manual Deploy

1. Go to Vercel Dashboard
2. Click **Deployments**
3. Click **Deploy** → **Deploy from GitHub**
4. Select branch: `main`
5. Click **Deploy**

### Option C: Via GitHub Actions

1. Set Vercel secrets in GitHub:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Push to main (triggers deploy workflow)

## Step 6: Post-Deployment Verification

### Quick Health Check

```bash
# Replace with your Vercel URL
curl https://your-app.vercel.app/api/health
# Should return: {"status":"ok"}
```

### Full Verification Script

```bash
# Run locally (requires API_BASE_URL)
export API_BASE_URL="https://your-app.vercel.app"
./scripts/deploy-verify.sh
```

### Manual Testing

1. **Visit homepage:** `https://your-app.vercel.app`
2. **Sign up:** Create account
3. **Create organization:** Test org creation
4. **Connect repo:** Link GitHub repository
5. **Test tenant isolation:** Create 2 orgs, verify isolation

## Step 7: Monitor & Verify

### Check Vercel Logs

1. Vercel Dashboard → **Deployments**
2. Click latest deployment
3. Check **Functions** tab for errors

### Check GitHub Actions Logs

1. **Actions** tab → Latest workflow runs
2. Review migration and deployment logs
3. Look for errors or warnings

### Test Critical Paths

- [ ] Authentication (sign up/in/out)
- [ ] Organization creation
- [ ] Repository connection
- [ ] Review creation
- [ ] Tenant isolation (users can't see other orgs)
- [ ] Billing limits (can't exceed plan limits)

## Troubleshooting

### Migration Fails

**Error: "DATABASE_URL not set"**
- Verify secret is set in GitHub
- Check secret name is exactly `DATABASE_URL`
- Re-run workflow

**Error: "Connection refused"**
- Check DATABASE_URL format
- Verify database allows connections from GitHub Actions IPs
- Check Supabase firewall settings

**Error: "Relation already exists"**
- Migration partially ran
- Check which tables exist
- Either drop and re-run, or continue with verification

### Deployment Fails

**Error: "Environment variable missing"**
- Add missing variables in Vercel
- Redeploy after adding

**Error: "Build failed"**
- Check build logs in Vercel
- Run `npm run build` locally
- Fix TypeScript/lint errors

**Error: "Database connection failed"**
- Verify `DATABASE_URL` in Vercel matches GitHub secret
- Check database allows Vercel IPs
- Verify connection string format

## Success Criteria

✅ Migration completed successfully  
✅ All tables and RLS policies created  
✅ Deployment successful  
✅ Health endpoint returns 200  
✅ Authentication works  
✅ Tenant isolation verified  
✅ Billing enforcement verified  

## Next Steps

- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure custom domain
- [ ] Set up alerts
- [ ] Onboard first customers
- [ ] Monitor error rates

---

**🎉 ReadyLayer is now live!**
