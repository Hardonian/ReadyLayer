import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDemoData(): Promise<void> {
  const {
    DEMO_IDS,
    demoOrganization,
    demoUser,
    demoRepository,
    demoRun,
    DEMO_SEED_SUMMARY,
  } = await import('../content/demo/seedData')

  console.log('Seeding demo mode data...')

  // Upsert organization
  await prisma.organization.upsert({
    where: { id: DEMO_IDS.organizationId },
    update: {},
    create: {
      id: demoOrganization.id,
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
  })

  // Upsert user
  await prisma.user.upsert({
    where: { id: DEMO_IDS.userId },
    update: {},
    create: {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
    },
  })

  // Upsert organization membership
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: DEMO_IDS.organizationId,
        userId: DEMO_IDS.userId,
      },
    },
    update: {},
    create: {
      organizationId: DEMO_IDS.organizationId,
      userId: DEMO_IDS.userId,
      role: 'admin',
    },
  })

  // Upsert repository
  await prisma.repository.upsert({
    where: { id: DEMO_IDS.repositoryId },
    update: {},
    create: {
      id: demoRepository.id,
      organizationId: demoRepository.organizationId,
      name: demoRepository.name,
      fullName: demoRepository.fullName,
      provider: demoRepository.provider,
      defaultBranch: demoRepository.defaultBranch,
    },
  })

  // Upsert demo run
  await prisma.readyLayerRun.upsert({
    where: { id: DEMO_IDS.runId },
    update: {},
    create: {
      id: demoRun.id,
      correlationId: demoRun.correlationId,
      repositoryId: demoRun.repositoryId,
      sandboxId: demoRun.sandboxId,
      trigger: demoRun.trigger,
      triggerMetadata: demoRun.triggerMetadata,
      status: demoRun.status,
      conclusion: demoRun.conclusion,
      reviewGuardStatus: demoRun.reviewGuardStatus,
      testEngineStatus: demoRun.testEngineStatus,
      docSyncStatus: demoRun.docSyncStatus,
      gatesPassed: demoRun.gatesPassed,
      gatesFailed: demoRun.gatesFailed,
      startedAt: demoRun.startedAt,
      completedAt: demoRun.completedAt,
    },
  })

  console.log('Demo seed complete:', DEMO_SEED_SUMMARY)
}

async function main(): Promise<void> {
  // ReadyLayer seed data
  console.log('ReadyLayer seed completed')

  if (process.env.DEMO_MODE_ENABLED === 'true') {
    await seedDemoData()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
