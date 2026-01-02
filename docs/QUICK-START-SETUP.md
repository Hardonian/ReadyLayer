# ReadyLayer Quick Start Setup

This guide helps you get ReadyLayer running quickly. Stripe configuration can be added later.

---

## ✅ What's Already Done

- ✅ All code implemented
- ✅ Stripe integration code ready
- ✅ False positive tracking implemented
- ✅ Enforcement strength fixed
- ✅ Messaging hardened

---

## 🚀 Quick Start (Without Stripe)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in **required** variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/readylayer"

# Supabase (for auth)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Redis
REDIS_URL="redis://localhost:6379"

# LLM Provider (at least one)
OPENAI_API_KEY="your-openai-api-key"
# OR
ANTHROPIC_API_KEY="your-anthropic-api-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Stripe variables can be added later** (see `docs/STRIPE-SETUP.md`):
- `STRIPE_SECRET_KEY` (optional for now)
- `STRIPE_WEBHOOK_SECRET` (optional for now)
- `STRIPE_PRICE_ID_GROWTH` (optional for now)
- `STRIPE_PRICE_ID_SCALE` (optional for now)

### 3. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run db:reconcile

# Verify database
npm run db:verify
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

---

## 🧪 Test Core Features (Without Stripe)

### Test Review Guard

```bash
curl -X POST http://localhost:3000/api/v1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "repositoryId": "repo-id",
    "prNumber": 1,
    "prSha": "abc123",
    "files": [{
      "path": "src/index.js",
      "content": "const query = `SELECT * FROM users WHERE id = ${userId}`;"
    }]
  }'
```

### Test Health Checks

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

---

## 💳 Adding Stripe Later

When you're ready to enable payments:

1. Follow `docs/STRIPE-SETUP.md` to:
   - Create Stripe products
   - Get API keys
   - Set up webhook endpoint
   - Add secrets to Supabase/GitHub

2. Add Stripe environment variables to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_GROWTH=price_...
   STRIPE_PRICE_ID_SCALE=price_...
   ```

3. Restart your server

4. Test checkout:
   ```bash
   curl -X POST http://localhost:3000/api/v1/billing/checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "organizationId": "org-id",
       "plan": "growth"
     }'
   ```

---

## 🎯 What Works Without Stripe

✅ **All core features work:**
- Review Guard (blocks PRs on security issues)
- Test Engine (enforces 80% coverage)
- Doc Sync (blocks PRs on drift)
- Billing limits enforcement (free tier only)
- False positive tracking

❌ **What doesn't work without Stripe:**
- Checkout sessions (returns 503 error)
- Webhook processing (returns 503 error)
- Paid tier upgrades (users stay on free tier)

**Note:** The app gracefully handles missing Stripe config. Users can use the free tier until Stripe is configured.

---

## 📋 Next Steps

1. ✅ Get core features running (this guide)
2. ⏳ Add Stripe configuration (when ready)
3. ⏳ Test end-to-end flows
4. ⏳ Deploy to production

---

## 🆘 Troubleshooting

### "STRIPE_SECRET_KEY not configured"

This is expected if Stripe isn't set up yet. The app will:
- Return 503 errors for checkout endpoints
- Continue working for free tier users
- Log warnings (not errors)

### Database Connection Issues

```bash
# Verify database is running
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma connection
npm run prisma:studio
```

### Redis Connection Issues

```bash
# Verify Redis is running
redis-cli ping

# The app will fall back to database-only queue if Redis is unavailable
```

---

## 📚 Additional Documentation

- `docs/STRIPE-SETUP.md` — Complete Stripe setup guide
- `PRODUCT-COMPRESSION-AUDIT.md` — Full product audit
- `LAUNCH-READINESS-SUMMARY.md` — Launch readiness summary
- `README.md` — Main documentation

---

**You're all set!** ReadyLayer is ready to use. Add Stripe when you're ready to accept payments.
