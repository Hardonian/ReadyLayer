# Setup Instructions

## Prerequisites

- Node.js 20+ 
- PostgreSQL 15+ (or Supabase account)
- npm or yarn

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/readylayer?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-random-secret-here"
   REDIS_URL="redis://localhost:6379"  # Optional
   OPENAI_API_KEY="your-openai-api-key"  # Optional
   NODE_ENV="development"
   ```

3. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

## Database Setup

### Option 1: Using Supabase

1. Create a Supabase project at https://supabase.com
2. Run the migration:
   ```bash
   # Connect to your Supabase database and run:
   psql -h <your-supabase-host> -U postgres -d postgres -f supabase_migration.sql
   ```
3. Update `DATABASE_URL` in `.env` with your Supabase connection string

### Option 2: Using Local PostgreSQL

1. Create a database:
   ```bash
   createdb readylayer
   ```

2. Run Prisma migrations:
   ```bash
   npm run prisma:migrate
   ```

3. (Optional) Seed the database:
   ```bash
   npm run prisma:seed
   ```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Type Checking

```bash
npm run type-check
```

## Linting

```bash
npm run lint
```

## Database Management

### Prisma Studio (GUI)
```bash
npm run prisma:studio
```

### Generate Prisma Client
```bash
npm run prisma:generate
```

## Health Check

After starting the server, check health:
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is running
- Verify network connectivity

### Build Errors
- Run `npm run type-check` to identify TypeScript errors
- Run `npm run lint` to identify linting errors
- Clear `.next` directory: `rm -rf .next`

### Authentication Issues
⚠️ **Note:** Authentication is not yet implemented. All routes are currently unprotected.

## Production Deployment

### Vercel

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Environment Variables for Production

Ensure all required variables are set:
- `DATABASE_URL`
- `NEXTAUTH_URL` (your production URL)
- `NEXTAUTH_SECRET` (generate a new secret)
- `NODE_ENV=production`

## Security Notes

⚠️ **CRITICAL:** Before deploying to production:

1. **Implement Authentication** - Currently all routes are unprotected
2. **Add Authorization Checks** - Users can access/modify any data
3. **Add Rate Limiting** - API can be abused
4. **Fix Security Vulnerabilities** - Run `npm audit` and address issues
5. **Review RLS Policies** - If using Supabase, ensure policies are enforced

See `/LAUNCH-READINESS-AUDIT.md` for detailed security issues.
