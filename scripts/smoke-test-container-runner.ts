import { executeContainerTests } from '../services/test-engine/container-executor';

async function main(): Promise<void> {
  const image = process.env.READYLAYER_TEST_RUNNER_IMAGE;
  if (!image) {
    throw new Error('Set READYLAYER_TEST_RUNNER_IMAGE before running the container runner smoke test.');
  }

  const result = await executeContainerTests({
    filePath: 'src/math.ts',
    framework: 'mocha',
    sourceCode: 'export const add = (left: number, right: number): number => left + right;',
    testContent: [
      "import assert from 'node:assert/strict';",
      "import { add } from './math';",
      "describe('math', () => {",
      "  it('adds values', () => assert.equal(add(2, 3), 5));",
      '});',
    ].join('\n'),
    coverageThreshold: 80,
    timeoutMs: 30_000,
  });

  if (result.status !== 'passed' || !result.meetsThreshold) {
    throw new Error(`Container runner smoke test failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify({
    status: result.status,
    testsPassed: result.testsPassed,
    coverage: result.coverage.lines.percentage,
    durationMs: result.durationMs,
    image,
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Container runner smoke test failed.');
  process.exit(1);
});
