/**
 * GitHub Webhook Handler
 * 
 * Handles GitHub webhooks with HMAC validation
 * Normalizes events to internal format
 */

import { createHmac } from 'crypto';
import { prisma } from '../../lib/prisma';
import { queueService } from '../../queue';

export interface GitHubWebhookEvent {
  action: string;
  pull_request?: any;
  repository?: any;
  check_run?: any;
  workflow_run?: any;
  installation?: any;
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

    // Queue event for processing
    await queueService.enqueue('webhook', {
      type: normalized.type,
      data: {
        repository: normalized.repository,
        pr: normalized.pr,
        installationId: installation.id,
      },
    });
  }

  /**
   * Normalize GitHub event to internal format
   */
  private async normalizeEvent(
    event: GitHubWebhookEvent,
    installation: any
  ): Promise<NormalizedEvent> {
    const repository = event.repository || {};
    const fullName = repository.full_name || '';

    // Find or create repository
    const repoId = await this.getOrCreateRepository(fullName, installation.organizationId || installation.repositoryId);

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
      return {
        type: 'merge.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'github',
        },
        pr: {
          number: event.pull_request.number,
          sha: event.pull_request.merge_commit_sha,
          title: event.pull_request.title,
          baseBranch: event.pull_request.base.ref,
          headBranch: event.pull_request.head.ref,
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

    return repo.id;
  }
}

export const githubWebhookHandler = new GitHubWebhookHandler();
