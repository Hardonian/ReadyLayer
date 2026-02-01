/**
 * Database Seeding Utilities
 * 
 * Helpers for setting up test data in integration tests
 * Run in CI or locally: pnpm prisma:seed
 */

import { prisma } from '../../lib/prisma';
import { randomUUID as uuid } from 'crypto';
import type { Organization, Repository, User } from '@prisma/client';

export class TestDataSeeder {
  /**
   * Create a test organization
   */
  async createOrganization(
    overrides?: Partial<Organization>
  ): Promise<Organization> {
    return prisma.organization.create({
      data: {
        id: uuid(),
        name: `Test Org ${Date.now()}`,
        slug: `test-org-${Date.now()}`,
        plan: 'free',
        ...overrides,
      },
    });
  }

  /**
   * Create a test user
   */
  async createUser(
    _organizationId: string,
    overrides?: Partial<User>
  ): Promise<User> {
    return prisma.user.create({
      data: {
        id: uuid(),
        email: `test-${Date.now()}@example.com`,
        ...overrides,
      },
    });
  }

  /**
   * Create a test repository
   */
  async createRepository(
    organizationId: string,
    overrides?: Partial<Repository>
  ): Promise<Repository> {
    const timestamp = Date.now();
    return prisma.repository.create({
      data: {
        id: uuid(),
        organizationId,
        name: `test-repo-${timestamp}`,
        fullName: `test-org/test-repo-${timestamp}`,
        providerId: `github_${timestamp}`,
        provider: 'github',
        url: `https://github.com/test/repo-${timestamp}`,
        isPrivate: false,
        ...overrides,
      },
    });
  }

  /**
   * Create a complete test fixture (org + user + repo)
   */
  async createTestFixture(): Promise<{ org: Organization; user: User; repo: Repository }> {
    const org = await this.createOrganization();
    const user = await this.createUser(org.id);
    const repo = await this.createRepository(org.id);

    return { org, user, repo };
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    try {
      // Delete in order of dependencies
      await prisma.review.deleteMany({});
      await prisma.testRun.deleteMany({});
      await prisma.repository.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.organization.deleteMany({});
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const testSeeder = new TestDataSeeder();
