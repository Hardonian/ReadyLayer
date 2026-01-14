/**
 * Database Seeding Utilities
 * 
 * Helpers for setting up test data in integration tests
 * Run in CI or locally: pnpm prisma:seed
 */

import { prisma } from '../../lib/prisma';
import { v4 as uuid } from 'crypto';
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
    organizationId: string,
    overrides?: any
  ) {
    return prisma.user.create({
      data: {
        id: uuid(),
        email: `test-${Date.now()}@example.com`,
        organizationId,
        role: 'admin',
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
    return prisma.repository.create({
      data: {
        id: uuid(),
        organizationId,
        name: `test-repo-${Date.now()}`,
        externalId: `github_${Date.now()}`,
        provider: 'github',
        url: `https://github.com/test/repo-${Date.now()}`,
        isPrivate: false,
        ...overrides,
      },
    });
  }

  /**
   * Create a complete test fixture (org + user + repo)
   */
  async createTestFixture() {
    const org = await this.createOrganization();
    const user = await this.createUser(org.id);
    const repo = await this.createRepository(org.id);

    return { org, user, repo };
  }

  /**
   * Clean up test data
   */
  async cleanup() {
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
