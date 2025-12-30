# ReadyLayer — Deployment Guide

## Pre-Deployment Checklist

### 1. Database Setup

**Run Migration:**
```bash
# Option 1: Using Prisma (recommended for local/dev)
npx prisma migrate deploy

# Option 2: Direct SQL (for Supabase production)
# Copy contents of prisma/migrations/20241230000000_init_readylayer/migration.sql
# Execute in Supabase SQL Editor
```

**Verify:**
- All tables created
- RLS policies enabled
- Indexes created
- Triggers created

### 2. Environment Variables

**Required Variables:**
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# LLM (at least one required)
OPENAI_API_KEY="sk-..."
# OR
ANTHROPIC_API_KEY="sk-ant-..."

# Optional
REDIS_URL="redis://localhost:6379"
GITHUB_APP_ID="..."
GITHUB_APP_SECRET="..."
GITHUB_WEBHOOK_SECRET="..."
```

**Set in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Set for Production, Preview, and Development

### 3. GitHub Secrets (for CI/CD)

If using GitHub Actions, set these secrets:
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

### 4. Build Verification

```bash
# Type check
npm run type-check

# Build
npm run build

# Lint
npm run lint
```

All should pass before deploying.

---

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   - Import GitHub repository to Vercel
   - Vercel will auto-detect Next.js

2. **Configure Environment Variables**
   - Add all required env vars in Vercel dashboard
   - Set for Production environment

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Deploy**
   - Push to main branch triggers production deploy
   - Or deploy manually from Vercel dashboard

5. **Verify Deployment**
   - Check `/api/health` endpoint
   - Check `/api/ready` endpoint
   - Test authentication flow
   - Verify tenant isolation

### Supabase Setup

1. **Create Project**
   - Create new Supabase project
   - Note project URL and anon key

2. **Run Migration**
   - Go to SQL Editor
   - Copy migration SQL from `prisma/migrations/20241230000000_init_readylayer/migration.sql`
   - Execute migration

3. **Enable RLS**
   - Verify RLS is enabled on all tables
   - Test policies with test user

4. **Configure Auth**
   - Enable GitHub OAuth provider
   - Configure redirect URLs
   - Set up email templates

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Liveness
curl https://your-domain.com/api/health

# Readiness
curl https://your-domain.com/api/ready
```

Both should return 200 OK.

### 2. Authentication Flow

1. Visit homepage
2. Click "Sign in with GitHub"
3. Complete OAuth flow
4. Verify redirect to dashboard

### 3. Tenant Isolation Test

**Test 1: Cross-tenant access prevention**
1. Create two organizations (Org A, Org B)
2. Create repo in Org A
3. As Org B user, try to access Org A's repo
4. Should return 403 Forbidden

**Test 2: RLS enforcement**
1. Use Supabase SQL editor
2. Try to SELECT from Repository table as different user
3. Should only see own organization's repos

### 4. Billing Enforcement Test

1. Create organization on Starter plan (5 repo limit)
2. Add 5 repositories (should succeed)
3. Try to add 6th repository (should fail with 403)
4. Upgrade to Growth plan
5. Add 6th repository (should succeed)

### 5. API Routes Test

```bash
# List repos (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/v1/repos

# Create review (requires auth + billing check)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryId":"...","prNumber":1,"prSha":"...","files":[]}' \
  https://your-domain.com/api/v1/reviews
```

---

## Monitoring & Observability

### Health Monitoring

**Endpoints:**
- `/api/health` — Liveness probe
- `/api/ready` — Readiness probe

**Vercel Monitoring:**
- Enable Vercel Analytics
- Set up alerts for error rates
- Monitor response times

### Logging

**Structured Logs:**
- JSON format (Pino)
- Request IDs for tracing
- Log levels: debug, info, warn, error

**Log Aggregation:**
- Connect to Datadog, LogRocket, or similar
- Set up log retention policies

### Metrics

**Track:**
- API request rates
- Error rates by endpoint
- Review completion times
- Billing limit hits
- Tenant isolation violations (should be 0)

---

## Rollback Procedure

### Database Rollback

**If migration fails:**
```bash
# Prisma rollback
npx prisma migrate resolve --rolled-back 20241230000000_init_readylayer

# Manual rollback (Supabase)
# Drop tables in reverse order of creation
# Drop RLS policies
# Drop functions
```

### Application Rollback

**Vercel:**
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

**Git:**
```bash
git revert HEAD
git push origin main
```

---

## Scaling Considerations

### Database Scaling

**Connection Pooling:**
- Prisma client uses connection pooling
- Configure pool size via DATABASE_URL: `?connection_limit=20`
- Monitor connection usage

**Query Optimization:**
- Composite indexes added for common queries
- Monitor slow queries
- Add indexes as needed

**Read Replicas:**
- Consider read replicas for high read load
- Prisma supports read replicas via datasource configuration

### Application Scaling

**Vercel:**
- Auto-scales serverless functions
- Edge functions for static content
- CDN for assets

**Queue System:**
- Redis for queue (scales horizontally)
- DB fallback if Redis unavailable
- Monitor queue depth

### Cost Optimization

**LLM Costs:**
- Track usage per organization
- Enforce budgets
- Cache LLM responses (future)

**Database Costs:**
- Monitor query volume
- Optimize expensive queries
- Archive old data

---

## Security Hardening

### Production Checklist

- [x] RLS policies enabled
- [x] Tenant isolation enforced
- [x] API routes protected
- [x] Webhook signatures validated
- [x] API keys hashed
- [ ] Rate limiting tuned
- [ ] CORS configured
- [ ] Security headers set
- [ ] DDoS protection enabled (Vercel)

### Security Headers

Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      ],
    },
  ];
}
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
- Check DATABASE_URL format
- Verify network access
- Check connection pool limits

**2. RLS Policy Errors**
- Verify policies are enabled
- Check helper functions exist
- Test with Supabase SQL editor

**3. Tenant Isolation Failures**
- Check API route organization membership checks
- Verify RLS policies
- Review audit logs

**4. Billing Limit Errors**
- Verify subscription exists
- Check tier configuration
- Review CostTracking table

---

## Support

**Documentation:** `/docs/`  
**Runbooks:** `/docs/runbooks/`  
**Support:** support@readylayer.com  
**Status:** https://status.readylayer.com

---

**Last Updated:** 2024-12-30
