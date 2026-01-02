# ReadyLayer Deployment Guide

**Quick Start:** See `QUICK-START.md` for fastest path to production.

## Overview

ReadyLayer deployment involves:
1. **Database Migration** (via GitHub Actions using secrets)
2. **Environment Variables** (set in Vercel)
3. **Deployment** (auto-deploy or manual)

## Prerequisites

- ✅ GitHub repository with ReadyLayer code
- ✅ Supabase project created
- ✅ Vercel account (or deployment target)
- ✅ GitHub Secrets configured (see `GITHUB-SECRETS-SETUP.md`)

## Step-by-Step Deployment

### 1. Set GitHub Secrets

**Location:** GitHub → Settings → Secrets and variables → Actions

**Required Secrets:**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider key

**Optional RAG Secrets (Evidence RAG Layer):**
- `RAG_ENABLED` - Enable RAG features (default: false)
- `RAG_INGEST_ENABLED` - Enable document ingestion (default: false)
- `RAG_QUERY_ENABLED` - Enable evidence queries (default: false)
- `RAG_PROVIDER` - Embeddings provider: "openai" or "disabled" (default: "disabled")
- `RAG_EMBED_MODEL` - Embedding model (default: "text-embedding-3-small")
- `RAG_MAX_CHUNKS_PER_DOC` - Max chunks per document (default: 100)
- `RAG_CHUNK_SIZE` - Chunk size in characters (default: 1000)
- `RAG_CHUNK_OVERLAP` - Chunk overlap in characters (default: 200)
- `RAG_MAX_CONTEXT_TOKENS` - Max tokens for prompt assembly (default: 4000)

**Full list:** See `GITHUB-SECRETS-SETUP.md`

### 2. Run Database Migration

**Option A: GitHub Actions (Recommended)**

1. Go to **Actions** tab
2. Select **Database Migration** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**
6. Wait ~2-3 minutes

**Option B: Manual (Local)**

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run migration
npm run migrate:run

# Verify
npm run migrate:verify
```

**Migration Details:** See `MIGRATION-INSTRUCTIONS.md`

**Note:** The Evidence RAG Layer migration (`00000000000001_rag_evidence_layer.sql`) adds:
- pgvector extension for vector similarity search
- `RagDocument` and `RagChunk` tables with RLS
- Vector search functions (`rag_match_chunks`, `rag_search_chunks_lexical`)
- Indexes for performance

**To enable RAG:**
1. Run the migration (includes pgvector extension)
2. Set `RAG_ENABLED=true`, `RAG_INGEST_ENABLED=true`, `RAG_QUERY_ENABLED=true`
3. Set `RAG_PROVIDER=openai` and ensure `OPENAI_API_KEY` is set
4. RAG will automatically ingest PR diffs, review results, test precedents, and doc conventions
5. Review Guard, Test Engine, and Doc Sync will use evidence retrieval when enabled

### 3. Set Vercel Environment Variables

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

**Copy all variables from GitHub Secrets to Vercel:**
- Same variable names
- Set for **Production**, **Preview**, **Development**
- Click **Save**

**Full list:** See `VERCEL-ENV-SETUP.md`

### 4. Deploy to Vercel

**Option A: Auto-Deploy (GitHub connected)**

```bash
git push origin main
```

**Option B: Manual Deploy**

1. Vercel Dashboard → **Deployments**
2. Click **Deploy** → **Deploy from GitHub**
3. Select branch: `main`
4. Click **Deploy**

**Option C: GitHub Actions**

1. Set Vercel secrets in GitHub:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Push to main (triggers deploy workflow)

### 5. Verify Deployment

**Health Check:**
```bash
curl https://your-app.vercel.app/api/health
# Should return: {"status":"ok"}
```

**Full Verification:**
```bash
export API_BASE_URL="https://your-app.vercel.app"
./scripts/deploy-verify.sh
```

**Manual Testing:**
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Dashboard accessible
- [ ] Can create organization
- [ ] Can connect repository

## Verification Checklist

### Database Migration
- [ ] All 16 tables created (+ 2 RAG tables if RAG enabled)
- [ ] RLS enabled on all tables
- [ ] Helper functions exist
- [ ] Indexes created (30+)
- [ ] Triggers created (10+)
- [ ] pgvector extension enabled (if RAG enabled)

### Application Deployment
- [ ] Build succeeds
- [ ] Health endpoint returns 200
- [ ] Ready endpoint returns 200
- [ ] Frontend loads
- [ ] Authentication works

### Security & Isolation
- [ ] Tenant isolation verified
- [ ] RLS policies active
- [ ] API routes require auth
- [ ] Billing limits enforced

## Troubleshooting

### Migration Fails

**Error: "DATABASE_URL not set"**
- Verify secret exists in GitHub
- Check secret name is exact: `DATABASE_URL`
- Re-run workflow

**Error: "Connection refused"**
- Check DATABASE_URL format
- Verify Supabase allows connections
- Check firewall settings

### Deployment Fails

**Error: "Environment variable missing"**
- Add missing variables in Vercel
- Redeploy after adding

**Error: "Build failed"**
- Check build logs
- Run `npm run build` locally
- Fix TypeScript/lint errors

## Documentation Reference

- **Quick Start:** `QUICK-START.md` - Fastest path to production
- **GitHub Secrets:** `GITHUB-SECRETS-SETUP.md` - Configure CI/CD secrets
- **Migration:** `MIGRATION-INSTRUCTIONS.md` - Database migration guide
- **Vercel Setup:** `VERCEL-ENV-SETUP.md` - Environment variables
- **Deployment Steps:** `DEPLOYMENT-EXECUTE.md` - Detailed execution guide
- **Checklist:** `DEPLOYMENT-CHECKLIST.md` - Complete pre-launch checklist

## Support

- **Issues:** Check GitHub Actions logs
- **Migration Help:** See `MIGRATION-INSTRUCTIONS.md`
- **Env Setup:** See `VERCEL-ENV-SETUP.md`

---

**Ready to deploy?** Start with `QUICK-START.md` or follow `DEPLOYMENT-EXECUTE.md` for detailed steps.
