# Deployment Guide

## Local Development

### 1) Install dependencies

```
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and fill the required values:

```
cp .env.example .env
```

Minimum required variables:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3) Database & Prisma

Generate Prisma client (runs automatically on install):

```
npm run prisma:generate
```

Run migrations (if you have a local database):

```
npm run prisma:migrate
```

### 4) Start the dev server

```
npm run dev
```

## Demo Mode (Deterministic Sandbox)

Demo mode uses deterministic fixtures and no external calls.

```
npm run demo:setup
npm run demo:start
```

Reset demo state (clears sandbox runs if the database is configured):

```
npm run demo:reset
```

## Production Deployment

### 1) Build

```
npm run build
```

### 2) Start

```
npm run start
```

### 3) Workers (optional but recommended)

Run webhook and job processors:

```
npm run worker:webhook
npm run worker:job
```

### 4) Health Checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/ready`

## Rate Limiting & Redis

For production scale, configure Redis via `REDIS_URL` to enable shared rate limiting and queueing.
If Redis is not configured, ReadyLayer falls back to in-memory rate limiting.
