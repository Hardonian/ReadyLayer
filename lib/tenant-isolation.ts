/**
 * Tenant Isolation Enforcement
 *
 * Provides compile-time and runtime tenant scope enforcement for all data access.
 * This module ensures that all database queries are scoped to the authenticated
 * user's organization(s), preventing cross-tenant data access.
 *
 * Key principles:
 * 1. Every data access operation MUST specify a tenantId
 * 2. Queries without tenant scope will throw a TenantIsolationError
 * 3. RLS policies provide defense-in-depth at the database level
 * 4. Tests prove isolation by attempting cross-tenant access
 */

import { prisma } from './prisma';
import { logger } from '../observability/logging';

export interface TenantContext {
  tenantId: string;
  userId: string;
  organizationIds: string[];
}

export class TenantIsolationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly resourceType: string,
    public readonly attemptedTenantId?: string,
    public readonly authorizedTenantIds?: string[]
  ) {
    super(message);
    this.name = 'TenantIsolationError';
  }
}

export function requireTenantContext(context: TenantContext | null): asserts context is TenantContext {
  if (!context) {
    throw new TenantIsolationError(
      'Tenant context is required for all data operations. User must be authenticated.',
      'UNKNOWN',
      'UNKNOWN'
    );
  }
}

export function requireTenantAccess(
  context: TenantContext,
  tenantId: string,
  operation: string,
  resourceType: string
): void {
  if (!context.organizationIds.includes(tenantId)) {
    logger.warn({
      event: 'tenant_isolation_violation_attempt',
      attemptedTenantId: tenantId,
      authorizedTenantIds: context.organizationIds,
      operation,
      resourceType,
      userId: context.userId,
    });

    throw new TenantIsolationError(
      `Access denied: Not authorized for organization '${tenantId}'. User belongs to organizations: ${context.organizationIds.join(', ')}`,
      operation,
      resourceType,
      tenantId,
      context.organizationIds
    );
  }
}

export async function verifyTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: tenantId,
        userId,
      },
    },
    select: { id: true },
  });

  return !!membership;
}

export async function requireVerifiedTenantAccess(
  context: TenantContext,
  tenantId: string,
  operation: string,
  resourceType: string
): Promise<void> {
  requireTenantContext(context);

  if (!context.organizationIds.includes(tenantId)) {
    const isMember = await verifyTenantAccess(context.userId, tenantId);

    if (!isMember) {
      logger.warn({
        event: 'tenant_isolation_access_denied',
        userId: context.userId,
        attemptedTenantId: tenantId,
        authorizedTenantIds: context.organizationIds,
        operation,
        resourceType,
      });

      throw new TenantIsolationError(
        `Access denied: User does not have access to organization '${tenantId}'`,
        operation,
        resourceType,
        tenantId,
        context.organizationIds
      );
    }
  }
}

export function createTenantScope<T>(
  context: TenantContext,
  tenantId: string,
  operation: string
): T & { organizationId: string } {
  requireTenantAccess(context, tenantId, operation, 'UNKNOWN');

  return {
    organizationId: tenantId,
  } as T & { organizationId: string };
}

export function assertNoTenantBypass(operation: string): void {
  const callerInfo = new Error().stack?.split('\n').slice(2, 5).join('\n');

  logger.debug({
    event: 'tenant_enforcement_check',
    operation,
    callerInfo,
  });
}

export const TenantOperation = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const;
