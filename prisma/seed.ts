import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed badges
  const securityBadge = await prisma.badge.upsert({
    where: { code: 'security_sentinel' },
    update: {},
    create: {
      code: 'security_sentinel',
      name: 'Security Sentinel',
      description: 'Caught 100+ security vulnerabilities',
      category: 'security',
      tier: 'gold',
      icon: '🔒',
      color: '#FFD700',
      criteria: {
        securityIssuesCaught: 100,
      },
    },
  })

  const qualityBadge = await prisma.badge.upsert({
    where: { code: 'code_quality_master' },
    update: {},
    create: {
      code: 'code_quality_master',
      name: 'Code Quality Master',
      description: 'Maintained 95%+ code quality score for 30 days',
      category: 'quality',
      tier: 'gold',
      icon: '⭐',
      color: '#FFD700',
      criteria: {
        qualityScore: 95,
      },
    },
  })

  const testBadge = await prisma.badge.upsert({
    where: { code: 'test_champion' },
    update: {},
    create: {
      code: 'test_champion',
      name: 'Test Champion',
      description: 'Generated 500+ tests',
      category: 'testing',
      tier: 'gold',
      icon: '🧪',
      color: '#FFD700',
      criteria: {
        testsGenerated: 500,
      },
    },
  })

  console.log('Seeded badges:', { securityBadge, qualityBadge, testBadge })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
