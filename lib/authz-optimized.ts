/**
 * Optimized Authorization Helpers
 * 
 * Performance improvements:
 * - Composite queries that fetch resource + membership in one query
 * - Caching for membership checks
 * - Batch access validation
 */

import { prisma } from './prisma';
import { SimpleCache } from './utils/memoization';

// In-memory cache for membership checks (30 second TTL)
const membershipCache = new SimpleCache<boolean>(30000);

/**
 * Check if user can access repository - OPTIMIZED
 * Uses composite query to fetch repository and membership in one operation
 */
export async function canAccessRepositoryOptimized(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  const cacheKey = `repo-access:${userId}:${repositoryId}`;
  const cached = membershipCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // Single query using JOIN to check both repository exists and user has membership
    const result = await prisma.$queryRaw<Array<{ has_access: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "OrganizationMember" om
        JOIN "Repository" r ON r."organizationId" = om."organizationId"
        WHERE r.id = ${repositoryId}
        AND om."userId" = ${userId}
      ) as has_access
    `;

    const hasAccess = result[0]?.has_access === true;
    membershipCache.set(cacheKey, hasAccess, 30000);
    return hasAccess;
  } catch (_error) {
    // Fallback to original method on error
    try {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repository) return false;

      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId: repository.organizationId,
        },
      });

      const hasAccess = !!membership;
      membershipCache.set(cacheKey, hasAccess, 30000);
      return hasAccess;
    } catch {
      return false;
    }
  }
}

/**
 * Check if user can access review - OPTIMIZED
 * Uses composite query to fetch review and membership in one operation
 */
export async function canAccessReviewOptimized(
  userId: string,
  reviewId: string
): Promise<boolean> {
  const cacheKey = `review-access:${userId}:${reviewId}`;
  const cached = membershipCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // Single query using JOIN
    const result = await prisma.$queryRaw<Array<{ has_access: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "OrganizationMember" om
        JOIN "Review" rev ON rev."repositoryId" IN (
          SELECT id FROM "Repository" WHERE "organizationId" = om."organizationId"
        )
        WHERE rev.id = ${reviewId}
        AND om."userId" = ${userId}
      ) as has_access
    `;

    const hasAccess = result[0]?.has_access === true;
    membershipCache.set(cacheKey, hasAccess, 30000);
    return hasAccess;
  } catch (_error) {
    // Fallback to original method
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        select: {
          repository: {
            select: { organizationId: true },
          },
        },
      });

      if (!review) return false;

      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId: review.repository.organizationId,
        },
      });

      const hasAccess = !!membership;
      membershipCache.set(cacheKey, hasAccess, 30000);
      return hasAccess;
    } catch {
      return false;
    }
  }
}

/**
 * Check if user can access run - OPTIMIZED
 * Uses composite query to fetch run and membership in one operation
 */
export async function canAccessRunOptimized(
  userId: string,
  runId: string
): Promise<boolean> {
  const cacheKey = `run-access:${userId}:${runId}`;
  const cached = membershipCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // Single query using JOIN
    const result = await prisma.$queryRaw<Array<{ has_access: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "OrganizationMember" om
        JOIN "ReadyLayerRun" run ON run."repositoryId" IN (
          SELECT id FROM "Repository" WHERE "organizationId" = om."organizationId"
        )
        WHERE run.id = ${runId}
        AND om."userId" = ${userId}
      ) as has_access
    `;

    const hasAccess = result[0]?.has_access === true;
    membershipCache.set(cacheKey, hasAccess, 30000);
    return hasAccess;
  } catch (_error) {
    // Fallback to original method
    try {
      const run = await prisma.readyLayerRun.findUnique({
        where: { id: runId },
        select: {
          repository: {
            select: { organizationId: true },
          },
        },
      });

      if (!run || !run.repository) return false;

      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId: run.repository.organizationId,
        },
      });

      const hasAccess = !!membership;
      membershipCache.set(cacheKey, hasAccess, 30000);
      return hasAccess;
    } catch {
      return false;
    }
  }
}

/**
 * Batch check repository access for multiple repos
 * More efficient than individual checks
 */
export async function canAccessRepositoriesBatch(
  userId: string,
  repositoryIds: string[]
): Promise<Map<string, boolean>> {
  if (repositoryIds.length === 0) return new Map();

  try {
    // Single query for all repositories
    const results = await prisma.$queryRaw<Array<{ repo_id: string; has_access: boolean }>>`
      SELECT 
        r.id as repo_id,
        EXISTS (
          SELECT 1 FROM "OrganizationMember" om
          WHERE om."organizationId" = r."organizationId"
          AND om."userId" = ${userId}
        ) as has_access
      FROM "Repository" r
      WHERE r.id IN (${repositoryIds.join(',')})
    `;

    const accessMap = new Map<string, boolean>();
    for (const row of results) {
      accessMap.set(row.repo_id, row.has_access === true);
      // Cache individual results
      membershipCache.set(`repo-access:${userId}:${row.repo_id}`, row.has_access === true, 30000);
    }

    return accessMap;
  } catch (_error) {
    // Fallback to individual checks
    const accessMap = new Map<string, boolean>();
    for (const repoId of repositoryIds) {
      const hasAccess = await canAccessRepositoryOptimized(userId, repoId);
      accessMap.set(repoId, hasAccess);
    }
    return accessMap;
  }
}

/**
 * Invalidate membership cache for user
 */
export function invalidateMembershipCache(userId: string): void {
  // Clear all cache entries for this user
  for (const key of membershipCache['cache'].keys()) {
    if (key.includes(`:${userId}:`)) {
      membershipCache.delete(key);
    }
  }
}
