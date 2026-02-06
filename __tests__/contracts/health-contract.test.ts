import { describe, it, expect } from 'vitest';
import { healthResponseSchema } from '@/lib/contracts/health';
import { GET } from '@/app/api/health/route';

describe('Health endpoint contract', () => {
  it('returns a response matching the health contract schema', async () => {
    const response = await GET();
    const body = await response.json();

    const parsed = healthResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
