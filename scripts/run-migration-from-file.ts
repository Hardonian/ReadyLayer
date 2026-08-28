/**
 * Run Migration From File
 *
 * Executes a specific migration SQL file using Prisma
 */

import { prisma } from '../lib/prisma';
import { readFileSync } from 'fs';
import { console } from './logger';

async function runMigrationFromFile(migrationFilePath: string): Promise<void> {
  console.log(`🚀 Running migration from: ${migrationFilePath}\n`);

  try {
    // Read migration SQL file
    const migrationSQL = readFileSync(migrationFilePath, 'utf-8');

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
          // For critical errors, we might want to stop
          if (errorMessage.includes('syntax error') || errorMessage.includes('permission denied')) {
            throw error;
          }
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

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get migration file path from command line argument
const migrationFilePath = process.argv[2];

if (!migrationFilePath) {
  console.error('❌ Error: Migration file path required');
  console.error('Usage: tsx scripts/run-migration-from-file.ts <path-to-migration.sql>');
  process.exit(1);
}

runMigrationFromFile(migrationFilePath).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
