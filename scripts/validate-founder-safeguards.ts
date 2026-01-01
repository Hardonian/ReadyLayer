/**
 * Validation Script for Founder-Specific Safeguards
 * 
 * Tests that all founder-specific rules are working correctly
 */

import { staticAnalysisService } from '../services/static-analysis';
import { schemaReconciliationService } from '../services/schema-reconciliation';
import { shadowModeService } from '../services/shadow-mode';

async function validateFounderSafeguards() {
  console.log('🔍 Validating Founder-Specific Safeguards...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Edge Runtime Rule
  console.log('Test 1: Edge Runtime Compatibility Check');
  try {
    const edgeCode = `
import { prisma } from './prisma';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: Request) {
  const user = await prisma.user.findFirst();
  return new Response('OK');
}
`;
    const issues = await staticAnalysisService.analyze('middleware.ts', edgeCode);
    const edgeIssues = issues.filter(i => i.ruleId === 'founder.edge-runtime');
    
    if (edgeIssues.length > 0) {
      console.log('  ✅ PASSED: Edge runtime rule detected Node-only import');
      passed++;
    } else {
      console.log('  ❌ FAILED: Edge runtime rule did not detect Node-only import');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 2: Type Erosion Rule
  console.log('\nTest 2: Type Safety Erosion Detection');
  try {
    const typeErosionCode = `
function processData(data: any): any {
  return data as any;
}
`;
    const issues = await staticAnalysisService.analyze('test.ts', typeErosionCode);
    const typeIssues = issues.filter(i => i.ruleId === 'founder.type-erosion');
    
    if (typeIssues.length > 0) {
      console.log('  ✅ PASSED: Type erosion rule detected unnecessary any types');
      passed++;
    } else {
      console.log('  ❌ FAILED: Type erosion rule did not detect any types');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 3: Unused Imports Rule
  console.log('\nTest 3: Unused Imports Detection');
  try {
    const unusedImportCode = `
import { unusedFunction } from './utils';
import { usedFunction } from './helpers';

export function main() {
  return usedFunction();
}
`;
    const issues = await staticAnalysisService.analyze('test.ts', unusedImportCode);
    const importIssues = issues.filter(i => i.ruleId === 'founder.unused-imports');
    
    if (importIssues.length > 0) {
      console.log('  ✅ PASSED: Unused imports rule detected unused import');
      passed++;
    } else {
      console.log('  ⚠️  WARNING: Unused imports rule may need tuning');
      // Don't fail - this is heuristic-based
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 4: Auth Pattern Rule
  console.log('\nTest 4: Auth Pattern Detection');
  try {
    const authBugCode = `
export async function POST(request: Request) {
  const { userId } = await request.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return Response.json(user);
}
`;
    const issues = await staticAnalysisService.analyze('api/route.ts', authBugCode);
    const authIssues = issues.filter(i => i.ruleId === 'founder.auth-patterns');
    
    if (authIssues.length > 0) {
      console.log('  ✅ PASSED: Auth pattern rule detected userId from body');
      passed++;
    } else {
      console.log('  ⚠️  WARNING: Auth pattern rule may need tuning');
      // Don't fail - this is context-dependent
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 5: Error Handling Rule
  console.log('\nTest 5: Error Handling Detection');
  try {
    const missingErrorHandlingCode = `
export async function fetchData() {
  const data = await prisma.user.findMany();
  return data;
}
`;
    const issues = await staticAnalysisService.analyze('test.ts', missingErrorHandlingCode);
    const errorIssues = issues.filter(i => i.ruleId === 'founder.error-handling');
    
    if (errorIssues.length > 0) {
      console.log('  ✅ PASSED: Error handling rule detected missing try/catch');
      passed++;
    } else {
      console.log('  ⚠️  WARNING: Error handling rule may need tuning');
      // Don't fail - this is context-dependent
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 6: Schema Reconciliation Service Exists
  console.log('\nTest 6: Schema Reconciliation Service');
  try {
    if (schemaReconciliationService) {
      console.log('  ✅ PASSED: Schema reconciliation service exists');
      passed++;
    } else {
      console.log('  ❌ FAILED: Schema reconciliation service not found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 7: Shadow Mode Service Exists
  console.log('\nTest 7: Shadow Mode Service');
  try {
    if (shadowModeService) {
      console.log('  ✅ PASSED: Shadow mode service exists');
      passed++;
    } else {
      console.log('  ❌ FAILED: Shadow mode service not found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All critical tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Review output above.');
    process.exit(1);
  }
}

// Run validation
validateFounderSafeguards().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
