/**
 * GitLab Webhook Handler
 * 
 * Handles GitLab webhooks with token-based validation
 * Normalizes events to internal format
 */

import { prisma } from '../../lib/prisma';
import { queueService } from '../../queue';

export interface GitLabWebhookEvent {
  object_kind: string;
  object_attributes?: any;
  merge_request?: any;
  pipeline?: any;
  project?: any;
  user?: any;
}

export interface NormalizedEvent {
  type: 'pr.opened' | 'pr.updated' | 'pr.closed' | 'ci.completed' | 'merge.completed';
  repository: {
    id: string;
    fullName: string;
    provider: 'gitlab';
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

export class GitLabWebhookHandler {
  /**
   * Validate webhook token
   */
  validateToken(_payload: string, token: string, secret: string): boolean {
    // GitLab uses token-based validation
    return token === secret;
  }

  /**
   * Handle webhook event
   */
  async handleEvent(
    event: GitLabWebhookEvent,
    installationId: string,
    token: string
  ): Promise<void> {
    // Get installation
    const installation = await prisma.installation.findUnique({
      where: {
        provider_providerId: {
          provider: 'gitlab',
          providerId: installationId,
        },
      },
    });

    if (!installation || !installation.webhookSecret) {
      throw new Error('Installation not found or webhook secret not configured');
    }

    // Validate token
    const payload = JSON.stringify(event);
    if (!this.validateToken(payload, token, installation.webhookSecret)) {
      throw new Error('Invalid webhook token');
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
   * Normalize GitLab event to internal format
   */
  private async normalizeEvent(
    event: GitLabWebhookEvent,
    installation: any
  ): Promise<NormalizedEvent> {
    const project = event.project || {};
    const fullName = project.path_with_namespace || '';

    // Find or create repository
    const repoId = await this.getOrCreateRepository(fullName, installation.organizationId || installation.repositoryId);

    if (event.object_kind === 'merge_request') {
      const mr = event.object_attributes || event.merge_request || {};
      const action = mr.action || mr.state || '';

      if (action === 'open' || action === 'opened') {
        return {
          type: 'pr.opened',
          repository: {
            id: repoId,
            fullName,
            provider: 'gitlab',
          },
          pr: {
            number: mr.iid || mr.id,
            sha: mr.last_commit?.id || mr.sha || '',
            title: mr.title || '',
            baseBranch: mr.target_branch || '',
            headBranch: mr.source_branch || '',
          },
          installationId: installation.id,
        };
      }

      if (action === 'update' || action === 'synchronize') {
        return {
          type: 'pr.updated',
          repository: {
            id: repoId,
            fullName,
            provider: 'gitlab',
          },
          pr: {
            number: mr.iid || mr.id,
            sha: mr.last_commit?.id || mr.sha || '',
            title: mr.title || '',
            baseBranch: mr.target_branch || '',
            headBranch: mr.source_branch || '',
          },
          installationId: installation.id,
        };
      }

      if (action === 'merge' || action === 'merged') {
        return {
          type: 'merge.completed',
          repository: {
            id: repoId,
            fullName,
            provider: 'gitlab',
          },
          pr: {
            number: mr.iid || mr.id,
            sha: mr.merge_commit_sha || mr.last_commit?.id || '',
            title: mr.title || '',
            baseBranch: mr.target_branch || '',
            headBranch: mr.source_branch || '',
          },
          installationId: installation.id,
        };
      }

      if (action === 'close' || action === 'closed') {
        return {
          type: 'pr.closed',
          repository: {
            id: repoId,
            fullName,
            provider: 'gitlab',
          },
          pr: {
            number: mr.iid || mr.id,
            sha: mr.last_commit?.id || mr.sha || '',
            title: mr.title || '',
            baseBranch: mr.target_branch || '',
            headBranch: mr.source_branch || '',
          },
          installationId: installation.id,
        };
      }
    }

    if (event.object_kind === 'pipeline') {
      const pipeline = event.object_attributes || event.pipeline || {};
      const status = pipeline.status || '';

      if (status === 'success' || status === 'failed' || status === 'canceled') {
        return {
          type: 'ci.completed',
          repository: {
            id: repoId,
            fullName,
            provider: 'gitlab',
          },
          installationId: installation.id,
        };
      }
    }

    throw new Error(`Unsupported event type: ${event.object_kind}`);
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
          provider: 'gitlab',
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
        provider: 'gitlab',
        defaultBranch: 'main',
      },
    });

    return repo.id;
  }
}

export const gitlabWebhookHandler = new GitLabWebhookHandler();
