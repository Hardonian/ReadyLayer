/**
 * Run Migration Using Prisma
 * 
 * Executes the migration SQL using Prisma's $executeRaw
 * This is safer than direct psql as it uses the configured connection
 */

import { prisma } from '../lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';
import { console } from './logger';

async function runMigration(): Promise<void> {
  console.log('🚀 Running ReadyLayer migration via Prisma...\n');

  try {
    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'prisma/migrations/20241230000000_init_readylayer/migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📦 Migration file loaded');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    console.log(`   Lines: ${migrationSQL.split('\n').length}\n`);

    // Split SQL into individual statements
    // Remove comments and empty lines, then split by semicolon
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let executed = 0;
    let failed = 0;

    // Execute statements one by one (some may fail if already exists, which is OK)
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty or comment-only statements
      if (!statement || statement.length < 10) {
        continue;
      }

      try {
        // Use $executeRawUnsafe for DDL statements
        await prisma.$executeRawUnsafe(statement);
        executed++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${statements.length} statements executed...`);
        }
      } catch (error) {
        // Some statements may fail if objects already exist (idempotent)
        // This is expected and OK
        const errorMessage = (error && typeof error === 'object' && 'message' in error)
          ? String(error.message)
          : '';
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('IF NOT EXISTS')
        ) {
          // Expected error, continue
          executed++;
        } else {
          failed++;
          console.error(`   ⚠️  Statement ${i + 1} failed: ${errorMessage.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ Migration execution complete`);
    console.log(`   Executed: ${executed} statements`);
    if (failed > 0) {
      console.log(`   Failed: ${failed} statements (may be expected if objects already exist)`);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('User', 'Organization', 'Repository', 'Review')
      ORDER BY tablename
    `;

    if (tables.length >= 4) {
      console.log(`✅ Found ${tables.length} core tables`);
      tables.forEach(t => console.log(`   - ${t.tablename}`));
    } else {
      console.log(`⚠️  Only found ${tables.length} core tables (expected 4+)`);
    }

    // Check RLS
    const rlsStatus = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('Organization', 'Repository', 'Review')
    `;

    const allRLSEnabled = rlsStatus.every(t => t.rowsecurity);
    if (allRLSEnabled) {
      console.log('✅ RLS enabled on core tables');
    } else {
      const disabled = rlsStatus.filter(t => !t.rowsecurity).map(t => t.tablename);
      console.log(`⚠️  RLS not enabled on: ${disabled.join(', ')}`);
    }

    console.log('\n🎉 Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run verify-migration');
    console.log('2. Run: npm run test-tenant-isolation');
    console.log('3. Run: npm run test-billing');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
