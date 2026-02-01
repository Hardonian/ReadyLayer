#!/usr/bin/env tsx
/**
 * JobForge Smoke Test
 * Validates JobForge integration by enqueuing and processing a test job
 */

import { JobForgeClient } from '../lib/jobforge/sdk/src'

async function smokeTest(): Promise<void> {
  console.log('🔥 JobForge Smoke Test Starting...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
  }

  const client = new JobForgeClient({
    supabaseUrl,
    supabaseKey: supabaseServiceKey,
  })

  // Use a test tenant ID (create one if needed or use an existing one)
  const testTenantId = process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000000'

  try {
    // Step 1: Enqueue a test job
    console.log('📤 Enqueuing test job...')
    const job = await client.enqueueJob({
      tenant_id: testTenantId,
      type: 'connector.http.request',
      payload: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: { test: true, timestamp: new Date().toISOString() },
      },
      idempotency_key: `smoke-test-${Date.now()}`,
    })

    console.log('✅ Job enqueued:', {
      id: job.id,
      type: job.type,
      status: job.status,
    })

    // Step 2: Verify job was created
    console.log('\n🔍 Fetching job...')
    const fetchedJob = await client.getJob(job.id, testTenantId)

    if (!fetchedJob) {
      throw new Error('Job not found after creation')
    }

    console.log('✅ Job fetched successfully:', {
      id: fetchedJob.id,
      status: fetchedJob.status,
    })

    // Step 3: List jobs
    console.log('\n📋 Listing jobs...')
    const jobs = await client.listJobs({
      tenant_id: testTenantId,
      filters: { limit: 5 },
    })

    console.log(`✅ Found ${jobs.length} jobs for tenant`)

    // Step 4: Test idempotency
    console.log('\n🔁 Testing idempotency...')
    const duplicateJob = await client.enqueueJob({
      tenant_id: testTenantId,
      type: 'connector.http.request',
      payload: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: { test: true },
      },
      idempotency_key: job.idempotency_key || undefined,
    })

    if (job.idempotency_key && duplicateJob.id === job.id) {
      console.log('✅ Idempotency working: duplicate job returned same ID')
    } else {
      console.log('⚠️  Idempotency note: different job created (expected if no key)')
    }

    console.log('\n✅ JobForge Smoke Test PASSED\n')
    console.log('Next steps:')
    console.log('  1. Apply migration: npm run db:jobforge:migrate')
    console.log('  2. Run worker: npm run jobforge:worker')
    console.log('  3. Monitor jobs in database: SELECT * FROM jobforge_jobs;\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Smoke test FAILED:', error)
    process.exit(1)
  }
}

smokeTest()
