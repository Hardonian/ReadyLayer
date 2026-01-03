import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ReadyLayer seed data
  // Note: This replaces the old gamification seed data
  // Add seed data for ReadyLayer models here if needed
  
  // eslint-disable-next-line no-console
  console.log('ReadyLayer seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
