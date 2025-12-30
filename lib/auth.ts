/**
 * Authentication Utilities
 * 
 * OAuth, API Keys, JWT authentication and authorization
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from './prisma';
import { createHash, randomFillSync } from 'crypto';
import { logger } from '../observability/logging';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  organizationIds: string[];
}

export interface AuthContext {
  user: AuthUser;
  organizationId?: string;
  scopes: string[];
}

/**
 * Get authenticated user from Supabase session
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op for server-side
          },
        },
      }
    );

    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return null;
    }

    // Get user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: supabaseUser.id },
      select: { organizationId: true },
    });

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
      organizationIds: memberships.map(m => m.organizationId),
    };
  } catch (error) {
    logger.error(error, 'Failed to get authenticated user');
    return null;
  }
}

/**
 * Authenticate via API key
 */
export async function authenticateApiKey(apiKey: string): Promise<AuthUser | null> {
  try {
    // Hash the provided API key
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Find API key
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Get user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: apiKeyRecord.userId },
      select: { organizationId: true },
    });

    return {
      id: apiKeyRecord.userId,
      email: apiKeyRecord.user.email || undefined,
      name: apiKeyRecord.user.name || undefined,
      organizationIds: memberships.map(m => m.organizationId),
    };
  } catch (error) {
    logger.error(error, 'API key authentication failed');
    return null;
  }
}

/**
 * Extract and validate API key from request
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  // Try API key first
  const apiKey = extractApiKey(request);
  if (apiKey) {
    const user = await authenticateApiKey(apiKey);
    if (user) {
      return user;
    }
  }

  // Try session-based auth
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Check if user has required scope
 */
export function hasScope(userScopes: string[], requiredScope: string): boolean {
  // Admin scope grants all permissions
  if (userScopes.includes('admin')) {
    return true;
  }

  return userScopes.includes(requiredScope);
}

/**
 * Check if user can access organization
 */
export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return !!membership;
}

/**
 * Check if user has role in organization
 */
export async function hasRole(
  userId: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  // Role hierarchy: owner > admin > member
  const roleHierarchy = { owner: 3, admin: 2, member: 1 };
  const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[role];

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Generate API key
 */
export async function generateApiKey(
  userId: string,
  name: string,
  scopes: string[],
  expiresAt?: Date
): Promise<{ key: string; id: string }> {
  // Generate random API key
  const randomBytes = Buffer.allocUnsafe(32);
  randomFillSync(randomBytes);
  const key = `rl_${randomBytes.toString('base64url')}`;
  const keyHash = createHash('sha256').update(key).digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      scopes,
      expiresAt,
    },
  });

  return { key, id: apiKey.id };
}

/**
 * Verify that a user can access a resource
 */
export function canAccessResource(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId;
}
