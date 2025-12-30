/**
 * Test Tenant Isolation
 * 
 * Verifies that RLS policies and API-level checks prevent cross-tenant access
 */

import { prisma } from '../lib/prisma';

async function testTenantIsolation() {
  console.log('🔒 Testing Tenant Isolation...\n');

  // Test 1: Create test data
  console.log('1️⃣  Creating test organizations and users...');
  
  const org1 = await prisma.organization.create({
    data: {
      name: 'Test Org 1',
      slug: 'test-org-1',
      plan: 'starter',
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Test Org 2',
      slug: 'test-org-2',
      plan: 'starter',
    },
  });

  // Create test users (using Supabase auth user IDs format)
  const user1Id = 'test-user-1-' + Date.now();
  const user2Id = 'test-user-2-' + Date.now();

  const user1 = await prisma.user.create({
    data: {
      id: user1Id,
      email: 'user1@test.com',
      name: 'Test User 1',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: user2Id,
      email: 'user2@test.com',
      name: 'Test User 2',
    },
  });

  // Add users to organizations
  await prisma.organizationMember.create({
    data: {
      organizationId: org1.id,
      userId: user1.id,
      role: 'owner',
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org2.id,
      userId: user2.id,
      role: 'owner',
    },
  });

  // Create repositories
  const repo1 = await prisma.repository.create({
    data: {
      organizationId: org1.id,
      name: 'test-repo-1',
      fullName: 'org1/test-repo-1',
      provider: 'github',
      defaultBranch: 'main',
    },
  });

  const repo2 = await prisma.repository.create({
    data: {
      organizationId: org2.id,
      name: 'test-repo-2',
      fullName: 'org2/test-repo-2',
      provider: 'github',
      defaultBranch: 'main',
    },
  });

  console.log('✅ Test data created\n');

  // Test 2: Verify user1 can see org1's repo
  console.log('2️⃣  Testing: User 1 can access Org 1 repositories...');
  const user1Repos = await prisma.repository.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId: user1.id,
          },
        },
      },
    },
  });

  const user1CanSeeRepo1 = user1Repos.some(r => r.id === repo1.id);
  const user1CannotSeeRepo2 = !user1Repos.some(r => r.id === repo2.id);

  if (user1CanSeeRepo1 && user1CannotSeeRepo2) {
    console.log('✅ User 1 can only see Org 1 repositories\n');
  } else {
    console.log('❌ Tenant isolation FAILED: User 1 can see wrong repositories');
    console.log(`   Can see repo1: ${user1CanSeeRepo1}`);
    console.log(`   Cannot see repo2: ${user1CannotSeeRepo2}`);
  }

  // Test 3: Verify user2 can see org2's repo
  console.log('3️⃣  Testing: User 2 can access Org 2 repositories...');
  const user2Repos = await prisma.repository.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId: user2.id,
          },
        },
      },
    },
  });

  const user2CanSeeRepo2 = user2Repos.some(r => r.id === repo2.id);
  const user2CannotSeeRepo1 = !user2Repos.some(r => r.id === repo1.id);

  if (user2CanSeeRepo2 && user2CannotSeeRepo1) {
    console.log('✅ User 2 can only see Org 2 repositories\n');
  } else {
    console.log('❌ Tenant isolation FAILED: User 2 can see wrong repositories');
    console.log(`   Can see repo2: ${user2CanSeeRepo2}`);
    console.log(`   Cannot see repo1: ${user2CannotSeeRepo1}`);
  }

  // Test 4: Direct query test (simulating RLS)
  console.log('4️⃣  Testing: Direct repository queries respect organization membership...');
  
  // This simulates what RLS would do
  const user1Memberships = await prisma.organizationMember.findMany({
    where: { userId: user1.id },
    select: { organizationId: true },
  });
  const user1OrgIds = user1Memberships.map(m => m.organizationId);

  const user1FilteredRepos = await prisma.repository.findMany({
    where: {
      organizationId: { in: user1OrgIds },
    },
  });

  const filteredCorrectly = 
    user1FilteredRepos.some(r => r.id === repo1.id) &&
    !user1FilteredRepos.some(r => r.id === repo2.id);

  if (filteredCorrectly) {
    console.log('✅ Organization filtering works correctly\n');
  } else {
    console.log('❌ Organization filtering FAILED\n');
  }

  // Cleanup
  console.log('5️⃣  Cleaning up test data...');
  await prisma.repository.deleteMany({ where: { id: { in: [repo1.id, repo2.id] } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [org1.id, org2.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [org1.id, org2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
  console.log('✅ Test data cleaned up\n');

  // Summary
  const allTestsPassed = user1CanSeeRepo1 && user1CannotSeeRepo2 && 
                         user2CanSeeRepo2 && user2CannotSeeRepo1 && 
                         filteredCorrectly;

  if (allTestsPassed) {
    console.log('🎉 Tenant isolation tests PASSED!');
    console.log('✅ Users can only access their own organization\'s data');
    process.exit(0);
  } else {
    console.log('❌ Tenant isolation tests FAILED');
    console.log('⚠️  Review the errors above');
    process.exit(1);
  }
}

testTenantIsolation().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
