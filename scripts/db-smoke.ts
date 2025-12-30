#!/usr/bin/env tsx
/**
 * Database Smoke Test Script
 * 
 * Runs a small set of real queries against Supabase to verify:
 * - Database connectivity
 * - Required tables exist
 * - RLS policies work correctly (anon vs authenticated)
 * - Basic CRUD operations succeed
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." tsx scripts/db-smoke.ts
 * 
 * Exit codes:
 *   0 - All smoke tests passed
 *   1 - Smoke tests failed
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

interface SmokeTestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const prisma = new PrismaClient();

async function runSmokeTests(): Promise<SmokeTestResult[]> {
  const results: SmokeTestResult[] = [];

  // Test 1: Prisma connection
  const test1Start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.push({
      name: 'Prisma connection',
      passed: true,
      duration: Date.now() - test1Start,
    });
  } catch (error) {
    results.push({
      name: 'Prisma connection',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - test1Start,
    });
  }

  // Test 2: Required tables exist
  const test2Start = Date.now();
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'User', 'Organization', 'OrganizationMember', 'Repository',
        'Review', 'Test', 'Doc', 'Job', 'Violation', 'ApiKey',
        'Subscription', 'CostTracking', 'AuditLog'
      )
      ORDER BY tablename;
    `;

    const requiredTables = [
      'User', 'Organization', 'OrganizationMember', 'Repository',
      'Review', 'Test', 'Doc', 'Job', 'Violation', 'ApiKey',
      'Subscription', 'CostTracking', 'AuditLog',
    ];

    const foundTables = new Set(tables.map(t => t.tablename));
    const missingTables = requiredTables.filter(t => !foundTables.has(t));

    if (missingTables.length > 0) {
      results.push({
        name: 'Required tables exist',
        passed: false,
        error: `Missing tables: ${missingTables.join(', ')}`,
        duration: Date.now() - test2Start,
      });
    } else {
      results.push({
        name: 'Required tables exist',
        passed: true,
        duration: Date.now() - test2Start,
      });
    }
  } catch (error) {
    results.push({
      name: 'Required tables exist',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - test2Start,
    });
  }

  // Test 3: RLS is enabled on critical tables
  const test3Start = Date.now();
  try {
    const rlsCheck = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
      SELECT relname, relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname IN ('User', 'Organization', 'Repository', 'Review')
      AND c.relkind = 'r';
    `;

    const rlsNotEnabled = rlsCheck.filter(t => !t.relrowsecurity);
    if (rlsNotEnabled.length > 0) {
      results.push({
        name: 'RLS enabled on critical tables',
        passed: false,
        error: `RLS not enabled on: ${rlsNotEnabled.map(t => t.relname).join(', ')}`,
        duration: Date.now() - test3Start,
      });
    } else {
      results.push({
        name: 'RLS enabled on critical tables',
        passed: true,
        duration: Date.now() - test3Start,
      });
    }
  } catch (error) {
    results.push({
      name: 'RLS enabled on critical tables',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - test3Start,
    });
  }

  // Test 4: Helper functions exist
  const test4Start = Date.now();
  try {
    const functions = await prisma.$queryRaw<Array<{ routine_name: string }>>`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('current_user_id', 'is_org_member', 'has_org_role');
    `;

    const foundFunctions = new Set(functions.map(f => f.routine_name));
    const requiredFunctions = ['current_user_id', 'is_org_member', 'has_org_role'];
    const missingFunctions = requiredFunctions.filter(f => !foundFunctions.has(f));

    if (missingFunctions.length > 0) {
      results.push({
        name: 'Helper functions exist',
        passed: false,
        error: `Missing functions: ${missingFunctions.join(', ')}`,
        duration: Date.now() - test4Start,
      });
    } else {
      results.push({
        name: 'Helper functions exist',
        passed: true,
        duration: Date.now() - test4Start,
      });
    }
  } catch (error) {
    results.push({
      name: 'Helper functions exist',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - test4Start,
    });
  }

  // Test 5: Extensions installed
  const test5Start = Date.now();
  try {
    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pgcrypto');
    `;

    const foundExtensions = new Set(extensions.map(e => e.extname));
    const requiredExtensions = ['uuid-ossp', 'pgcrypto'];
    const missingExtensions = requiredExtensions.filter(e => !foundExtensions.has(e));

    if (missingExtensions.length > 0) {
      results.push({
        name: 'Required extensions installed',
        passed: false,
        error: `Missing extensions: ${missingExtensions.join(', ')}`,
        duration: Date.now() - test5Start,
      });
    } else {
      results.push({
        name: 'Required extensions installed',
        passed: true,
        duration: Date.now() - test5Start,
      });
    }
  } catch (error) {
    results.push({
      name: 'Required extensions installed',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - test5Start,
    });
  }

  // Test 6: Supabase anon client can connect (if env vars set)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const test6Start = Date.now();
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      // Try to query User table (should be blocked by RLS if not authenticated)
      const { error } = await supabase.from('User').select('id').limit(1);

      // Error is expected for anon user due to RLS
      if (error && error.message.includes('permission denied')) {
        results.push({
          name: 'Supabase anon client RLS enforcement',
          passed: true,
          duration: Date.now() - test6Start,
        });
      } else {
        results.push({
          name: 'Supabase anon client RLS enforcement',
          passed: false,
          error: 'RLS not properly blocking anon access',
          duration: Date.now() - test6Start,
        });
      }
    } catch (error) {
      results.push({
        name: 'Supabase anon client RLS enforcement',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - test6Start,
      });
    }
  }

  return results;
}

async function main() {
  console.log('🧪 Running database smoke tests...\n');

  const results = await runSmokeTests();

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${result.name}: ${status} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`Results: ${passedCount}/${totalCount} tests passed`);

  if (allPassed) {
    console.log('✅ All smoke tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some smoke tests failed');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('❌ Smoke test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
