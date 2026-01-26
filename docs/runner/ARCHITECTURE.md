# ReadyLayer Runner Architecture

ReadyLayer Runner is a Go-based sidecar designed for deterministic execution and verifiable outputs. It is optional for OSS users and has no telemetry or network calls.

## Components

- **Config loader**: Reads and validates `runner_input` JSON with strict field checks.
- **Git discovery**: Uses `git diff --name-only` to list changed files with stable sorting.
- **Executor**: Runs check commands with timeouts via `sh -c` (or `cmd.exe /C` on Windows).
- **Evidence writer**: Writes stdout/stderr logs under `output_dir/evidence/logs/`.
- **Hasher**: Computes SHA-256 hashes for inputs and outputs with stable ordering.

## Determinism

- Checks are sorted by name/category.
- Changed files are sorted alphabetically.
- Evidence manifests use sorted keys in JSON output.

## Trust boundaries

- Runner accepts only local inputs and never performs network calls.
- All execution happens inside `repo_path` to minimize unexpected side effects.
- Redaction patterns and paths are applied to logs before writing.

## UI integration

The ReadyLayer web UI ingests `runner_output.json` in a public import page to visualize results without server-side execution.
