# ReadyLayer Runner

ReadyLayer Runner is a portable, deterministic Go sidecar that executes checks and emits verifiable JSON output. It is OSS-first, has no telemetry, and makes no network calls.

## Why

- **Portability**: single static binary per platform.
- **Determinism**: stable ordering + hashed evidence.
- **Composability**: schema-first contracts for adapters and UIs.
- **Resilience**: no native Node dependencies in the runner path.

## Build

```bash
go build -o bin/ready-layer-runner ./cmd/ready-layer-runner
```

## Run

```bash
./bin/ready-layer-runner --config .readylayer/runner.config.json --output .readylayer/runner_output.json
```

## Output layout

```
output_dir/
  runner_output.json
  evidence/
    logs/
      01-check.stdout.log
      01-check.stderr.log
    artifacts/
```

## Artifact size metrics

Capture artifact size metrics (useful for CI/ops baselining):

```bash
node scripts/runner-artifact-metrics.mjs output_dir
```

## Schemas

- Input: `schemas/runner_input.schema.json`
- Output: `schemas/runner_output.schema.json`

## OSS + Enterprise

Runner is optional and fully OSS. Enterprise Cloud is an optional managed service and does not unlock OSS functionality.
