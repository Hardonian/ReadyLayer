# Vercel-Specific Configuration

This file documents Vercel-specific settings and configurations for optimal deployment on the ReadyLayer platform.

## Environment Configuration

### Required Environment Variables

Ensure these are set in Vercel Project Settings → Environment Variables:

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (with SSL for Vercel)
- `DIRECT_URL` - Direct PostgreSQL connection for migrations

**Authentication:**
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Set to your production URL

**Webhooks:**
- `STRIPE webhook secret` - For Stripe payment processing
- `GITHUB_WEBHOOK_SECRET` - For GitHub app webhooks

### Vercel-Specific Variables
- `NEXT_PUBLIC_APP_URL` - Public URLs (auto-set by Vercel)

## Project Configuration

### Vercel Build Settings

**Framework Preset:** Next.js  
**Install Command:** `npm ci`  
**Build Command:** `npm run build`  
**Output Directory:** `.next`

## Build Optimization Best Practices

### ✅ Current Practices (Keep)

1. **Image Optimization**
   - AVIF and WebP formats
   - Responsive image sizes

2. **Security Headers**
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - CSP headers

3. **Performance**
   - Compression enabled
   - PoweredByHeader disabled
   - React Strict Mode

4. **Logging**
   - Full URL logging in development
   - Structured logs in production

### ❌ Anti-Patterns (Avoid)

1. **DO NOT set `output: 'standalone'`**
   - This breaks Vercel serverless builds
   - Use only for self-hosted deployments

2. **DO NOT set custom `distDir`**
   - Let Vercel manage build output

3. **DO NOT use `optimizeFonts` manual loading**
   - Use built-in Next.js font optimization

## Middleware Configuration

### Important: Middleware Runtime
```javascript
export const runtime = 'nodejs'; // Required for crypto/prisma
```

**Files using Node.js middleware:**
- `middleware/proxy.ts`
- Webhook routes: `app/api/webhooks/stripe/route.ts`, `app/api/integrations/*/callback/route.ts`

## Edge vs Server Runtime

### Use Edge Runtime when:
- Simple request/response logic
- No large dependencies
- No Prisma/database access

### Use Node Runtime when:
- Crypto/sha256 operations
- Prisma database access
- Large bundles/heavy computations
- Webhook signature verification

## Deployment Commands

### Vercel CLI Build Process
```bash
npm ci              # Install dependencies (fast, consistent)
npm run lint       # Type checking and linting
npm run type-check  # TypeScript validation
next build         # Production build
```

## Common Build Issues and Solutions

### Issue 1: "process is not defined" in .mjs files
**Fix:** Global declarations at top of file
```javascript
/* global process, URL */
```

### Issue 2: Module "bufferutil" not found
**Fix:** Externals in webpack config (already in next.config.js)

### Issue 3: Build cache invalidation
**Fix:** Vercel handles automatically; avoid manual `.vercelignore` changes

## Vercel Features Enabled

### ✅ Automatic
- CDN optimization (static assets)
- Image optimization (AVIF/WebP)
- Serverless functions scaling
- Preview deployments

### ⚙️ Configure in Project Settings
- Environment Variables
- Team permissions
- Custom domains

## Monitoring and Observability

### Vercel Analytics (Built-in)
- Web Vitals tracking
- User flow mapping
- Deployment metrics

### Recommended
- Enable Vercel monitoring for production
- Set up alerting for build failures
- Track 4xx/5xx error rates

## Git Configuration for Vercel

### Required for Deployment
- Ensure `package-lock.json` is in sync with `package.json`
- Always run `npm install` after modifying `package.json`

### Commit Guidelines
- **ALWAYS** commit both `package.json` AND `package-lock.json` together
- Never commit `package.json` alone
- Run `npm ci` before final commit to verify lockfile sync

## Performance Targets

### Build Time
- Clean build: < 2 minutes
- Cached build: < 30 seconds

### Bundle Size
- Main bundles: < 200KB (gzipped)
- Largest route: < 300KB (gzipped)

### First Contentful Paint (FCP)
- Marketing pages: < 1.5s
- Dashboard: < 2.5s

## Production Checklist

Before deploying to Vercel:

- [ ] All lint errors resolved (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run type-check`)
- [ ] Build completes locally (`npm run build`)
- [ ] package-lock.json is committed and in sync
- [ ] No 'output: standalone' in next.config.js
- [ ] Environment variables configured in Vercel settings
- [ ] Database migrations run (if needed)
- [ ] Webhook secrets configured
- [ ] Production URLs set in environment

## Troubleshooting Build Failures

### Build Log Errors

**"Error: Command 'npm ci' failed"**
→ Fix: Run `npm install` locally and commit `package-lock.json`

**"Module not found: bufferutil"**
→ Next.js build should handle; ignore if build succeeds

**"process is not defined"**
→ Fix: Add global declarations to affected `.mjs` files

**"Timeout: Build took too long"**
→ Optimize bundle size, check for heavy dependencies