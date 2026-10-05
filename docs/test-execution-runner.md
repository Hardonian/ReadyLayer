# Container Test Execution

ReadyLayer executes generated tests in a disposable Docker container in production. Generated source and test files are copied into an ephemeral Docker-managed workspace volume, avoiding host bind mounts. The runner disables networking, uses a read-only root filesystem, drops Linux capabilities, applies CPU, memory, PID, output, and timeout limits, runs as an unprivileged user, and removes the container and workspace after completion.

## Build And Verify

Start a Docker daemon, then build the base runner image:

```powershell
npm run test-runner:build
$env:READYLAYER_TEST_EXECUTION_MODE='container'
$env:READYLAYER_TEST_RUNNER_IMAGE='readylayer-test-runner:local'
npm run test-runner:smoke
```

The smoke test runs a real Mocha test, checks coverage, and exits non-zero on any runner failure.

## Production Configuration

Set the following deployment variables:

```text
READYLAYER_TEST_EXECUTION_MODE=container
READYLAYER_TEST_RUNNER_IMAGE=registry.example.com/readylayer-test-runner:2026-10-05
READYLAYER_TEST_RUNNER_MEMORY_MB=512
READYLAYER_TEST_RUNNER_CPU_LIMIT=1
READYLAYER_TEST_RUNNER_MAX_OUTPUT_BYTES=1000000
```

The base image supports Vitest, Jest, Mocha with `c8` and TypeScript via `tsx`, and pytest with `pytest-cov`. It is intentionally network-isolated. A generated test that imports project packages needs a derived runner image with those dependencies already installed; dependencies are never downloaded during execution.

## Development Simulation

Development defaults to deterministic simulation for fast local iteration. Production defaults to the container mode. `READY_LAYER_ALLOW_SIMULATED_TEST_EXECUTION=true` is an explicit emergency override and should not be used for governance decisions.

## Failure Behavior

ReadyLayer fails closed when Docker is unavailable, the image is missing, the image cannot run, output exceeds its limit, a test times out, or measured coverage is below the configured threshold. Jobs receive a durable failure or timeout result rather than a synthetic success.
