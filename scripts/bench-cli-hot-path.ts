import { spawnSync } from 'node:child_process';

interface BenchResult {
  command: string;
  ms: number;
  exit: number | null;
}

function bench(args: string[]): BenchResult {
  const start = process.hrtime.bigint();
  const result = spawnSync('npx', ['tsx', 'cli/readylayer-cli.ts', ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      READYLAYER_CLI_PERF: '1',
    },
  });
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

  if (result.status !== 0) {
    throw new Error(`Command failed: readylayer ${args.join(' ')}\n${result.stderr}`);
  }

  return {
    command: `readylayer ${args.join(' ')}`,
    ms: elapsedMs,
    exit: result.status,
  };
}

function enforceThreshold(result: BenchResult, thresholdMs: number): void {
  if (result.ms > thresholdMs) {
    throw new Error(`${result.command} took ${result.ms.toFixed(1)}ms (threshold ${thresholdMs}ms)`);
  }
}

function main(): void {
  const runs: BenchResult[] = [
    bench(['--help']),
    bench(['--version']),
    bench(['config']),
  ];

  const thresholds = {
    help: 2000,
    version: 2000,
    config: 2000,
  };

  enforceThreshold(runs[0], thresholds.help);
  enforceThreshold(runs[1], thresholds.version);
  enforceThreshold(runs[2], thresholds.config);

  process.stdout.write(`${JSON.stringify({ ok: true, runs, thresholds }, null, 2)}\n`);
}

main();
