# ReadyLayer Deployment Checklist

Complete this checklist before going live.

## Pre-Deployment

### Database Setup
- [ ] Supabase project created
- [ ] Database migration executed (`prisma/migrations/20241230000000_init_readylayer/migration.sql`)
- [ ] All 16 tables verified
- [ ] RLS policies verified (all tables have `rowsecurity = true`)
- [ ] Helper functions verified (`current_user_id`, `is_org_member`, `has_org_role`)
- [ ] Indexes verified (30+ indexes created)
- [ ] Triggers verified (10+ update triggers created)

### Environment Variables (Vercel)
- [ ] `DATABASE_URL` set (Supabase PostgreSQL connection string)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `REDIS_URL` set (or database fallback enabled)
- [ ] `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set
- [ ] `DEFAULT_LLM_PROVIDER` set
- [ ] `GITHUB_APP_ID` set
- [ ] `GITHUB_APP_SECRET` set
- [ ] `GITHUB_WEBHOOK_SECRET` set
- [ ] `NODE_ENV=production` set
- [ ] `LOG_LEVEL=info` set
- [ ] `API_BASE_URL` set (your Vercel domain)

### Code Verification
- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no lint errors)
- [ ] `npm run build` succeeds
- [ ] All tests pass (if any)

## Deployment

### Vercel Deployment
- [ ] Code pushed to main branch (or manually deployed)
- [ ] Vercel build succeeds
- [ ] Deployment URL accessible
- [ ] No build errors in Vercel logs

### Post-Deployment Verification
- [ ] Health endpoint: `GET /api/health` returns 200
- [ ] Ready endpoint: `GET /api/ready` returns 200
- [ ] Frontend loads: `GET /` returns 200
- [ ] Dashboard accessible: `GET /dashboard` (may redirect to auth)

## Functional Testing

### Authentication Flow
- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to sign-in

### Organization Management
- [ ] User can create organization
- [ ] User can view their organizations
- [ ] User can update organization settings
- [ ] User can invite members (if implemented)

### Repository Management
- [ ] User can connect GitHub repository
- [ ] User can view repositories
- [ ] User can enable/disable repositories
- [ ] Repository limit enforced (Starter: 5 repos max)

### Review Flow
- [ ] Review can be created
- [ ] Review status updates correctly
- [ ] Review blocks PR when violations found
- [ ] Review shows violations and recommendations

### Tenant Isolation (CRITICAL)
- [ ] User A cannot see User B's organizations
- [ ] User A cannot access User B's repositories
- [ ] User A cannot see User B's reviews
- [ ] Direct API calls with wrong `organizationId` return 403
- [ ] RLS policies prevent cross-tenant queries

### Billing Enforcement
- [ ] Repository limit enforced (cannot create 6th repo on Starter)
- [ ] Feature access enforced (features match plan tier)
- [ ] LLM budget tracked correctly
- [ ] Upgrade/downgrade flow works (if implemented)

## Security Verification

### Authentication
- [ ] API routes require authentication
- [ ] Invalid tokens return 401
- [ ] Expired tokens return 401
- [ ] Session tokens validated correctly

### Authorization
- [ ] Users can only access their own data
- [ ] Admin/owner roles enforced
- [ ] API key authentication works (if implemented)

### Data Protection
- [ ] RLS policies active on all tables
- [ ] Sensitive data not exposed in API responses
- [ ] API keys hashed in database
- [ ] Webhook signatures validated

## Monitoring & Observability

### Logging
- [ ] Application logs visible in Vercel
- [ ] Error logs captured
- [ ] Structured logging working (Pino)

### Metrics (Optional)
- [ ] Health metrics tracked
- [ ] Performance metrics tracked
- [ ] Error rates monitored

### Alerts (Optional)
- [ ] Error rate alerts configured
- [ ] Database connection alerts configured
- [ ] API rate limit alerts configured

## Documentation

### User-Facing
- [ ] README.md updated
- [ ] Setup instructions clear
- [ ] API documentation available

### Internal
- [ ] Deployment guide complete (`DEPLOYMENT-GUIDE.md`)
- [ ] Migration instructions clear (`MIGRATION-INSTRUCTIONS.md`)
- [ ] Environment variables documented (`VERCEL-ENV-SETUP.md`)
- [ ] Runbooks available (`docs/runbooks/`)

## Launch Readiness

### Pre-Launch
- [ ] All critical bugs fixed
- [ ] Performance acceptable (< 2s page load)
- [ ] Error rate < 1%
- [ ] Database queries optimized
- [ ] Connection pooling configured

### Launch Day
- [ ] Team on standby
- [ ] Monitoring dashboards ready
- [ ] Rollback plan ready
- [ ] Support channels ready

### Post-Launch
- [ ] Monitor error logs for 24 hours
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address critical issues immediately

## Sign-Off

- [ ] **Technical Lead:** _________________ Date: _______
- [ ] **Security Review:** _________________ Date: _______
- [ ] **Product Owner:** _________________ Date: _______

---

## Quick Reference

### Migration
```bash
# Run in Supabase SQL Editor:
cat prisma/migrations/20241230000000_init_readylayer/migration.sql
```

### Verification
```bash
npm run migrate:verify
npm run test:tenant-isolation
npm run test:billing
```

### Deployment
```bash
# Push to main (auto-deploys) or:
vercel --prod
```

### Post-Deploy Test
```bash
./scripts/deploy-verify.sh
```
