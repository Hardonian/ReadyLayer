import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '@/services/billing/stripe-webhook-handler';
import { parseCoverageArtifact } from '@/lib/coverage';

describe('billing and CI contracts', () => {
  it('verifies Stripe signatures with timestamp tolerance and rejects tampering', () => {
    const payload = JSON.stringify({ id: 'evt_test' });
    const secret = 'whsec_test_secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    const signature = `t=${timestamp},v1=${digest}`;

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(`${payload} `, signature, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, `t=${timestamp - 301},v1=${digest}`, secret)).toBe(false);
  });

  it('normalizes LCOV artifacts into line, function, and branch coverage', async () => {
    const artifact = new Blob([
      'TN:\nSF:src/index.ts\nLF:10\nLH:8\nFNF:4\nFNH:3\nBRF:2\nBRH:1\nend_of_record\n',
    ]);
    const result = await parseCoverageArtifact(artifact);

    expect(result).toMatchObject({
      lines: { total: 10, covered: 8, percentage: 80 },
      functions: { total: 4, covered: 3, percentage: 75 },
      branches: { total: 2, covered: 1, percentage: 50 },
    });
  });
});
