/**
 * Repository Cache Layer
 *
 * Caches frequently accessed repository data to reduce database load.
 * Optimized for the webhook processor and API routes.
 */

import { prisma } from '../prisma';
import { cache, buildCacheKey } from '../db/cache';
import { SimpleCache } from '../utils/memoization';
import type { Repository, Organization } from '@prisma/client';

// In-memory cache for ultra-fast lookups (5 second TTL)
const memoryCache = new SimpleCache<Repository | Organization>(5000);

// TTL constants
const TTL_REPOSITORY = 5; // 5 seconds for transactional data
const TTL_ORGANIZATION = 30; // 30 seconds for org data

/**
 * Get repository with caching
 * Falls back to in-memory cache, then Redis, then DB
 */
export async function getCachedRepository(
  repositoryId: string
): Promise<Repository | null> {
  if (!repositoryId) return null;

  // Try in-memory first (fastest)
  const memKey = `repo:${repositoryId}`;
  const memCached = memoryCache.get(memKey);
  if (memCached && 'fullName' in memCached) {
    return memCached as Repository;
  }

  // Try Redis cache
  const cacheKey = buildCacheKey('repository', repositoryId);
  const cached = await cache.get<Repository>(cacheKey);
  if (cached) {
    // Populate memory cache
    memoryCache.set(memKey, cached, TTL_REPOSITORY * 1000);
    return cached;
  }

  // Fetch from database
  const repo = await prisma.repository.findUnique({
    where: { id: repositoryId },
  });

  if (repo) {
    // Populate both caches
    memoryCache.set(memKey, repo, TTL_REPOSITORY * 1000);
    await cache.set(cacheKey, repo, TTL_REPOSITORY);
  }

  return repo;
}

/**
 * Get organization with caching
 */
export async function getCachedOrganization(
  organizationId: string
): Promise<Organization | null> {
  if (!organizationId) return null;

  const memKey = `org:${organizationId}`;
  const memCached = memoryCache.get(memKey);
  if (memCached && 'name' in memCached) {
    return memCached as Organization;
  }

  const cacheKey = buildCacheKey('organization', organizationId);
  const cached = await cache.get<Organization>(cacheKey);
  if (cached) {
    memoryCache.set(memKey, cached, TTL_ORGANIZATION * 1000);
    return cached;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (org) {
    memoryCache.set(memKey, org, TTL_ORGANIZATION * 1000);
    await cache.set(cacheKey, org, TTL_ORGANIZATION);
  }

  return org;
}

/**
 * Get repository with organization data (batched query)
 */
export async function getRepositoryWithOrg(
  repositoryId: string
): Promise<{ repository: Repository; organization: Organization } | null> {
  if (!repositoryId) return null;

  const repo = await getCachedRepository(repositoryId);
  if (!repo) return null;

  const org = await getCachedOrganization(repo.organizationId);
  if (!org) return null;

  return { repository: repo, organization: org };
}

/**
 * Batch fetch repositories (more efficient than individual queries)
 */
export async function getCachedRepositories(
  repositoryIds: string[]
): Promise<Repository[]> {
  if (repositoryIds.length === 0) return [];

  // Check in-memory cache for each
  const missingIds: string[] = [];
  const results: Repository[] = [];

  for (const id of repositoryIds) {
    const memCached = memoryCache.get(`repo:${id}`);
    if (memCached && 'fullName' in memCached) {
      results.push(memCached as Repository);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return results;
  }

  // Batch fetch missing repositories
  const repos = await prisma.repository.findMany({
    where: { id: { in: missingIds } },
  });

  // Populate caches
  for (const repo of repos) {
    memoryCache.set(`repo:${repo.id}`, repo, TTL_REPOSITORY * 1000);
    const cacheKey = buildCacheKey('repository', repo.id);
    await cache.set(cacheKey, repo, TTL_REPOSITORY);
    results.push(repo);
  }

  return results;
}

/**
 * Invalidate repository cache
 */
export async function invalidateRepositoryCache(repositoryId: string): Promise<void> {
  memoryCache.delete(`repo:${repositoryId}`);
  const cacheKey = buildCacheKey('repository', repositoryId);
  await cache.delete(cacheKey);
}

/**
 * Invalidate organization cache
 */
export async function invalidateOrganizationCache(organizationId: string): Promise<void> {
  memoryCache.delete(`org:${organizationId}`);
  const cacheKey = buildCacheKey('organization', organizationId);
  await cache.delete(cacheKey);
}
