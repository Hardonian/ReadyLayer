# ReadyLayer Deployment Guide

## Overview

This guide covers deployment of ReadyLayer to production environments.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase project
- GitHub OAuth app credentials
- Stripe account (for billing)
- Slack workspace (optional)
- SendGrid or Postmark account (for email)

## Environment Setup

1. Create `.env.local` with required variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host/db

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=xxx
GITHUB_OAUTH_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=xxx

# Email
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=xxx

# Slack (optional)
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_WEBHOOK_URL=xxx

# LLM
OPENAI_API_KEY=sk-xxx
```

## Deployment Steps

### 1. Build Application

```bash
npm run build
```

### 2. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 3. Deploy to Vercel

```bash
vercel deploy --prod
```

### 4. Configure Edge Functions

Edge functions are automatically deployed from `app/api/` routes.

### 5. Set up Webhooks

Configure webhook endpoints:
- GitHub: `https://yourdomain.com/api/webhooks/github`
- Stripe: `https://yourdomain.com/api/webhooks/stripe`
- Slack: `https://yourdomain.com/integrations/slack/events`

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] GitHub OAuth configured
- [ ] Stripe connected and webhooks set up
- [ ] Email provider configured
- [ ] Slack app configured (optional)
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Database backups enabled
- [ ] Monitoring/alerts configured

## Performance Optimization

### Database

Add indexes for frequently queried columns:

```sql
CREATE INDEX idx_runs_organization_id ON runs(organization_id);
CREATE INDEX idx_reviews_pr_number ON reviews(pr_number);
```

### Caching

Redis caching is configured for:
- LLM responses (1 hour TTL)
- Policy templates (24 hour TTL)
- User session data (7 day TTL)

### Image Optimization

Use Next.js Image component for all images:

```tsx
import Image from 'next/image'
```

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer. Sticky sessions are not required.

### Background Jobs

Workers process async tasks:
- LLM requests: `workers/llm-processor-worker.ts`
- Test execution: `workers/test-executor-worker.ts`
- Webhooks: `workers/webhook-processor.ts`

Monitor job queue depth and scale workers as needed.

### Monitoring

Key metrics to monitor:
- Request latency (p50, p95, p99)
- Error rate
- Worker queue depth
- LLM API latency
- Database query times

## Rollback Procedure

1. Revert to previous Vercel deployment
2. Rollback database migrations if needed
3. Clear Redis cache
4. Monitor metrics to confirm stability

## Support

For issues, contact support@readylayer.io or see docs at https://readylayer.io/docs
