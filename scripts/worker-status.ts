/**
 * Worker status check script
 *
 * Displays current worker and job queue status
 *
 * Usage: npx tsx scripts/worker-status.ts
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

interface JobRecord {
  id: string;
  type: string;
  status: string;
  lockedBy: string | null;
  createdAt: string;
  scheduledAt: string | null;
  completedAt: string | null;
  error: string | null;
}

async function getJobStats(): Promise<Record<string, number> | null> {
  const { data, error } = await supabase
    .from('Job')
    .select('*');

  if (error) {
    console.error('Error fetching job stats:', error.message);
    return null;
  }

  // Count by status manually
  const stats: Record<string, number> = {};
  const jobs = (data as JobRecord[]) || [];
  for (const job of jobs) {
    const status = job.status || 'unknown';
    stats[status] = (stats[status] || 0) + 1;
  }

  return stats;
}

async function getActiveWorkers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('Job')
    .select('lockedBy')
    .not('lockedBy', 'is', null)
    .eq('status', 'running');

  if (error) {
    console.error('Error fetching workers:', error.message);
    return [];
  }

  const jobs = (data as { lockedBy: string }[]) || [];
  const workers = new Set(jobs.map(j => j.lockedBy));
  return Array.from(workers);
}

async function getRecentJobs(limit = 5): Promise<JobRecord[]> {
  const { data, error } = await supabase
    .from('Job')
    .select('id, type, status, lockedBy, createdAt, scheduledAt, completedAt, error')
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent jobs:', error.message);
    return [];
  }

  return (data as JobRecord[]) || [];
}

async function checkMigrations(): Promise<boolean> {
  try {
    const result = await supabase
      .rpc('claim_jobs', { p_worker_id: 'test', p_limit: 1 });

    if (result.error && result.error.message?.includes('claim_jobs')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     ReadyLayer Worker Status                           ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Check migrations
  const migrationsOk = await checkMigrations();
  console.log(`\n🔧 Migrations: ${migrationsOk ? '✅ Applied' : '❌ Not Applied'}`);
  if (!migrationsOk) {
    console.log('   Run: npm run db:worker:setup');
  }

  // Job stats
  console.log('\n📊 Job Statistics:');
  const stats = await getJobStats();
  if (stats && Object.keys(stats).length > 0) {
    const statusIcons: Record<string, string> = {
      'queued': '⏳',
      'pending': '⏳',
      'running': '🔄',
      'succeeded': '✅',
      'completed': '✅',
      'failed': '❌',
      'dead': '💀',
      'canceled': '🚫',
      'retrying': '🔄'
    };

    for (const [status, count] of Object.entries(stats)) {
      const icon = statusIcons[status] || '📄';
      console.log(`   ${icon} ${status}: ${count}`);
    }
  } else {
    console.log('   No jobs in queue');
  }

  // Active workers
  console.log('\n👷 Active Workers:');
  const workers = await getActiveWorkers();
  if (workers.length > 0) {
    for (const worker of workers) {
      console.log(`   🟢 ${worker}`);
    }
  } else {
    console.log('   ⚠️  No active workers (jobs may be queued but not processing)');
  }

  // Recent jobs
  console.log('\n📋 Recent Jobs:');
  const recentJobs = await getRecentJobs(5);
  if (recentJobs.length > 0) {
    const statusIcons: Record<string, string> = {
      'queued': '⏳',
      'pending': '⏳',
      'running': '🔄',
      'succeeded': '✅',
      'completed': '✅',
      'failed': '❌',
      'dead': '💀',
      'canceled': '🚫'
    };

    for (const job of recentJobs) {
      const icon = statusIcons[job.status] || '📄';

      const time = new Date(job.createdAt).toLocaleTimeString();
      const shortId = job.id.slice(0, 8);
      console.log(`   ${icon} ${job.type} (${shortId}...) at ${time}`);
      if (job.lockedBy) {
        console.log(`      └─ Worker: ${job.lockedBy}`);
      }
      if (job.error) {
        const shortError = job.error.slice(0, 50);
        console.log(`      └─ Error: ${shortError}...`);
      }
    }
  } else {
    console.log('   No recent jobs');
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Quick Actions                                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('Start worker:      pnpm worker:py');
  console.log('Run smoke test:    pnpm jobs:smoke');
  console.log('Enqueue test job:  pnpm jobs:enqueue');
  console.log('View logs:         pnpm worker:py:docker:logs');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
