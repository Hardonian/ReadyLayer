import { performance } from 'perf_hooks'
import { queueService } from '../queue'
import { prisma } from '../lib/prisma'

const organizationId = process.env.BENCH_ORG_ID
const userId = process.env.BENCH_USER_ID ?? null
const repositoryId = process.env.BENCH_REPO_ID ?? null
const iterations = Number(process.env.BENCH_ITERATIONS ?? '200')
const concurrency = Math.max(1, Number(process.env.BENCH_CONCURRENCY ?? '10'))
const cleanup = process.env.BENCH_CLEANUP === 'true'

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

const enqueueOnce = async (index: number): Promise<number> => {
  const start = performance.now()
  await queueService.enqueue('bench-queue', {
    type: 'benchmark:enqueue',
    data: {
      benchmarkId,
      index,
      repositoryId: repositoryId ?? undefined,
    },
    organizationId,
    userId: userId ?? undefined,
    maxRetries: 3,
  })
  return performance.now() - start
}

const run = async (): Promise<void> => {
  await queueService.initialize()

  const durations: number[] = []
  let cursor = 0

  const scheduleNext = async (): Promise<void> => {
    if (cursor >= iterations) return
    const index = cursor
    cursor += 1

    const duration = await enqueueOnce(index)
    durations.push(duration)

    if (cursor < iterations) {
      await scheduleNext()
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, iterations) }, () => scheduleNext())
  await Promise.all(workers)

  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length
  const result = {
    benchmarkId,
    organizationId,
    iterations,
    concurrency,
    jobsInserted: await prisma.job.count({
      where: {
        payload: {
          path: ['benchmarkId'],
          equals: benchmarkId,
        },
      },
    }),
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
    await prisma.job.deleteMany({
      where: {
        payload: {
          path: ['benchmarkId'],
          equals: benchmarkId,
        },
      },
    })
  }
}

run()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await queueService.cleanup()
    await prisma.$disconnect()
  })
