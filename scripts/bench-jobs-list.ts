import { performance } from 'perf_hooks'
import { prisma } from '../lib/prisma'
import { listJobs } from '../lib/jobs'

const organizationId = process.env.BENCH_ORG_ID
const jobCount = Number(process.env.BENCH_JOB_COUNT ?? '5000')
const iterations = Number(process.env.BENCH_ITERATIONS ?? '20')
const limit = Number(process.env.BENCH_LIMIT ?? '50')
const seed = process.env.BENCH_SEED === 'true'
const cleanup = process.env.BENCH_CLEANUP === 'true'
const explain = process.env.BENCH_EXPLAIN === 'true'

if (!organizationId) {
  console.error('BENCH_ORG_ID is required to run this benchmark.')
  process.exit(1)
}

const benchmarkId = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

const seedJobs = async (): Promise<void> => {
  const now = new Date()
  const data = Array.from({ length: jobCount }, (_, index) => ({
    id: `bench_${benchmarkId}_${index}`,
    type: 'benchmark:list',
    status: 'queued',
    payload: { benchmarkId, index },
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    organizationId,
  }))

  await prisma.job.createMany({ data })
}

const cleanupJobs = async (): Promise<void> => {
  await prisma.job.deleteMany({
    where: {
      payload: {
        path: ['benchmarkId'],
        equals: benchmarkId,
      },
    },
  })
}

const run = async (): Promise<void> => {
  if (seed) {
    console.log(`Seeding ${jobCount} jobs for organization ${organizationId}...`)
    await seedJobs()
  }

  if (explain) {
    const explainResult = await prisma.$queryRawUnsafe(
      `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Job" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
      organizationId,
      limit
    )
    console.log('EXPLAIN ANALYZE (Job list):', explainResult)
  }

  const durations: number[] = []
  let rowsReturned = 0
  const totalJobs = await prisma.job.count({
    where: { organizationId },
  })

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now()
    const { jobs } = await listJobs({
      tenantId: organizationId,
      limit,
      offset: 0,
    })
    durations.push(performance.now() - start)
    rowsReturned = jobs.length
  }

  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length
  const result = {
    benchmarkId,
    organizationId,
    jobCountSeeded: seed ? jobCount : null,
    iterations,
    limit,
    rowsReturned,
    totalJobs,
    latencyMs: {
      avg: Number(average.toFixed(2)),
      p50: Number(percentile(durations, 50).toFixed(2)),
      p95: Number(percentile(durations, 95).toFixed(2)),
      p99: Number(percentile(durations, 99).toFixed(2)),
      min: Number(Math.min(...durations).toFixed(2)),
      max: Number(Math.max(...durations).toFixed(2)),
    },
  }

  console.log(JSON.stringify(result, null, 2))

  if (cleanup) {
    await cleanupJobs()
  }
}

run()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
