/**
 * Health Check Endpoints
 * 
 * /health - Liveness probe
 * /ready - Readiness probe
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: 'healthy' | 'unhealthy';
    redis?: 'healthy' | 'unhealthy';
  };
  timestamp: string;
}

export interface ReadyStatus {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'ready' | 'not_ready';
    redis?: 'ready' | 'not_ready';
  };
  timestamp: string;
}

export class HealthChecker {
  /**
   * Check health (liveness)
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      database: await this.checkDatabase(),
    };

    // Check Redis if configured
    if (process.env.REDIS_URL) {
      checks.redis = await this.checkRedis();
    }

    const allHealthy = Object.values(checks).every((status) => status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check readiness
   */
  async checkReady(): Promise<ReadyStatus> {
    const checks: ReadyStatus['checks'] = {
      database: await this.checkDatabaseReady(),
    };

    // Check Redis if configured
    if (process.env.REDIS_URL) {
      checks.redis = await this.checkRedisReady();
    }

    const allReady = Object.values(checks).every((status) => status === 'ready');

    return {
      status: allReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<'healthy' | 'unhealthy'> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check database readiness
   */
  private async checkDatabaseReady(): Promise<'ready' | 'not_ready'> {
    try {
      // Check if we can perform a simple query
      await prisma.$queryRaw`SELECT 1`;
      return 'ready';
    } catch (error) {
      return 'not_ready';
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<'healthy' | 'unhealthy'> {
    try {
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check Redis readiness
   */
  private async checkRedisReady(): Promise<'ready' | 'not_ready'> {
    try {
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      return 'ready';
    } catch (error) {
      return 'not_ready';
    }
  }
}

export const healthChecker = new HealthChecker();
