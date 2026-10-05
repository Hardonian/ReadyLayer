import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/usage-enforcement', () => ({
  usageEnforcementService: { checkLLMRequest: vi.fn().mockResolvedValue(undefined) },
}));

import { LLMService } from '@/services/llm';

describe('LLM provider fallback', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('falls back from the default provider to another configured provider', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
    vi.stubEnv('DEFAULT_LLM_PROVIDER', 'openai');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'upstream unavailable' } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        content: [{ type: 'text', text: 'fallback response' }],
        usage: { input_tokens: 4, output_tokens: 3 },
      }), { status: 200 }));

    const response = await new LLMService().complete({
      prompt: 'Return a short answer.',
      organizationId: 'org_test',
      model: 'gpt-4-turbo-preview',
      cache: false,
    });

    expect(response.content).toBe('fallback response');
    expect(response.model).toBe('claude-3-opus-20240229');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
