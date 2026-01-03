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

interface CheckResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const checks: CheckResult[] = [];

function runCheck(name: string, command: string): CheckResult {
  console.log(`\n🔍 Running: ${name}...`);
  const startTime = Date.now();
  
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} passed (${duration}ms)`);
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name} failed: ${errorMessage}`);
    return { name, passed: false, error: errorMessage, duration };
  }
}

async function main() {
  console.log('🏥 ReadyLayer Doctor - Running all checks...\n');

  // Check 1: Lint
  checks.push(runCheck('Lint', 'npm run lint'));

  // Check 2: Type Check
  checks.push(runCheck('Type Check', 'npm run type-check'));

  // Check 3: Prisma Validate
  if (existsSync('prisma/schema.prisma')) {
    checks.push(runCheck('Prisma Schema Validation', 'npm run prisma:validate'));
  }

  // Check 4: Build (production)
  checks.push(runCheck('Production Build', 'npm run build'));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Check Summary');
  console.log('='.repeat(60));

  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;

  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
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
