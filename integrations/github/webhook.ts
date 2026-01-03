/**
 * GitHub Webhook Handler
 * 
 * Handles GitHub webhooks with HMAC validation
 * Normalizes events to internal format
 * 
 * Note: Webhook payloads from external APIs are inherently dynamic
 * and cannot be fully typed. We use interfaces for known structures
 * but some properties may be undefined or have unexpected types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { createHmac } from 'crypto';
import { prisma } from '../../lib/prisma';
import { queueService } from '../../queue';

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
  merged?: boolean;
  merge_commit_sha?: string;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
}

export interface GitHubWebhookEvent {
  action: string;
  pull_request?: GitHubPullRequest;
  repository?: GitHubRepository;
  check_run?: unknown;
  workflow_run?: unknown;
  installation?: { id: number };
}

export interface NormalizedEvent {
  type: 'pr.opened' | 'pr.updated' | 'pr.closed' | 'ci.completed' | 'merge.completed';
  repository: {
    id: string;
    fullName: string;
    provider: 'github';
  };
  pr?: {
    number: number;
    sha: string;
    title: string;
    baseBranch: string;
    headBranch: string;
  };
  installationId?: string;
}

export class GitHubWebhookHandler {
  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    return signature === expectedSignature;
  }

  /**
   * Handle webhook event
   */
  async handleEvent(
    event: GitHubWebhookEvent,
    installationId: string,
    signature: string
  ): Promise<void> {
    // Get installation
    const installation = await prisma.installation.findUnique({
      where: {
        provider_providerId: {
          provider: 'github',
          providerId: installationId,
        },
      },
    });

    if (!installation || !installation.webhookSecret) {
      throw new Error('Installation not found or webhook secret not configured');
    }

    // Validate signature
    const payload = JSON.stringify(event);
    if (!this.validateSignature(payload, signature, installation.webhookSecret)) {
      throw new Error('Invalid webhook signature');
    }

    // Normalize event (getOrCreateRepository is now synchronous placeholder)
    const normalized = await this.normalizeEvent(event, installation);

    // Get organizationId from installation for usage enforcement
    const organizationId = installation.organizationId ?? undefined;

    // Queue event for processing
    await queueService.enqueue('webhook', {
      type: normalized.type,
      data: {
        repository: normalized.repository,
        pr: normalized.pr,
        installationId: installation.id,
        repositoryId: normalized.repository.id,
      } as {
        repository: NormalizedEvent['repository'];
        pr?: NormalizedEvent['pr'];
        installationId: string;
        repositoryId: string;
      },
      organizationId,
    });
  }

  /**
   * Normalize GitHub event to internal format
   */
  private async normalizeEvent(
    event: GitHubWebhookEvent,
    installation: { id: string; organizationId?: string | null; repositoryId?: string | null }
  ): Promise<NormalizedEvent> {
    const repository = event.repository;
    if (!repository) {
      throw new Error('Repository information missing from webhook event');
    }
    const fullName = repository.full_name;

    // Find or create repository
    const repoId = await this.getOrCreateRepository(fullName, installation.organizationId ?? installation.repositoryId ?? null);

    if (event.action === 'opened' && event.pull_request) {
      return {
        type: 'pr.opened',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        pr: {
          number: event.pull_request.number,
          sha: event.pull_request.head.sha,
          title: event.pull_request.title,
          baseBranch: event.pull_request.base.ref,
          headBranch: event.pull_request.head.ref,
        },
        installationId: installation.id,
      };
    }

    if (event.action === 'synchronize' && event.pull_request) {
      return {
        type: 'pr.updated',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        pr: {
          number: event.pull_request.number,
          sha: event.pull_request.head.sha,
          title: event.pull_request.title,
          baseBranch: event.pull_request.base.ref,
          headBranch: event.pull_request.head.ref,
        },
        installationId: installation.id,
      };
    }

    if (event.action === 'closed' && event.pull_request?.merged) {
      const pr = event.pull_request;
      return {
        type: 'merge.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        pr: {
          number: pr.number,
          sha: pr.merge_commit_sha ?? pr.head.sha,
          title: pr.title,
          baseBranch: pr.base.ref,
          headBranch: pr.head.ref,
        },
        installationId: installation.id,
      };
    }

    if (event.action === 'completed' && event.check_run) {
      return {
        type: 'ci.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        installationId: installation.id,
      };
    }

    // Handle workflow_run events (for Test Engine)
    if (event.action === 'completed' && event.workflow_run) {
      return {
        type: 'ci.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        installationId: installation.id,
      };
    }

    throw new Error(`Unsupported event type: ${event.action}`);
  }

  /**
   * Get or create repository
   */
  private async getOrCreateRepository(
    fullName: string,
    organizationId: string | null
  ): Promise<string> {
    const [, name] = fullName.split('/');

    const existing = await prisma.repository.findUnique({
      where: {
        fullName_provider: {
          fullName,
          provider: 'github',
        },
      },
    });

    if (existing) {
      return existing.id;
    }

    if (!organizationId) {
      throw new Error('Organization ID required to create repository');
    }

    const repo = await prisma.repository.create({
      data: {
        organizationId,
        name,
        fullName,
        provider: 'github',
        defaultBranch: 'main',
      },
    });

    // Auto-generate default config
    try {
      const { configService } = await import('../../services/config');
      await configService.autoGenerateConfig(repo.id);
    } catch (error) {
      // Don't fail repo creation if config generation fails
      // Config will be auto-generated on first use
    }

    return repo.id;
  }
}

export const githubWebhookHandler = new GitHubWebhookHandler();
