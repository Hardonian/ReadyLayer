import { afterEach, describe, expect, it, vi } from 'vitest';

import { executeTests } from '@/services/test-engine/executor';

describe('test execution production guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed rather than reporting simulated tests as executed in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('READY_LAYER_ALLOW_SIMULATED_TEST_EXECUTION', '');

    const result = await executeTests({
      filePath: 'src/example.ts',
      framework: 'vitest',
      sourceCode: 'export const value = 1;',
      testContent: 'it("works", () => expect(1).toBe(1));',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('READYLAYER_TEST_RUNNER_IMAGE is required');
  });

  it('keeps deterministic simulation available when explicitly enabled for a controlled environment', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSimulationFlag = process.env.READYLAYER_ALLOW_SIMULATED_TEST_EXECUTION;
    process.env.NODE_ENV = 'production';
    process.env.READYLAYER_ALLOW_SIMULATED_TEST_EXECUTION = 'true';

    try {
      const result = await executeTests({
        filePath: 'src/example.ts',
        framework: 'vitest',
        sourceCode: 'export const value = 1;',
        testContent: 'it("works", () => expect(1).toBe(1));',
      });

      expect(result.status).toBe('passed');
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalSimulationFlag === undefined) {
        delete process.env.READYLAYER_ALLOW_SIMULATED_TEST_EXECUTION;
      } else {
        process.env.READYLAYER_ALLOW_SIMULATED_TEST_EXECUTION = originalSimulationFlag;
      }
    }
  });
});
