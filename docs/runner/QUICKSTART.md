# ReadyLayer Runner Quickstart (10 Minutes)

ReadyLayer Runner is an optional, OSS-first execution engine that runs checks locally or in CI and emits verifiable JSON output. It has **no telemetry**, makes **no network calls**, and does **not require** the web UI to operate.

## 1) Build the runner binary

```bash
cd tools/ready-layer-runner
go build -o bin/ready-layer-runner ./cmd/ready-layer-runner
```

## 2) Create a config file

Create `.readylayer/runner.config.json` at the repo root:

```json
{
  "repo_path": ".",
  "diff_base": "HEAD~1",
  "diff_head": "HEAD",
  "checks": [
    {
      "name": "Unit Tests",
      "category": "test_engine",
      "command": "npm test",
      "timeout_seconds": 600,
      "allow_failure": false
    }
  ],
  "output_dir": ".readylayer/output",
  "redaction": {
    "patterns": ["SECRET_TOKEN"],
    "paths": ["/Users/example/.npmrc"]
  },
  "mode": "local"
}
```

## 3) Run with the Node wrapper

```bash
pnpm readylayer:run
```

This writes `runner_output.json` into `.readylayer/` and logs into `.readylayer/output/evidence/logs/`.

## 4) Import into the ReadyLayer UI

Open the public import page and load the JSON:

```
/app/(public)/runner-import
```

No authentication or backend is required.

## 5) Verify output integrity

Hashes are recorded in `evidence_manifest` inside `runner_output.json`. Use them to verify logs and artifacts locally.

---

**Notes**
- Runner is optional; the web UI remains functional without it.
- Enterprise Cloud is optional and does not unlock OSS functionality.
