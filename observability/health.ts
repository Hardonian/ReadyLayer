/**
 * Health Check Endpoints
 * 
 * /health - Liveness probe
 * /ready - Readiness probe
 */

import { prisma } from '../lib/prisma';
import { createClient } from 'redis';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: 'healthy' | 'unhealthy';
    databaseSchema?: 'healthy' | 'unhealthy' | 'degraded';
    redis?: 'healthy' | 'unhealthy';
  };
  timestamp: string;
  details?: {
    missingTables?: string[];
    rlsNotEnabled?: string[];
    missingFunctions?: string[];
  };
}

export interface ReadyStatus {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'ready' | 'not_ready';
    databaseSchema?: 'ready' | 'not_ready' | 'degraded';
    redis?: 'ready' | 'not_ready';
  };
  timestamp: string;
  details?: {
    missingTables?: string[];
    rlsNotEnabled?: string[];
    missingFunctions?: string[];
  };
}

export class HealthChecker {
  /**
   * Check health (liveness)
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      database: await this.checkDatabase(),
    };

    // Check database schema if database is healthy
    if (checks.database === 'healthy') {
      const schemaCheck = await this.checkDatabaseSchema();
      checks.databaseSchema = schemaCheck.status;
      if (schemaCheck.details) {
        return {
          status: schemaCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
          checks,
          timestamp: new Date().toISOString(),
          details: schemaCheck.details,
        };
      }
    }

    // Check Redis if configured
    if (process.env.REDIS_URL) {
      checks.redis = await this.checkRedis();
    }

    const allHealthy = Object.values(checks).every((status) => status === 'healthy' || status === 'degraded');

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

    // Check database schema if database is ready
    if (checks.database === 'ready') {
      const schemaCheck = await this.checkDatabaseSchema();
      checks.databaseSchema = schemaCheck.status === 'healthy' ? 'ready' : schemaCheck.status === 'unhealthy' ? 'not_ready' : 'degraded';
      if (schemaCheck.details) {
        return {
          status: schemaCheck.status === 'healthy' ? 'ready' : 'not_ready',
          checks,
          timestamp: new Date().toISOString(),
          details: schemaCheck.details,
        };
      }
    }

    // Check Redis if configured
    if (process.env.REDIS_URL) {
      checks.redis = await this.checkRedisReady();
    }

    const allReady = Object.values(checks).every((status) => status === 'ready' || status === 'degraded');

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

  /**
   * Check database schema (backend contract validation)
   * Returns degraded if non-critical issues, unhealthy if critical
   */
  private async checkDatabaseSchema(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details?: HealthStatus['details'];
  }> {
    try {
      const requiredTables = [
        'User', 'Organization', 'OrganizationMember', 'Repository',
        'Review', 'Test', 'Doc', 'Job', 'Violation', 'ApiKey',
        'Subscription', 'CostTracking', 'AuditLog',
      ];

      // Check tables exist
      const tablesResult = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ANY(${requiredTables}::text[])
      `;

      const foundTables = new Set(tablesResult.map((t: { tablename: string }) => t.tablename));
      const missingTables = requiredTables.filter((t: string) => !foundTables.has(t));

      // Check RLS on critical tables
      const criticalTables = ['User', 'Organization', 'Repository', 'Review'];
      const rlsResult = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
        SELECT relname, relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = ANY(${criticalTables}::text[])
        AND c.relkind = 'r'
      `;

      const rlsNotEnabled = rlsResult
        .filter((t: { relname: string; relrowsecurity: boolean }) => !t.relrowsecurity)
        .map((t: { relname: string; relrowsecurity: boolean }) => t.relname);

      // Check helper functions
      const requiredFunctions = ['current_user_id', 'is_org_member', 'has_org_role'];
      const functionsResult = await prisma.$queryRaw<Array<{ routine_name: string }>>`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = ANY(${requiredFunctions}::text[])
      `;

      const foundFunctions = new Set(functionsResult.map((f: { routine_name: string }) => f.routine_name));
      const missingFunctions = requiredFunctions.filter((f: string) => !foundFunctions.has(f));

      // Critical issues: missing tables or RLS not enabled
      if (missingTables.length > 0 || rlsNotEnabled.length > 0) {
        return {
          status: 'unhealthy',
          details: {
            missingTables: missingTables.length > 0 ? missingTables : undefined,
            rlsNotEnabled: rlsNotEnabled.length > 0 ? rlsNotEnabled : undefined,
            missingFunctions: missingFunctions.length > 0 ? missingFunctions : undefined,
          },
        };
      }

      // Degraded: missing functions but tables/RLS OK
      if (missingFunctions.length > 0) {
        return {
          status: 'degraded',
          details: {
            missingFunctions,
          },
        };
      }

      return { status: 'healthy' };
    } catch (error) {
      // If schema check fails, don't fail health check - just log
      return { status: 'degraded' };
    }
  }
}

export const healthChecker = new HealthChecker();
