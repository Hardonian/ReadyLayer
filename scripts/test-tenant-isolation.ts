/**
 * Database-backed tenant query-scope verification.
 *
 * This test proves the application query pattern does not return another
 * organization's repositories. It does not claim to validate Supabase RLS;
 * deployment-specific RLS is covered by the database verification runbook.
 */

import { prisma } from '../lib/prisma'
import { console } from './logger'

function assertCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function testTenantIsolation(): Promise<void> {
  console.log('Testing database-backed tenant query scope...')

  if (!process.env.DATABASE_URL) {
    const message = 'Tenant query-scope test requires DATABASE_URL'
    if (process.env.REQUIRE_DATABASE_TESTS === 'true') throw new Error(message)
    console.log(`Skipping: ${message}`)
    return
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const organizationIds: string[] = []
  const userIds: string[] = []
  const repositoryIds: string[] = []

  try {
    const [org1, org2] = await Promise.all([
      prisma.organization.create({ data: { name: 'Tenant Scope A', slug: `tenant-scope-a-${suffix}`, plan: 'starter' } }),
      prisma.organization.create({ data: { name: 'Tenant Scope B', slug: `tenant-scope-b-${suffix}`, plan: 'starter' } }),
    ])
    organizationIds.push(org1.id, org2.id)

    const [user1, user2] = await Promise.all([
      prisma.user.create({ data: { id: `tenant-user-a-${suffix}`, email: `tenant-a-${suffix}@example.invalid` } }),
      prisma.user.create({ data: { id: `tenant-user-b-${suffix}`, email: `tenant-b-${suffix}@example.invalid` } }),
    ])
    userIds.push(user1.id, user2.id)

    await Promise.all([
      prisma.organizationMember.create({ data: { organizationId: org1.id, userId: user1.id, role: 'owner' } }),
      prisma.organizationMember.create({ data: { organizationId: org2.id, userId: user2.id, role: 'owner' } }),
    ])

    const [repo1, repo2] = await Promise.all([
      prisma.repository.create({
        data: {
          organizationId: org1.id,
          name: 'tenant-scope-a',
          fullName: `tenant-a-${suffix}/repository`,
          provider: 'github',
          defaultBranch: 'main',
        },
      }),
      prisma.repository.create({
        data: {
          organizationId: org2.id,
          name: 'tenant-scope-b',
          fullName: `tenant-b-${suffix}/repository`,
          provider: 'github',
          defaultBranch: 'main',
        },
      }),
    ])
    repositoryIds.push(repo1.id, repo2.id)

    const repositoriesFor = async (userId: string): Promise<Array<{ id: string }>> => {
      return prisma.repository.findMany({
        where: { organization: { members: { some: { userId } } } },
        select: { id: true },
      })
    }

    const [user1Repos, user2Repos] = await Promise.all([
      repositoriesFor(user1.id),
      repositoriesFor(user2.id),
    ])

    assertCondition(user1Repos.some((repository) => repository.id === repo1.id), 'Tenant A cannot read its repository')
    assertCondition(!user1Repos.some((repository) => repository.id === repo2.id), 'Tenant A can read Tenant B repository')
    assertCondition(user2Repos.some((repository) => repository.id === repo2.id), 'Tenant B cannot read its repository')
    assertCondition(!user2Repos.some((repository) => repository.id === repo1.id), 'Tenant B can read Tenant A repository')

    const user1Memberships = await prisma.organizationMember.findMany({
      where: { userId: user1.id },
      select: { organizationId: true },
    })
    const explicitlyScopedRepositories = await prisma.repository.findMany({
      where: { organizationId: { in: user1Memberships.map((membership) => membership.organizationId) } },
      select: { id: true },
    })

    assertCondition(
      explicitlyScopedRepositories.length === 1 && explicitlyScopedRepositories[0]?.id === repo1.id,
      'Explicit organization scope returned cross-tenant data'
    )

    console.log('Tenant query-scope verification passed')
  } finally {
    if (repositoryIds.length > 0) await prisma.repository.deleteMany({ where: { id: { in: repositoryIds } } })
    if (organizationIds.length > 0) {
      await prisma.organizationMember.deleteMany({ where: { organizationId: { in: organizationIds } } })
      await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } })
    }
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
}

testTenantIsolation()
  .catch((error: unknown) => {
    console.error('Tenant query-scope verification failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
