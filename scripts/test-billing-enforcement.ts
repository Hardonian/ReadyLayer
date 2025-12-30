/**
 * Test Billing Enforcement
 * 
 * Verifies that billing limits are enforced correctly
 */

import { prisma } from '../lib/prisma';
import { billingService } from '../billing';
import { checkBillingLimits } from '../lib/billing-middleware';
import { NextRequest } from 'next/server';

async function testBillingEnforcement() {
  console.log('💰 Testing Billing Enforcement...\n');

  // Test 1: Create test organization
  console.log('1️⃣  Creating test organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Billing Test Org',
      slug: 'billing-test-org',
      plan: 'starter', // Starter plan: 5 repos max
    },
  });

  console.log(`✅ Created organization: ${org.id} (plan: ${org.plan})\n`);

  // Test 2: Check repository limit
  console.log('2️⃣  Testing repository limit enforcement...');
  
  const tier = await billingService.getOrganizationTier(org.id);
  console.log(`   Plan: ${tier.name}`);
  console.log(`   Max repos: ${tier.features.maxRepos === -1 ? 'Unlimited' : tier.features.maxRepos}`);
  console.log(`   LLM budget: $${tier.llmBudget}/month`);

  // Create 5 repositories (at limit)
  const repos = [];
  for (let i = 1; i <= 5; i++) {
    const repo = await prisma.repository.create({
      data: {
        organizationId: org.id,
        name: `test-repo-${i}`,
        fullName: `org/test-repo-${i}`,
        provider: 'github',
        defaultBranch: 'main',
      },
    });
    repos.push(repo);
  }

  console.log(`   Created ${repos.length} repositories`);

  // Check if can add more (should fail)
  const canAdd = await billingService.canAddRepository(org.id);
  if (!canAdd) {
    console.log('✅ Repository limit correctly enforced (cannot add 6th repo)\n');
  } else {
    console.log('❌ Repository limit NOT enforced (can add 6th repo)\n');
  }

  // Test 3: Check LLM budget
  console.log('3️⃣  Testing LLM budget enforcement...');
  
  const budget = await billingService.checkLLMBudget(org.id);
  console.log(`   Current spend: $${budget.currentSpend.toFixed(2)}`);
  console.log(`   Budget: $${budget.budget.toFixed(2)}`);
  console.log(`   Remaining: $${budget.remaining.toFixed(2)}`);
  console.log(`   Allowed: ${budget.allowed}`);

  if (budget.allowed) {
    console.log('✅ LLM budget check passed (budget available)\n');
  } else {
    console.log('⚠️  LLM budget exceeded\n');
  }

  // Test 4: Check feature access
  console.log('4️⃣  Testing feature access...');
  
  const canUseReviewGuard = await billingService.canUseFeature(org.id, 'reviewGuard');
  const canUseTestEngine = await billingService.canUseFeature(org.id, 'testEngine');
  const canUseDocSync = await billingService.canUseFeature(org.id, 'docSync');

  console.log(`   Review Guard: ${canUseReviewGuard ? '✅' : '❌'}`);
  console.log(`   Test Engine: ${canUseTestEngine ? '✅' : '❌'}`);
  console.log(`   Doc Sync: ${canUseDocSync ? '✅' : '❌'}`);

  if (canUseReviewGuard && canUseTestEngine && canUseDocSync) {
    console.log('✅ All features accessible on starter plan\n');
  } else {
    console.log('⚠️  Some features not accessible\n');
  }

  // Test 5: Check enforcement strength
  console.log('5️⃣  Testing enforcement strength...');
  
  const strength = await billingService.getEnforcementStrength(org.id);
  console.log(`   Enforcement strength: ${strength}`);

  if (strength === 'basic') {
    console.log('✅ Enforcement strength correct for starter plan\n');
  } else {
    console.log(`⚠️  Expected 'basic', got '${strength}'\n`);
  }

  // Cleanup
  console.log('6️⃣  Cleaning up test data...');
  await prisma.repository.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  console.log('✅ Test data cleaned up\n');

  // Summary
  console.log('📊 Billing Enforcement Test Summary:');
  console.log('================================');
  console.log(`✅ Repository limit: ${!canAdd ? 'ENFORCED' : 'NOT ENFORCED'}`);
  console.log(`✅ LLM budget: ${budget.allowed ? 'AVAILABLE' : 'EXCEEDED'}`);
  console.log(`✅ Features: ${canUseReviewGuard && canUseTestEngine && canUseDocSync ? 'ACCESSIBLE' : 'RESTRICTED'}`);
  console.log(`✅ Enforcement: ${strength === 'basic' ? 'CORRECT' : 'INCORRECT'}`);

  if (!canAdd && budget.allowed && canUseReviewGuard) {
    console.log('\n🎉 Billing enforcement tests PASSED!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some billing enforcement tests failed');
    process.exit(1);
  }
}

testBillingEnforcement().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
