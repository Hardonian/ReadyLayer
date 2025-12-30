/**
 * Prisma Client Singleton
 * 
 * Connection pooling and singleton pattern for optimal performance
 */

import { PrismaClient } from '@prisma/client'

// Extend PrismaClient to add connection pool configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Connection pool configuration (via connection string)
// PostgreSQL connection string format:
// postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=10
// The connection_limit parameter controls pool size

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma
