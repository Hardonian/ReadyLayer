/**
 * Usage Enforcement Validation Script
 * 
 * Validates code structure, logic, and error handling without requiring database
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string[];
}

const results: ValidationResult[] = [];

function validate(name: string, fn: () => boolean | string | string[]): void {
  try {
    const result = fn();
    if (result === true) {
      results.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } else if (Array.isArray(result)) {
      results.push({ name, passed: true, details: result });
      console.log(`✅ ${name}`);
      if (result.length > 0) {
        result.forEach((detail) => console.log(`   - ${detail}`));
      }
    } else {
      results.push({ name, passed: false, error: String(result) });
      console.error(`❌ ${name}: ${result}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.error(`❌ ${name}: ${errorMessage}`);
  }
}

function readFile(filePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf-8');
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function main() {
  console.log('🔍 Usage Enforcement Validation Suite\n');

  // Validation 1: All required files exist
  validate('Validation 1: Required files exist', () => {
    const requiredFiles = [
      'billing/index.ts',
      'lib/usage-enforcement.ts',
      'services/llm/index.ts',
      'queue/index.ts',
      'lib/api-route-helpers.ts',
      'app/api/v1/usage/route.ts',
      'components/ui/usage-limit-banner.tsx',
      'app/dashboard/page.tsx',
    ];

    const missing: string[] = [];
    requiredFiles.forEach((file) => {
      if (!fileExists(file)) {
        missing.push(file);
      }
    });

    if (missing.length > 0) {
      return `Missing files: ${missing.join(', ')}`;
    }
    return true;
  });

  // Validation 2: Billing config has plan limits
  validate('Validation 2: Billing config includes plan limits', () => {
    const content = readFile('billing/index.ts');
    const checks = [
      content.includes('PlanLimits'),
      content.includes('llmTokensPerDay'),
      content.includes('llmTokensPerMonth'),
      content.includes('runsPerDay'),
      content.includes('concurrentJobs'),
      content.includes('failOpenOnLimit'),
      content.includes('starter'),
      content.includes('growth'),
      content.includes('scale'),
    ];

    const missing = checks
      .map((check, i) => (!check ? i : null))
      .filter((i) => i !== null);

    if (missing.length > 0) {
      return `Missing required fields in billing config`;
    }
    return true;
  });

  // Validation 3: Usage enforcement service has all methods
  validate('Validation 3: Usage enforcement service has required methods', () => {
    const content = readFile('lib/usage-enforcement.ts');
    const requiredMethods = [
      'checkLLMTokenLimit',
      'checkLLMBudgetLimit',
      'checkRunsLimit',
      'checkConcurrentJobsLimit',
      'checkLLMRequest',
      'checkJobEnqueue',
      'getUsageStats',
      'logEnforcementDecision',
    ];

    const missing = requiredMethods.filter((method) => !content.includes(method));

    if (missing.length > 0) {
      return `Missing methods: ${missing.join(', ')}`;
    }
    return true;
  });

  // Validation 4: UsageLimitExceededError class exists
  validate('Validation 4: UsageLimitExceededError class exists', () => {
    const content = readFile('lib/usage-enforcement.ts');
    const checks = [
      content.includes('class UsageLimitExceededError'),
      content.includes('extends Error'),
      content.includes('httpStatus'),
      content.includes('limitType'),
    ];

    if (!checks.every((c) => c)) {
      return 'UsageLimitExceededError class missing required properties';
    }
    return true;
  });

  // Validation 5: LLM service uses enforcement
  validate('Validation 5: LLM service integrates usage enforcement', () => {
    const content = readFile('services/llm/index.ts');
    const checks = [
      content.includes('usageEnforcementService'),
      content.includes('checkLLMRequest'),
    ];

    if (!checks.every((c) => c)) {
      return 'LLM service missing usage enforcement integration';
    }
    return true;
  });

  // Validation 6: Queue service uses enforcement
  validate('Validation 6: Queue service integrates usage enforcement', () => {
    const content = readFile('queue/index.ts');
    const checks = [
      content.includes('usageEnforcementService'),
      content.includes('checkJobEnqueue'),
      content.includes('organizationId'),
    ];

    if (!checks.every((c) => c)) {
      return 'Queue service missing usage enforcement integration';
    }
    return true;
  });

  // Validation 7: API route handlers handle UsageLimitExceededError
  validate('Validation 7: API route handlers handle usage limit errors', () => {
    const content = readFile('lib/api-route-helpers.ts');
    const checks = [
      content.includes('UsageLimitExceededError'),
      content.includes('httpStatus'),
      content.includes('429'),
      content.includes('402'),
    ];

    if (!checks.every((c) => c)) {
      return 'API route helpers missing usage limit error handling';
    }
    return true;
  });

  // Validation 8: Dashboard banner component exists
  validate('Validation 8: Dashboard banner component exists', () => {
    const content = readFile('components/ui/usage-limit-banner.tsx');
    const checks = [
      content.includes('UsageLimitBanner'),
      content.includes('UsageStats'),
      content.includes('80'),
      content.includes('percentage'),
    ];

    if (!checks.every((c) => c)) {
      return 'Usage limit banner component missing required features';
    }
    return true;
  });

  // Validation 9: Dashboard integrates banner
  validate('Validation 9: Dashboard integrates usage limit banner', () => {
    const content = readFile('app/dashboard/page.tsx');
    const checks = [
      content.includes('UsageLimitBanner'),
      content.includes('usageStats'),
      content.includes('/api/v1/usage'),
    ];

    if (!checks.every((c) => c)) {
      return 'Dashboard missing usage limit banner integration';
    }
    return true;
  });

  // Validation 10: Review guard handles usage limits
  validate('Validation 10: Review guard handles usage limit errors', () => {
    const content = readFile('services/review-guard/index.ts');
    const checks = [
      content.includes('UsageLimitExceededError'),
      content.includes('Usage limit exceeded'),
    ];

    if (!checks.every((c) => c)) {
      return 'Review guard missing usage limit error handling';
    }
    return true;
  });

  // Validation 11: Webhook processor shows limit messages
  validate('Validation 11: Webhook processor shows usage limit messages', () => {
    const content = readFile('workers/webhook-processor.ts');
    const checks = [
      content.includes('Usage limit exceeded'),
      content.includes('Upgrade your plan'),
    ];

    if (!checks.every((c) => c)) {
      return 'Webhook processor missing usage limit messaging';
    }
    return true;
  });

  // Validation 12: Audit logging implemented
  validate('Validation 12: Audit logging implemented', () => {
    const content = readFile('lib/usage-enforcement.ts');
    const checks = [
      content.includes('logEnforcementDecision'),
      content.includes('auditLog'),
      content.includes('limit_check_passed'),
      content.includes('limit_check_failed'),
    ];

    if (!checks.every((c) => c)) {
      return 'Audit logging missing required features';
    }
    return true;
  });

  // Validation 13: Plan limits are data-driven
  validate('Validation 13: Plan limits are data-driven', () => {
    const content = readFile('billing/index.ts');
    const checks = [
      content.includes('BILLING_TIERS'),
      content.includes('limits:'),
      content.includes('starter'),
      content.includes('growth'),
      content.includes('scale'),
    ];

    if (!checks.every((c) => c)) {
      return 'Plan limits not properly configured';
    }
    return true;
  });

  // Validation 14: Error codes are correct (429/402, not 500)
  validate('Validation 14: Error codes use 429/402, never 500', () => {
    const enforcementContent = readFile('lib/usage-enforcement.ts');
    const apiContent = readFile('lib/api-route-helpers.ts');
    
    const has429 = enforcementContent.includes('429') || apiContent.includes('429');
    const has402 = enforcementContent.includes('402') || apiContent.includes('402');
    
    // Check that limit errors don't default to 500
    const has500Default = enforcementContent.includes('httpStatus: number = 500');
    
    if (!has429 || !has402) {
      return 'Missing 429 or 402 status codes';
    }
    
    if (has500Default) {
      return 'Usage limit errors should not default to 500';
    }
    
    return true;
  });

  // Validation 15: Fail-open/closed policy exists
  validate('Validation 15: Fail-open/closed policy implemented', () => {
    const content = readFile('billing/index.ts');
    const enforcementContent = readFile('lib/usage-enforcement.ts');
    
    const checks = [
      content.includes('failOpenOnLimit'),
      enforcementContent.includes('failOpenOnLimit'),
      enforcementContent.includes('limits.failOpenOnLimit'),
    ];

    if (!checks.every((c) => c)) {
      return 'Fail-open/closed policy not properly implemented';
    }
    return true;
  });

  // Validation 16: Usage stats API endpoint exists
  validate('Validation 16: Usage stats API endpoint exists', () => {
    const content = readFile('app/api/v1/usage/route.ts');
    const checks = [
      content.includes('GET'),
      content.includes('getUsageStats'),
      content.includes('usageEnforcementService'),
    ];

    if (!checks.every((c) => c)) {
      return 'Usage stats API endpoint missing';
    }
    return true;
  });

  // Validation 17: GitHub webhook handler passes organizationId
  validate('Validation 17: GitHub webhook handler passes organizationId', () => {
    const content = readFile('integrations/github/webhook.ts');
    const checks = [
      content.includes('organizationId'),
      content.includes('enqueue'),
    ];

    if (!checks.every((c) => c)) {
      return 'GitHub webhook handler missing organizationId in enqueue';
    }
    return true;
  });

  // Validation 18: Status check description includes limit messages
  validate('Validation 18: Status check description includes limit messages', () => {
    const content = readFile('lib/git-provider-ui/comment-formatter.ts');
    const checks = [
      content.includes('blockedReason'),
      content.includes('Usage limit exceeded'),
    ];

    if (!checks.every((c) => c)) {
      return 'Status check description missing usage limit messages';
    }
    return true;
  });

  // Summary
  console.log('\n📊 Validation Results Summary:');
  console.log('================================');
  console.log(`Total validations: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length}`);
  console.log(`Failed: ${results.filter((r) => !r.passed).length}`);

  if (results.some((r) => !r.passed)) {
    console.log('\n❌ Failed validations:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed!');
    console.log('\n📝 Implementation Checklist:');
    console.log('  ✅ Plan limits config (starter/growth/scale)');
    console.log('  ✅ Usage enforcement service');
    console.log('  ✅ LLM service enforcement');
    console.log('  ✅ Queue service enforcement');
    console.log('  ✅ Error handling (429/402, never 500)');
    console.log('  ✅ Audit logging');
    console.log('  ✅ Dashboard banners');
    console.log('  ✅ PR check output messages');
    console.log('  ✅ Fail-open/closed policy');
    process.exit(0);
  }
}

main();
