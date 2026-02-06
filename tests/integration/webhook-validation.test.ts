import { describe, it, expect } from 'vitest';
import { gitHubWebhookEventSchema } from '../../lib/contracts/github-webhook';
import { GitLabWebhookEventSchema } from '../../app/api/webhooks/gitlab/route';
import { StripeEventSchema } from '../../app/api/webhooks/stripe/route';
import { BlockedPRNotificationSchema } from '../../app/api/webhooks/slack/blocked-pr/route';
import { SlackEventPayloadSchema } from '../../integrations/slack/events/route';

describe('Webhook Validation Schemas', () => {
  it('accepts a minimal GitHub webhook payload', () => {
    const result = gitHubWebhookEventSchema.safeParse({
      action: 'opened',
      repository: { full_name: 'org/repo' },
      pull_request: {
        number: 1,
        title: 'Test PR',
        head: { sha: 'abc', ref: 'feature' },
        base: { ref: 'main' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing GitLab object_kind', () => {
    const result = GitLabWebhookEventSchema.safeParse({
      project: { path_with_namespace: 'group/project' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a minimal Stripe event payload', () => {
    const result = StripeEventSchema.safeParse({
      id: 'evt_test',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_test' } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects Slack blocked PR payload missing required fields', () => {
    const result = BlockedPRNotificationSchema.safeParse({
      prNumber: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts Slack events URL verification payload', () => {
    const result = SlackEventPayloadSchema.safeParse({
      type: 'url_verification',
      challenge: 'challenge-token',
    });
    expect(result.success).toBe(true);
  });
});
