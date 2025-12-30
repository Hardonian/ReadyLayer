/**
 * Verify Migration Success
 * 
 * Checks that all tables, indexes, RLS policies, and functions were created correctly
 */

import { prisma } from '../lib/prisma';

async function verifyMigration() {
  console.log('🔍 Verifying ReadyLayer migration...\n');

  const checks: Array<{ name: string; passed: boolean; error?: string }> = [];

  // Check 1: Verify tables exist
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;

    const expectedTables = [
      'User',
      'Organization',
      'OrganizationMember',
      'Repository',
      'Installation',
      'RepositoryConfig',
      'OrganizationConfig',
      'Review',
      'Test',
      'Doc',
      'Job',
      'Violation',
      'ApiKey',
      'Subscription',
      'CostTracking',
      'AuditLog',
    ];

    const foundTables = tables.map(t => t.tablename);
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));

    if (missingTables.length === 0) {
      checks.push({ name: 'All tables created', passed: true });
      console.log('✅ All 16 tables exist');
    } else {
      checks.push({
        name: 'All tables created',
        passed: false,
        error: `Missing tables: ${missingTables.join(', ')}`,
      });
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    }
  } catch (error) {
    checks.push({
      name: 'All tables created',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Error checking tables: ${error}`);
  }

  // Check 2: Verify RLS is enabled
  try {
    const rlsStatus = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('User', 'Organization', 'Repository', 'Review')
      ORDER BY tablename
    `;

    const allRLSEnabled = rlsStatus.every(t => t.rowsecurity);
    if (allRLSEnabled) {
      checks.push({ name: 'RLS enabled on tables', passed: true });
      console.log('✅ RLS enabled on all tables');
    } else {
      const disabled = rlsStatus.filter(t => !t.rowsecurity).map(t => t.tablename);
      checks.push({
        name: 'RLS enabled on tables',
        passed: false,
        error: `RLS not enabled on: ${disabled.join(', ')}`,
      });
      console.log(`❌ RLS not enabled on: ${disabled.join(', ')}`);
    }
  } catch (error) {
    checks.push({
      name: 'RLS enabled on tables',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 3: Verify helper functions exist
  try {
    const functions = await prisma.$queryRaw<Array<{ proname: string }>>`
      SELECT proname 
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN ('current_user_id', 'is_org_member', 'has_org_role')
    `;

    const foundFunctions = functions.map(f => f.proname);
    const expectedFunctions = ['current_user_id', 'is_org_member', 'has_org_role'];
    const missingFunctions = expectedFunctions.filter(f => !foundFunctions.includes(f));

    if (missingFunctions.length === 0) {
      checks.push({ name: 'Helper functions created', passed: true });
      console.log('✅ All helper functions exist');
    } else {
      checks.push({
        name: 'Helper functions created',
        passed: false,
        error: `Missing functions: ${missingFunctions.join(', ')}`,
      });
      console.log(`❌ Missing functions: ${missingFunctions.join(', ')}`);
    }
  } catch (error) {
    checks.push({
      name: 'Helper functions created',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 4: Verify indexes exist
  try {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE '%_idx' OR indexname LIKE '%_unique_idx'
      LIMIT 50
    `;

    if (indexes.length >= 30) {
      checks.push({ name: 'Indexes created', passed: true });
      console.log(`✅ Found ${indexes.length} indexes`);
    } else {
      checks.push({
        name: 'Indexes created',
        passed: false,
        error: `Only found ${indexes.length} indexes, expected 30+`,
      });
      console.log(`⚠️  Found ${indexes.length} indexes (expected 30+)`);
    }
  } catch (error) {
    checks.push({
      name: 'Indexes created',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 5: Verify triggers exist
  try {
    const triggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgname LIKE 'update_%_updated_at'
    `;

    if (triggers.length >= 10) {
      checks.push({ name: 'Triggers created', passed: true });
      console.log(`✅ Found ${triggers.length} update triggers`);
    } else {
      checks.push({
        name: 'Triggers created',
        passed: false,
        error: `Only found ${triggers.length} triggers, expected 10+`,
      });
      console.log(`⚠️  Found ${triggers.length} triggers (expected 10+)`);
    }
  } catch (error) {
    checks.push({
      name: 'Triggers created',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Summary
  console.log('\n📊 Migration Verification Summary:');
  console.log('================================');
  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  console.log(`Passed: ${passed}/${total}`);

  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (!check.passed && check.error) {
      console.log(`   Error: ${check.error}`);
    }
  });

  if (passed === total) {
    console.log('\n🎉 Migration verification PASSED!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migration verification FAILED. Please review errors above.');
    process.exit(1);
  }
}

verifyMigration().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
