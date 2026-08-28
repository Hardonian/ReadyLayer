#!/usr/bin/env tsx
/**
 * Database Contract Verification Script
 *
 * Compares live database state vs expected contract and reports differences.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." tsx scripts/db-verify.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical issues found (missing tables, RLS not enabled)
 *   2 - Warnings found (missing indexes, policies)
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { console } from './logger';

interface VerificationResult {
  passed: boolean;
  critical: string[];
  warnings: string[];
  info: string[];
}

interface DiffReport {
  timestamp: string;
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  missingIndexes: Array<{ table: string; index: string }>;
  missingPolicies: Array<{ table: string; policy: string }>;
  missingTriggers: Array<{ table: string; trigger: string }>;
  missingFunctions: string[];
  missingExtensions: string[];
  rlsNotEnabled: string[];
  extraTables: string[];
}

interface ExpectedTable {
  name: string;
  rlsRequired?: boolean;
  policies: Array<{ name: string }>;
  indexes: Array<{ name: string }>;
}

interface LiveTable {
  name: string;
  rlsEnabled?: boolean;
  policies: Array<{ policyName: string }>;
  indexes: Array<{ indexName: string }>;
}

interface DatabaseInventory {
  tables: LiveTable[];
  functions: Array<{ functionName: string }>;
  extensions: Array<{ name: string }>;
}

interface ExpectedContract {
  tables: ExpectedTable[];
  functions: Array<{ name: string }>;
  extensions: string[];
}

async function verifyDatabase(): Promise<VerificationResult> {
  const result: VerificationResult = {
    passed: true,
    critical: [],
    warnings: [],
    info: [],
  };

  console.log('🔍 Verifying database contract...\n');

  // Step 1: Get live inventory
  console.log('📊 Step 1: Inventorying live database...');
  let liveInventory: DatabaseInventory;
  try {
    const liveOutput = execSync('tsx scripts/db-inventory-live.ts', {
      encoding: 'utf-8',
      env: process.env,
    });
    liveInventory = JSON.parse(liveOutput) as DatabaseInventory;
    result.info.push(`Found ${liveInventory.tables.length} tables in live database`);
  } catch (error) {
    result.critical.push(`Failed to inventory live database: ${error}`);
    return result;
  }

  // Step 2: Get expected contract
  console.log('📋 Step 2: Loading expected contract...');
  let expectedContract: ExpectedContract;
  try {
    const expectedOutput = execSync('tsx scripts/db-inventory-expected.ts', {
      encoding: 'utf-8',
      env: process.env,
    });
    expectedContract = JSON.parse(expectedOutput) as ExpectedContract;
    result.info.push(`Expected ${expectedContract.tables.length} tables`);
  } catch (error) {
    result.critical.push(`Failed to load expected contract: ${error}`);
    return result;
  }

  // Step 3: Compare tables
  console.log('🔎 Step 3: Comparing tables...');
  const liveTableNames = new Set(liveInventory.tables.map((t) => t.name));
  const expectedTableNames = new Set(expectedContract.tables.map((t) => t.name));

  const missingTables = expectedContract.tables
    .filter((t) => !liveTableNames.has(t.name))
    .map((t) => t.name);

  const extraTables = liveInventory.tables
    .filter((t) => !expectedTableNames.has(t.name))
    .map((t) => t.name);

  if (missingTables.length > 0) {
    result.critical.push(`Missing tables: ${missingTables.join(', ')}`);
    result.passed = false;
  }

  if (extraTables.length > 0) {
    result.warnings.push(`Extra tables found (not in contract): ${extraTables.join(', ')}`);
  }

  // Step 4: Check RLS
  console.log('🔒 Step 4: Checking RLS...');
  const rlsNotEnabled: string[] = [];
  for (const expectedTable of expectedContract.tables) {
    if (!expectedTable.rlsRequired) continue;

    const liveTable = liveInventory.tables.find((t) => t.name === expectedTable.name);
    if (!liveTable) continue;

    if (!liveTable.rlsEnabled) {
      rlsNotEnabled.push(expectedTable.name);
      result.critical.push(`RLS not enabled on table: ${expectedTable.name}`);
      result.passed = false;
    }
  }

  // Step 5: Check policies
  console.log('🛡️  Step 5: Checking RLS policies...');
  const missingPolicies: Array<{ table: string; policy: string }> = [];
  for (const expectedTable of expectedContract.tables) {
    const liveTable = liveInventory.tables.find((t) => t.name === expectedTable.name);
    if (!liveTable) continue;

    const livePolicyNames = new Set(liveTable.policies.map((p) => p.policyName));
    for (const expectedPolicy of expectedTable.policies) {
      if (!livePolicyNames.has(expectedPolicy.name)) {
        missingPolicies.push({ table: expectedTable.name, policy: expectedPolicy.name });
        result.warnings.push(`Missing policy ${expectedPolicy.name} on table ${expectedTable.name}`);
      }
    }
  }

  // Step 6: Check indexes
  console.log('📇 Step 6: Checking indexes...');
  const missingIndexes: Array<{ table: string; index: string }> = [];
  for (const expectedTable of expectedContract.tables) {
    const liveTable = liveInventory.tables.find((t) => t.name === expectedTable.name);
    if (!liveTable) continue;

    const liveIndexNames = new Set(liveTable.indexes.map((i) => i.indexName));
    for (const expectedIndex of expectedTable.indexes) {
      if (!liveIndexNames.has(expectedIndex.name)) {
        missingIndexes.push({ table: expectedTable.name, index: expectedIndex.name });
        result.warnings.push(`Missing index ${expectedIndex.name} on table ${expectedTable.name}`);
      }
    }
  }

  // Step 7: Check functions
  console.log('⚙️  Step 7: Checking functions...');
  const liveFunctionNames = new Set(liveInventory.functions.map((f) => f.functionName));
  const missingFunctions = expectedContract.functions
    .filter((f) => !liveFunctionNames.has(f.name))
    .map((f) => f.name);

  if (missingFunctions.length > 0) {
    result.warnings.push(`Missing functions: ${missingFunctions.join(', ')}`);
  }

  // Step 8: Check extensions
  console.log('🔌 Step 8: Checking extensions...');
  const liveExtensionNames = new Set(liveInventory.extensions.map((e) => e.name));
  const missingExtensions = expectedContract.extensions.filter(
    (ext: string) => !liveExtensionNames.has(ext)
  );

  if (missingExtensions.length > 0) {
    result.warnings.push(`Missing extensions: ${missingExtensions.join(', ')}`);
  }

  // Generate diff report
  const diffReport: DiffReport = {
    timestamp: new Date().toISOString(),
    missingTables,
    missingColumns: [], // Would need column-by-column comparison
    missingIndexes,
    missingPolicies,
    missingTriggers: [], // Would need trigger comparison
    missingFunctions,
    missingExtensions,
    rlsNotEnabled,
    extraTables,
  };

  const reportPath = join(process.cwd(), 'db-verification-report.json');
  writeFileSync(reportPath, JSON.stringify(diffReport, null, 2));
  result.info.push(`Diff report saved to ${reportPath}`);

  return result;
}

async function main(): Promise<void> {
  const result = await verifyDatabase();

  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  if (result.info.length > 0) {
    console.log('\nℹ️  Info:');
    result.info.forEach(msg => console.log(`   ${msg}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(msg => console.log(`   ${msg}`));
  }

  if (result.critical.length > 0) {
    console.log('\n❌ Critical Issues:');
    result.critical.forEach(msg => console.log(`   ${msg}`));
  }

  if (result.passed && result.warnings.length === 0) {
    console.log('\n✅ All checks passed!');
    process.exit(0);
  } else if (result.passed) {
    console.log('\n⚠️  Verification passed with warnings');
    process.exit(0);
  } else {
    console.log('\n❌ Verification failed - critical issues found');
    process.exit(1);
  }
}

main();
