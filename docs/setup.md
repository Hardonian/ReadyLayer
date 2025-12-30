# ReadyLayer Setup Instructions

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional, falls back to database)
- OpenAI API key OR Anthropic API key (at least one required)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in required values:

```bash
cp .env.example .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY` - At least one LLM provider

**Optional Variables:**
- `REDIS_URL` - Redis connection (defaults to database queue)
- `DEFAULT_LLM_PROVIDER` - 'openai' or 'anthropic' (default: 'openai')
- `LOG_LEVEL` - 'debug', 'info', 'warn', 'error' (default: 'info')

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Worker Processes

### Start Webhook Processor

```bash
npm run worker:webhook
```

### Start Job Processor

```bash
npm run worker:job
```

## Production Deployment

### Environment Variables

Ensure all required environment variables are set in your deployment platform.

### Database Migration

Run migrations in production:

```bash
npm run prisma:migrate deploy
```

### Worker Processes

Start worker processes as background services:

```bash
# Webhook processor
npm run worker:webhook

# Job processor  
npm run worker:job
```

### Health Checks

Monitor these endpoints:
- `/api/health` - Liveness probe
- `/api/ready` - Readiness probe

## Verification

1. **Health Check**: `curl http://localhost:3000/api/health`
2. **Ready Check**: `curl http://localhost:3000/api/ready`
3. **API Test**: Create an API key and test authentication

## Troubleshooting

### Prisma Client Not Generated

```bash
npm run prisma:generate
```

### Database Connection Issues

Verify `DATABASE_URL` is correct and database is accessible.

### Redis Connection Issues

If Redis is unavailable, the queue system will fall back to database. Check logs for warnings.

### LLM API Errors

Ensure at least one LLM API key is configured and has sufficient credits.
