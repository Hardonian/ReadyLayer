/**
 * Usage Enforcement Test Suite
 * 
 * Simulates all recommended test scenarios and validates results
 */

import { prisma } from '../lib/prisma';
import { usageEnforcementService, LimitType } from '../lib/usage-enforcement';
import { billingService } from '../billing';
import { llmService } from '../services/llm';
import { queueService } from '../queue';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.error(`❌ ${name}: ${errorMessage}`);
    throw error; // Re-throw to stop on first failure
  }
}

async function cleanup() {
  // Clean up test data
  const testOrgId = 'test-org-usage-enforcement';
  
  try {
    // Delete test organization and related data
    await prisma.auditLog.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.costTracking.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.job.deleteMany({
      where: { repository: { organizationId: testOrgId } },
    });
    await prisma.review.deleteMany({
      where: { repository: { organizationId: testOrgId } },
    });
    await prisma.test.deleteMany({
      where: { repository: { organizationId: testOrgId } },
    });
    await prisma.repository.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.subscription.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.organization.deleteMany({
      where: { id: testOrgId },
    });
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

async function setupTestOrg() {
  const testOrgId = 'test-org-usage-enforcement';
  const testUserId = 'test-user-usage-enforcement';

  // Create test user if not exists
  await prisma.user.upsert({
    where: { id: testUserId },
    create: {
      id: testUserId,
      email: 'test-usage@readylayer.com',
      name: 'Test User',
    },
    update: {},
  });

  // Create test organization
  await prisma.organization.upsert({
    where: { id: testOrgId },
    create: {
      id: testOrgId,
      name: 'Test Usage Enforcement Org',
      slug: 'test-usage-enforcement',
      plan: 'starter',
    },
    update: {
      plan: 'starter',
    },
  });

  // Create membership
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: testOrgId,
        userId: testUserId,
      },
    },
    create: {
      organizationId: testOrgId,
      userId: testUserId,
      role: 'owner',
    },
    update: {},
  });

  // Create active subscription
  await prisma.subscription.upsert({
    where: { organizationId: testOrgId },
    create: {
      organizationId: testOrgId,
      userId: testUserId,
      plan: 'starter',
      status: 'active',
    },
    update: {
      plan: 'starter',
      status: 'active',
    },
  });

  // Create test repository
  const repo = await prisma.repository.upsert({
    where: {
      fullName_provider: {
        fullName: 'test/test-repo',
        provider: 'github',
      },
    },
    create: {
      organizationId: testOrgId,
      name: 'test-repo',
      fullName: 'test/test-repo',
      provider: 'github',
      defaultBranch: 'main',
    },
    update: {},
  });

  return { orgId: testOrgId, userId: testUserId, repoId: repo.id };
}

async function main() {
  console.log('🧪 Usage Enforcement Test Suite\n');

  let testData: { orgId: string; userId: string; repoId: string };

  try {
    // Setup
    console.log('📋 Setting up test environment...');
    testData = await setupTestOrg();
    console.log(`✅ Created test org: ${testData.orgId}\n`);

    // Test 1: Starter plan token limits
    await test('Test 1: Starter plan LLM token daily limit', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const dailyLimit = tier.limits.llmTokensPerDay;

      // Set today's usage to 95% of limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usageAmount = Math.floor(dailyLimit * 0.95);

      await prisma.costTracking.upsert({
        where: {
          organizationId_date_service_provider: {
            organizationId: testData.orgId,
            date: today,
            service: 'llm',
            provider: 'openai',
          },
        },
        update: {
          units: usageAmount,
          amount: usageAmount * 0.00001, // Approximate cost
        },
        create: {
          organizationId: testData.orgId,
          date: today,
          service: 'llm',
          provider: 'openai',
          units: usageAmount,
          amount: usageAmount * 0.00001,
        },
      });

      // Try to request tokens that would exceed limit
      const requestedTokens = Math.floor(dailyLimit * 0.1); // 10% more
      const result = await usageEnforcementService.checkLLMTokenLimit(
        testData.orgId,
        requestedTokens
      );

      if (result.allowed) {
        throw new Error('Expected limit to be exceeded but it was allowed');
      }

      if (result.limitType !== LimitType.LLM_TOKENS_DAILY) {
        throw new Error(`Expected limit type LLM_TOKENS_DAILY, got ${result.limitType}`);
      }

      if (!result.message.includes('Daily LLM token limit exceeded')) {
        throw new Error('Message should indicate daily limit exceeded');
      }
    });

    // Test 2: Concurrent jobs limit
    await test('Test 2: Concurrent jobs limit enforcement', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const concurrentLimit = tier.limits.concurrentJobs;

      // Create jobs up to the limit
      const jobs = [];
      for (let i = 0; i < concurrentLimit; i++) {
        const job = await prisma.job.create({
          data: {
            type: 'test',
            status: 'processing',
            payload: { test: true },
            repositoryId: testData.repoId,
            userId: testData.userId,
          },
        });
        jobs.push(job.id);
      }

      try {
        // Try to enqueue another job (should fail)
        await usageEnforcementService.checkConcurrentJobsLimit(testData.orgId);
        const result = await usageEnforcementService.checkConcurrentJobsLimit(testData.orgId);

        if (result.allowed) {
          throw new Error('Expected concurrent jobs limit to be exceeded');
        }

        if (result.current !== concurrentLimit) {
          throw new Error(`Expected ${concurrentLimit} concurrent jobs, got ${result.current}`);
        }
      } finally {
        // Cleanup jobs
        await prisma.job.deleteMany({
          where: { id: { in: jobs } },
        });
      }
    });

    // Test 3: Daily runs limit
    await test('Test 3: Daily runs limit enforcement', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const runsLimit = tier.limits.runsPerDay;

      // Create reviews up to the limit
      const reviews = [];
      const today = new Date();
      for (let i = 0; i < runsLimit; i++) {
        const review = await prisma.review.create({
          data: {
            repositoryId: testData.repoId,
            prNumber: 1000 + i,
            prSha: `sha-${i}`,
            status: 'completed',
            issuesFound: [],
            summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
            createdAt: today,
          },
        });
        reviews.push(review.id);
      }

      try {
        const result = await usageEnforcementService.checkRunsLimit(testData.orgId);

        if (result.allowed) {
          throw new Error('Expected runs limit to be exceeded');
        }

        if (result.current !== runsLimit) {
          throw new Error(`Expected ${runsLimit} runs today, got ${result.current}`);
        }

        if (!result.message.includes('Daily runs limit exceeded')) {
          throw new Error('Message should indicate daily runs limit exceeded');
        }
      } finally {
        // Cleanup reviews
        await prisma.review.deleteMany({
          where: { id: { in: reviews } },
        });
      }
    });

    // Test 4: LLM request with limit exceeded
    await test('Test 4: LLM service rejects when limit exceeded', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const dailyLimit = tier.limits.llmTokensPerDay;

      // Set usage to exceed limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.costTracking.upsert({
        where: {
          organizationId_date_service_provider: {
            organizationId: testData.orgId,
            date: today,
            service: 'llm',
            provider: 'openai',
          },
        },
        update: {
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
        create: {
          organizationId: testData.orgId,
          date: today,
          service: 'llm',
          provider: 'openai',
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
      });

      try {
        await llmService.complete({
          prompt: 'Test prompt',
          organizationId: testData.orgId,
          userId: testData.userId,
          maxTokens: 1000,
        });
        throw new Error('Expected LLM request to be rejected');
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('Usage limit exceeded'))) {
          throw error;
        }
        // Expected error
      }
    });

    // Test 5: Queue enqueue with limit exceeded
    await test('Test 5: Queue enqueue rejects when limit exceeded', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const runsLimit = tier.limits.runsPerDay;

      // Create reviews up to limit
      const reviews = [];
      const today = new Date();
      for (let i = 0; i < runsLimit; i++) {
        const review = await prisma.review.create({
          data: {
            repositoryId: testData.repoId,
            prNumber: 2000 + i,
            prSha: `sha-enqueue-${i}`,
            status: 'completed',
            issuesFound: [],
            summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
            createdAt: today,
          },
        });
        reviews.push(review.id);
      }

      try {
        await queueService.enqueue('webhook', {
          type: 'review',
          data: { repositoryId: testData.repoId },
          organizationId: testData.orgId,
          userId: testData.userId,
        });
        throw new Error('Expected queue enqueue to be rejected');
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('Usage limit exceeded'))) {
          throw error;
        }
        // Expected error
      } finally {
        await prisma.review.deleteMany({
          where: { id: { in: reviews } },
        });
      }
    });

    // Test 6: Audit log creation
    await test('Test 6: Audit logs created for enforcement decisions', async () => {
      const beforeCount = await prisma.auditLog.count({
        where: {
          organizationId: testData.orgId,
          action: { in: ['limit_check_passed', 'limit_check_failed'] },
        },
      });

      // Trigger a limit check
      await usageEnforcementService.checkLLMRequest(
        testData.orgId,
        testData.userId,
        1000
      );

      const afterCount = await prisma.auditLog.count({
        where: {
          organizationId: testData.orgId,
          action: { in: ['limit_check_passed', 'limit_check_failed'] },
        },
      });

      if (afterCount <= beforeCount) {
        throw new Error('Expected audit log to be created');
      }

      // Verify audit log content
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: testData.orgId,
          action: { in: ['limit_check_passed', 'limit_check_failed'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!auditLog) {
        throw new Error('Audit log not found');
      }

      if (!auditLog.details || typeof auditLog.details !== 'object') {
        throw new Error('Audit log details should be an object');
      }

      const details = auditLog.details as any;
      if (!details.limitType || !details.current || !details.limit) {
        throw new Error('Audit log missing required fields');
      }
    });

    // Test 7: Usage stats API
    await test('Test 7: Usage stats API returns correct data', async () => {
      const stats = await usageEnforcementService.getUsageStats(testData.orgId);

      if (!stats.llmTokens || !stats.runs || !stats.concurrentJobs || !stats.budget) {
        throw new Error('Usage stats missing required fields');
      }

      if (typeof stats.llmTokens.daily !== 'number') {
        throw new Error('LLM tokens daily should be a number');
      }

      if (typeof stats.runs.today !== 'number') {
        throw new Error('Runs today should be a number');
      }

      if (typeof stats.concurrentJobs.current !== 'number') {
        throw new Error('Concurrent jobs current should be a number');
      }

      if (typeof stats.budget.current !== 'number') {
        throw new Error('Budget current should be a number');
      }
    });

    // Test 8: Error response codes (429/402)
    await test('Test 8: Usage limit errors return correct HTTP status codes', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const dailyLimit = tier.limits.llmTokensPerDay;

      // Set usage to exceed limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.costTracking.upsert({
        where: {
          organizationId_date_service_provider: {
            organizationId: testData.orgId,
            date: today,
            service: 'llm',
            provider: 'openai',
          },
        },
        update: {
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
        create: {
          organizationId: testData.orgId,
          date: today,
          service: 'llm',
          provider: 'openai',
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
      });

      try {
        await usageEnforcementService.checkLLMRequest(
          testData.orgId,
          testData.userId,
          1000
        );
        throw new Error('Expected limit check to fail');
      } catch (error) {
        if (!(error instanceof Error && 'httpStatus' in error)) {
          throw new Error('Expected UsageLimitExceededError with httpStatus');
        }

        const limitError = error as any;
        if (limitError.httpStatus !== 429 && limitError.httpStatus !== 402) {
          throw new Error(`Expected HTTP status 429 or 402, got ${limitError.httpStatus}`);
        }
      }
    });

    // Test 9: Fail-open behavior (scale plan)
    await test('Test 9: Scale plan fail-open behavior', async () => {
      // Upgrade to scale plan
      await prisma.subscription.update({
        where: { organizationId: testData.orgId },
        data: { plan: 'scale', status: 'active' },
      });

      const tier = await billingService.getOrganizationTier(testData.orgId);
      if (!tier.limits.failOpenOnLimit) {
        throw new Error('Scale plan should have failOpenOnLimit = true');
      }

      // Set usage to exceed limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyLimit = tier.limits.llmTokensPerDay;
      await prisma.costTracking.upsert({
        where: {
          organizationId_date_service_provider: {
            organizationId: testData.orgId,
            date: today,
            service: 'llm',
            provider: 'openai',
          },
        },
        update: {
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
        create: {
          organizationId: testData.orgId,
          date: today,
          service: 'llm',
          provider: 'openai',
          units: dailyLimit + 1000,
          amount: (dailyLimit + 1000) * 0.00001,
        },
      });

      // Check should return allowed=true even when limit exceeded (fail-open)
      const result = await usageEnforcementService.checkLLMTokenLimit(
        testData.orgId,
        1000
      );

      if (!result.allowed) {
        throw new Error('Scale plan should allow requests even when limit exceeded (fail-open)');
      }

      // Restore starter plan
      await prisma.subscription.update({
        where: { organizationId: testData.orgId },
        data: { plan: 'starter', status: 'active' },
      });
    });

    // Test 10: Dashboard banner threshold (80%)
    await test('Test 10: Usage stats show warnings at 80% threshold', async () => {
      const tier = await billingService.getOrganizationTier(testData.orgId);
      const dailyLimit = tier.limits.llmTokensPerDay;

      // Set usage to 85% of limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usageAmount = Math.floor(dailyLimit * 0.85);

      await prisma.costTracking.upsert({
        where: {
          organizationId_date_service_provider: {
            organizationId: testData.orgId,
            date: today,
            service: 'llm',
            provider: 'openai',
          },
        },
        update: {
          units: usageAmount,
          amount: usageAmount * 0.00001,
        },
        create: {
          organizationId: testData.orgId,
          date: today,
          service: 'llm',
          provider: 'openai',
          units: usageAmount,
          amount: usageAmount * 0.00001,
        },
      });

      const stats = await usageEnforcementService.getUsageStats(testData.orgId);
      const percentage = (stats.llmTokens.daily / stats.llmTokens.limits.daily) * 100;

      if (percentage < 80) {
        throw new Error(`Expected usage >= 80%, got ${percentage.toFixed(1)}%`);
      }

      // Verify stats are correct
      if (stats.llmTokens.daily !== usageAmount) {
        throw new Error(`Expected daily usage ${usageAmount}, got ${stats.llmTokens.daily}`);
      }
    });

    console.log('\n📊 Test Results Summary:');
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${results.filter((r) => r.passed).length}`);
    console.log(`Failed: ${results.filter((r) => !r.passed).length}`);

    if (results.some((r) => !r.passed)) {
      console.log('\n❌ Failed tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    console.log('\n🧹 Cleaning up test data...');
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
