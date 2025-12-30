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
        const apiKey = request.headers.get('authorization')?.substring(7);
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
          // Session-based auth: default to read scope, admin if org owner
          userScopes = ['read'];
          if (options.requireOrganization) {
            const orgId = request.nextUrl.searchParams.get('organizationId') ||
                         request.headers.get('x-organization-id');
            if (orgId && await hasRole(user.id, orgId, 'owner')) {
              userScopes.push('admin');
            }
          }
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

      logger.error('Authorization error', error);
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
export const requireOrganization = (role?: 'owner' | 'admin' | 'member') =>
  createAuthzMiddleware({
    requireOrganization: true,
    requireRole: role,
  });
