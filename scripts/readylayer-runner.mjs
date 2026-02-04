import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const configFlagIndex = args.indexOf('--config');
const outputFlagIndex = args.indexOf('--output');

const repoRoot = resolve(process.cwd());
const defaultConfigPath = join(repoRoot, '.readylayer', 'runner.config.json');
const configPath = configFlagIndex >= 0 ? args[configFlagIndex + 1] : defaultConfigPath;
const outputPath = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : join(repoRoot, '.readylayer', 'runner_output.json');

if (configFlagIndex >= 0 && !configPath) {
  console.error('Missing value after --config');
  process.exit(2);
}

if (outputFlagIndex >= 0 && !outputPath) {
  console.error('Missing value after --output');
  process.exit(2);
}

const binPath = resolveRunnerBinary();

if (!existsSync(configPath)) {
  console.error(`Runner config not found at ${configPath}.`);
  console.error('Create one or follow docs in docs/runner/QUICKSTART.md.');
  process.exit(2);
}

await ensureOutputDir(outputPath);

await runBinary(binPath, configPath, outputPath);

const output = JSON.parse(await readFile(outputPath, 'utf-8'));
const status = output.summary?.pass ? 'PASS' : 'FAIL';
console.log(`ReadyLayer Runner ${status}: ${output.summary?.passed_checks ?? 0}/${output.summary?.total_checks ?? 0} checks passed.`);
console.log(`Output: ${outputPath}`);

function resolveRunnerBinary() {
  if (process.env.READY_LAYER_RUNNER_BIN) {
    return process.env.READY_LAYER_RUNNER_BIN;
  }

  const platform = process.platform;
  const arch = process.arch;
  const exe = platform === 'win32' ? 'ready-layer-runner.exe' : 'ready-layer-runner';
  const candidatePaths = [
    join(repoRoot, 'tools', 'ready-layer-runner', 'bin', `${platform}-${arch}`, exe),
    join(repoRoot, 'tools', 'ready-layer-runner', 'bin', exe),
    join(repoRoot, 'tools', 'ready-layer-runner', exe)
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  console.error('ReadyLayer Runner binary not found.');
  console.error('Build it with: (cd tools/ready-layer-runner && go build -o bin/ready-layer-runner ./cmd/ready-layer-runner)');
  process.exit(1);
}

async function runBinary(binaryPath, configFile, outputFile) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binaryPath, ['--config', configFile, '--output', outputFile], {
      stdio: 'inherit'
    });
    child.on('close', (code) => {
      if (code === 0 || code === 3) {
        resolvePromise();
        return;
      }
      reject(new Error(`Runner exited with code ${code}`));
    });
  });
}

async function ensureOutputDir(outputFile) {
  const outputDir = dirname(outputFile);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
}
