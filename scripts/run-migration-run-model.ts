#!/usr/bin/env tsx
/**
 * Run ReadyLayerRun Migration
 * 
 * Executes the SQL migration for the ReadyLayerRun model
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const migrationPath = join(process.cwd(), 'supabase/migrations/00000000000006_ready_layer_run.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log('Running ReadyLayerRun migration...');
  
  // Split SQL into individual statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✓ Executed statement');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') || error.code === '42P07' || error.code === '42710') {
          console.log('⚠ Statement already applied (skipping)');
        } else {
          console.error('✗ Error executing statement:', error.message);
          throw error;
        }
      }
    }
  }
  
  console.log('✅ Migration completed successfully!');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
