/**
 * Authorization Middleware
 * 
 * RBAC and resource-level authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasScope, canAccessOrganization, hasRole, AuthUser } from './auth';
import { logger } from '../observability/logging';

export interface AuthzOptions {
  requiredScopes?: string[];
  requireOrganization?: boolean;
  requireRole?: 'owner' | 'admin' | 'member';
  checkResourceAccess?: (user: AuthUser, request: NextRequest) => Promise<boolean>;
}

/**
 * Authorization middleware factory
 */
export function createAuthzMiddleware(options: AuthzOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Require authentication
      const user = await requireAuth(request);

      // Check scopes if required
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        // Get scopes from API key if present
        const authHeader = request.headers.get('authorization');
        const bearerToken =
          authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
        // Only treat rl_* tokens as API keys; other Bearer tokens (e.g., Supabase JWT)
        // should not trigger API key scope logic.
        const apiKey = bearerToken && bearerToken.startsWith('rl_') ? bearerToken : null;
        let userScopes: string[] = [];

        if (apiKey) {
          const { prisma } = await import('./prisma');
          const { createHash } = await import('crypto');
          const keyHash = createHash('sha256').update(apiKey).digest('hex');
          const apiKeyRecord = await prisma.apiKey.findFirst({
            where: { keyHash, isActive: true },
          });
          if (apiKeyRecord) {
            userScopes = apiKeyRecord.scopes;
          }
        } else {
          // P1-FIX: Session-based auth scope determination
          // Default to read scope for all authenticated users
          userScopes = ['read'];

          // Grant admin scope if user is owner or admin role
          if (options.requireOrganization) {
            const orgId = request.nextUrl.searchParams.get('organizationId') ||
                         request.headers.get('x-organization-id');
            if (orgId) {
              // Check if user has admin or owner role (both grant admin scope)
              // hasRole uses hierarchy: owner >= admin, so this catches both
              const isAdmin = await hasRole(user.id, orgId, 'admin');
              if (isAdmin) {
                userScopes.push('admin');
              }
            }
          }

          // Grant write scope for all authenticated users
          // (API operations generally need write access)
          userScopes.push('write');
        }

        const hasRequiredScope = options.requiredScopes.some(scope =>
          hasScope(userScopes, scope)
        );

        if (!hasRequiredScope) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: `Required scope: ${options.requiredScopes.join(' or ')}`,
              },
            },
            { status: 403 }
          );
        }
      }

      // Check organization access if required
      if (options.requireOrganization) {
        const organizationId =
          request.nextUrl.searchParams.get('organizationId') ||
          request.headers.get('x-organization-id') ||
          request.nextUrl.pathname.match(/\/organizations\/([^/]+)/)?.[1];

        if (!organizationId) {
          return NextResponse.json(
            {
              error: {
                code: 'BAD_REQUEST',
                message: 'Organization ID required',
              },
            },
            { status: 400 }
          );
        }

        const canAccess = await canAccessOrganization(user.id, organizationId);
        if (!canAccess) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: 'Access denied to organization',
              },
            },
            { status: 403 }
          );
        }

        // Check role if required
        if (options.requireRole) {
          const hasRequiredRole = await hasRole(user.id, organizationId, options.requireRole);
          if (!hasRequiredRole) {
            return NextResponse.json(
              {
                error: {
                  code: 'FORBIDDEN',
                  message: `Required role: ${options.requireRole}`,
                },
              },
              { status: 403 }
            );
          }
        }
      }

      // Check resource-level access if provided
      if (options.checkResourceAccess) {
        const canAccess = await options.checkResourceAccess(user, request);
        if (!canAccess) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: 'Access denied to resource',
              },
            },
            { status: 403 }
          );
        }
      }

      // Authorization passed
      return null;
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }

      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
      }, 'Authorization error');
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authorization check failed',
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Require read scope
 */
export const requireRead = createAuthzMiddleware({ requiredScopes: ['read'] });

/**
 * Require write scope
 */
export const requireWrite = createAuthzMiddleware({ requiredScopes: ['write'] });

/**
 * Require admin scope
 */
export const requireAdmin = createAuthzMiddleware({ requiredScopes: ['admin'] });

/**
 * Require organization access
 */
export const requireOrganization = (role?: 'owner' | 'admin' | 'member'): ReturnType<typeof createAuthzMiddleware> =>
  createAuthzMiddleware({
    requireOrganization: true,
    requireRole: role,
  });

/**
 * P1: Resource-Level Authorization Helpers
 * Check if user can access specific resources beyond organization membership
 */

/**
 * Check if user can access a repository
 */
export async function canAccessRepository(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');

    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repository) {
      return false;
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: repository.organizationId,
      },
    });

    return !!membership;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), userId, repositoryId },
      'Failed to check repository access'
    );
    return false;
  }
}

/**
 * Check if user can access a review
 */
export async function canAccessReview(
  userId: string,
  reviewId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        repository: {
          select: { organizationId: true },
        },
      },
    });

    if (!review) {
      return false;
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: review.repository.organizationId,
      },
    });

    return !!membership;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), userId, reviewId },
      'Failed to check review access'
    );
    return false;
  }
}

/**
 * Check if user can access a run
 */
export async function canAccessRun(
  userId: string,
  runId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');

    const run = await prisma.readyLayerRun.findUnique({
      where: { id: runId },
      select: {
        repository: {
          select: { organizationId: true },
        },
      },
    });

    if (!run) {
      return false;
    }

    if (!run.repository) {
      return false;
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: run.repository.organizationId,
      },
    });

    return !!membership;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), userId, runId },
      'Failed to check run access'
    );
    return false;
  }
}

/**
 * Check if user can modify a repository (requires admin or owner role)
 */
export async function canModifyRepository(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');

    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repository) {
      return false;
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: repository.organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    return !!membership;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), userId, repositoryId },
      'Failed to check repository modify permission'
    );
    return false;
  }
}

/**
 * Require access or throw error
 */
export async function requireRepositoryAccess(
  userId: string,
  repositoryId: string
): Promise<void> {
  const hasAccess = await canAccessRepository(userId, repositoryId);
  if (!hasAccess) {
    throw new Error('Forbidden: You do not have access to this repository');
  }
}

export async function requireReviewAccess(
  userId: string,
  reviewId: string
): Promise<void> {
  const hasAccess = await canAccessReview(userId, reviewId);
  if (!hasAccess) {
    throw new Error('Forbidden: You do not have access to this review');
  }
}

export async function requireRunAccess(
  userId: string,
  runId: string
): Promise<void> {
  const hasAccess = await canAccessRun(userId, runId);
  if (!hasAccess) {
    throw new Error('Forbidden: You do not have access to this run');
  }
}
