#!/usr/bin/env tsx
/**
 * JobForge Enqueue Example
 * Demonstrates how to enqueue different types of jobs
 */

import { enqueueJob } from '../lib/jobforge/enqueue'

async function main(): Promise<void> {
  console.log('🚀 JobForge Enqueue Example\n')

  // You'll need to replace this with a real tenant ID
  const tenantId = process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000000'

  try {
    // Example 1: HTTP Request Job
    console.log('📤 Enqueuing HTTP request job...')
    const httpJob = await enqueueJob({
      tenant_id: tenantId,
      type: 'connector.http.request',
      payload: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: { message: 'Hello from JobForge!' },
        timeout_ms: 10000,
      },
      idempotency_key: `http-example-${Date.now()}`,
    })
    console.log('✅ HTTP job:', httpJob.id, '\n')

    // Example 2: Webhook Delivery Job
    console.log('📤 Enqueuing webhook delivery job...')
    const webhookJob = await enqueueJob({
      tenant_id: tenantId,
      type: 'connector.webhook.deliver',
      payload: {
        target_url: 'https://webhook.site/unique-url',
        event_type: 'test.event',
        event_id: crypto.randomUUID(),
        data: {
          message: 'Test webhook',
          timestamp: new Date().toISOString(),
        },
      },
      idempotency_key: `webhook-example-${Date.now()}`,
    })
    console.log('✅ Webhook job:', webhookJob.id, '\n')

    // Example 3: Report Generation Job
    console.log('📤 Enqueuing report generation job...')
    const reportJob = await enqueueJob({
      tenant_id: tenantId,
      type: 'connector.report.generate',
      payload: {
        report_type: 'job-analytics',
        inputs_data: {
          jobs: [
            { id: '1', status: 'succeeded', attempts: 1 },
            { id: '2', status: 'failed', attempts: 3 },
            { id: '3', status: 'succeeded', attempts: 1 },
          ],
        },
        format: ['json', 'html'],
      },
      idempotency_key: `report-example-${Date.now()}`,
    })
    console.log('✅ Report job:', reportJob.id, '\n')

    console.log('✅ All jobs enqueued successfully!')
    console.log('\nRun the worker to process these jobs:')
    console.log('  npm run jobforge:worker\n')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
