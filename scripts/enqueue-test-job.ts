/**
 * Enqueue test job script
 *
 * Creates a test job for development/testing
 *
 * Usage: npx tsx scripts/enqueue-test-job.ts [type] [payload]
 * Example: npx tsx scripts/enqueue-test-job.ts smoke.test.echo '{"test":true}'
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './utils/load-env';

loadEnv('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main(): Promise<void> {
  const jobType = process.argv[2] || 'smoke.test.echo';
  const payloadStr = process.argv[3] || '{"test": true, "manual": true}';

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadStr) as Record<string, unknown>;
  } catch {
    console.error('❌ Invalid JSON payload:', payloadStr);
    process.exit(1);
  }

  const organizationId = `test_org_${Date.now()}`;

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Enqueue Test Job                                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nJob Type: ${jobType}`);
  console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
  console.log(`Organization: ${organizationId}`);

  const result = await supabase.rpc('enqueue_job', {
    p_organization_id: organizationId,
    p_type: jobType,
    p_payload: payload,
    p_idempotency_key: `manual_${Date.now()}`,
    p_max_attempts: 3
  });

  if (result.error) {
    console.error('\n❌ Failed to enqueue job:', result.error.message);
    process.exit(1);
  }

  const jobId = result.data as string;

  console.log('\n✅ Job enqueued successfully!');
  console.log(`Job ID: ${jobId}`);
  console.log('\nNext steps:');
  console.log('  1. Start worker: pnpm worker:py');
  console.log('  2. Check status: pnpm worker:status');
  console.log('  3. Run smoke test: pnpm jobs:smoke');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
