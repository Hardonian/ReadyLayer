/**
 * Bitbucket Webhook Handler
 * 
 * Handles Bitbucket webhooks with HMAC validation
 * Normalizes events to internal format
 */

import { createHmac } from 'crypto';
import { prisma } from '../../lib/prisma';
import { queueService } from '../../queue';

export interface BitbucketWebhookEvent {
  eventKey: string;
  pullRequest?: any;
  repository?: any;
  buildStatus?: any;
  commit?: any;
}

export interface NormalizedEvent {
  type: 'pr.opened' | 'pr.updated' | 'pr.closed' | 'ci.completed' | 'merge.completed';
  repository: {
    id: string;
    fullName: string;
    provider: 'bitbucket';
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

export class BitbucketWebhookHandler {
  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Bitbucket sends signature as hex string (no 'sha256=' prefix)
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  }

  /**
   * Handle webhook event
   */
  async handleEvent(
    event: BitbucketWebhookEvent,
    installationId: string,
    signature: string
  ): Promise<void> {
    // Get installation
    const installation = await prisma.installation.findUnique({
      where: {
        provider_providerId: {
          provider: 'bitbucket',
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

    // Normalize event
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
   * Normalize Bitbucket event to internal format
   */
  private async normalizeEvent(
    event: BitbucketWebhookEvent,
    installation: any
  ): Promise<NormalizedEvent> {
    const repository = event.repository || {};
    const workspace = repository.workspace?.slug || repository.owner?.username || '';
    const repoSlug = repository.slug || '';
    const fullName = workspace && repoSlug ? `${workspace}/${repoSlug}` : '';

    // Find or create repository
    const repoId = await this.getOrCreateRepository(fullName, installation.organizationId || installation.repositoryId);

    if (event.eventKey === 'pr:opened' || event.eventKey === 'pullrequest:created') {
      const pr = event.pullRequest || {};
      return {
        type: 'pr.opened',
        repository: {
          id: repoId,
          fullName,
          provider: 'bitbucket',
        },
        pr: {
          number: pr.id || pr.number,
          sha: pr.fromRef?.latestCommit || pr.source?.commit?.hash || '',
          title: pr.title || '',
          baseBranch: pr.toRef?.displayId || pr.destination?.branch?.name || '',
          headBranch: pr.fromRef?.displayId || pr.source?.branch?.name || '',
        },
        installationId: installation.id,
      };
    }

    if (event.eventKey === 'pr:updated' || event.eventKey === 'pullrequest:updated') {
      const pr = event.pullRequest || {};
      return {
        type: 'pr.updated',
        repository: {
          id: repoId,
          fullName,
          provider: 'bitbucket',
        },
        pr: {
          number: pr.id || pr.number,
          sha: pr.fromRef?.latestCommit || pr.source?.commit?.hash || '',
          title: pr.title || '',
          baseBranch: pr.toRef?.displayId || pr.destination?.branch?.name || '',
          headBranch: pr.fromRef?.displayId || pr.source?.branch?.name || '',
        },
        installationId: installation.id,
      };
    }

    if (event.eventKey === 'pr:merged' || event.eventKey === 'pullrequest:fulfilled') {
      const pr = event.pullRequest || {};
      return {
        type: 'merge.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'bitbucket',
        },
        pr: {
          number: pr.id || pr.number,
          sha: pr.mergeCommit?.hash || pr.fromRef?.latestCommit || '',
          title: pr.title || '',
          baseBranch: pr.toRef?.displayId || pr.destination?.branch?.name || '',
          headBranch: pr.fromRef?.displayId || pr.source?.branch?.name || '',
        },
        installationId: installation.id,
      };
    }

    if (event.eventKey === 'pr:declined' || event.eventKey === 'pr:deleted') {
      const pr = event.pullRequest || {};
      return {
        type: 'pr.closed',
        repository: {
          id: repoId,
          fullName,
          provider: 'bitbucket',
        },
        pr: {
          number: pr.id || pr.number,
          sha: pr.fromRef?.latestCommit || pr.source?.commit?.hash || '',
          title: pr.title || '',
          baseBranch: pr.toRef?.displayId || pr.destination?.branch?.name || '',
          headBranch: pr.fromRef?.displayId || pr.source?.branch?.name || '',
        },
        installationId: installation.id,
      };
    }

    if (event.eventKey === 'build:status' || event.eventKey === 'build:completed') {
      return {
        type: 'ci.completed',
        repository: {
          id: repoId,
          fullName,
          provider: 'bitbucket',
        },
        installationId: installation.id,
      };
    }

    throw new Error(`Unsupported event type: ${event.eventKey}`);
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
          provider: 'bitbucket',
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
        provider: 'bitbucket',
        defaultBranch: 'main',
      },
    });

    return repo.id;
  }
}

export const bitbucketWebhookHandler = new BitbucketWebhookHandler();
