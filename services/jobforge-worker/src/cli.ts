#!/usr/bin/env node
/**
 * JobForge Worker CLI
 */

import { Worker } from './lib/worker'
import { HandlerRegistry } from './lib/registry'
import { logger } from './lib/logger'

// Load handlers
import './handlers'

// Get config from environment
const config = {
  workerId: process.env.WORKER_ID || `worker-${Date.now()}`,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '2000', 10),
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10),
  claimLimit: parseInt(process.env.CLAIM_LIMIT || '10', 10),
}

// Validate required config
if (!config.supabaseUrl || !config.supabaseKey) {
  logger.error('Missing required environment variables', {
    required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  })
  process.exit(1)
}

// Parse CLI args
const args = process.argv.slice(2)
const mode = args.includes('--once') ? 'once' : 'loop'
const intervalArg = args.find((arg) => arg.startsWith('--interval='))

if (intervalArg) {
  const interval = parseInt(intervalArg.split('=')[1], 10)
  if (!isNaN(interval)) {
    config.pollIntervalMs = interval * 1000 // Convert to ms
  }
}

// Initialize worker
const registry = new HandlerRegistry()
const worker = new Worker(config, registry)

// Run worker
;(async () => {
  if (mode === 'once') {
    logger.info('Running worker once')
    await worker.runOnce()
    logger.info('Worker completed')
  } else {
    logger.info('Running worker in loop mode')
    await worker.run()
  }
})().catch((error) => {
  logger.error('Worker crashed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  process.exit(1)
})
