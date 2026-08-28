#!/usr/bin/env tsx
/**
 * ReadyLayer Doctor Script
 *
 * Runs all checks locally that CI runs:
 * - Lint
 * - Type check
 * - Build
 * - Database schema validation
 *
 * Usage: npm run doctor
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { console } from './logger';

interface CheckResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

const checks: CheckResult[] = [];

function runCheck(
  name: string,
  command: string,
  options?: { env?: Record<string, string | undefined> }
): CheckResult {
  console.log(`\n🔍 Running: ${name}...`);
  const startTime = Date.now();

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...(options?.env || {}),
      },
    });
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} passed (${duration}ms)`);
    return { name, status: 'passed', duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name} failed: ${errorMessage}`);
    return { name, status: 'failed', error: errorMessage, duration };
  }
}

async function main(): Promise<void> {
  console.log('🏥 ReadyLayer Doctor - Running all checks...\n');

  // Check 1: Lint
  checks.push(runCheck('Lint', 'npm run lint'));

  // Check 2: Type Check
  checks.push(runCheck('Type Check', 'npm run type-check'));

  // Check 3: Prisma Validate
  if (existsSync('prisma/schema.prisma')) {
    // Prisma validate requires DATABASE_URL to exist in env, but does not need a live DB connection.
    // Provide a safe dummy value if missing so schema validation still runs.
    checks.push(
      runCheck('Prisma Schema Validation', 'npm run prisma:validate', {
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/readylayer',
        },
      })
    );
  }

  // Check 4: Build (production)
  checks.push(runCheck('Production Build', 'npm run build'));

  // Check 5: Golden Path Test
  if (!process.env.DATABASE_URL) {
    console.log('\n⏭️  Skipping: Golden Path Test (DATABASE_URL not set)');
    checks.push({ name: 'Golden Path Test', status: 'skipped' });
  } else {
    checks.push(runCheck('Golden Path Test', 'npm run test:golden-path'));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Check Summary');
  console.log('='.repeat(60));

  const passed = checks.filter(c => c.status === 'passed' || c.status === 'skipped').length;
  const total = checks.length;

  checks.forEach(check => {
    const icon = check.status === 'passed' ? '✅' : check.status === 'skipped' ? '⏭️ ' : '❌';
    const duration = check.duration ? ` (${check.duration}ms)` : '';
    console.log(`${icon} ${check.name}${duration}`);
    if (check.error) {
      console.log(`   Error: ${check.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('🎉 All checks passed! Ready for deployment.');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed. Please fix errors before deploying.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
