import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { gitHubWebhookEventSchema } from '@/lib/contracts/github-webhook';
import { GitHubWebhookHandler } from '@/integrations/github/webhook';

const fixturePath = join(__dirname, '..', 'fixtures', 'github-webhook-pr-opened.json');

describe('GitHub webhook contract', () => {
  it('validates the PR opened payload fixture', () => {
    const payload = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;
    const result = gitHubWebhookEventSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('verifies webhook signature for the fixture payload', () => {
    const secret = 'demo_webhook_secret';
    const rawPayload = readFileSync(fixturePath, 'utf-8');
    const signature = `sha256=${createHmac('sha256', secret).update(rawPayload).digest('hex')}`;

    const handler = new GitHubWebhookHandler();
    const isValid = handler.validateSignature(rawPayload, signature, secret);

    expect(isValid).toBe(true);
  });
});
