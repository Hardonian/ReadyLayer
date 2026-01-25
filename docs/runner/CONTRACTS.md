# ReadyLayer Runner Contracts

ReadyLayer Runner is schema-first. Input and output payloads are validated with JSON Schema.

## Schemas

- Input: `tools/ready-layer-runner/schemas/runner_input.schema.json`
- Output: `tools/ready-layer-runner/schemas/runner_output.schema.json`

## Versioning

`schema_version` in the output follows semantic versioning (semver). Backward-compatible changes increment the minor version; breaking changes increment the major version.

## Output integrity

Runner outputs include an `evidence_manifest` with SHA-256 hashes for:
- Input config JSON and diff references
- Output JSON file
- Logs and artifacts under `output_dir/evidence/`

Hashes are stored with stable, relative paths to ensure deterministic verification.

## Validation helper

Use `tools/ready-layer-runner/scripts/validate-output.mjs` to validate an output JSON file against the schema without any dependencies:

```bash
node tools/ready-layer-runner/scripts/validate-output.mjs \
  tools/ready-layer-runner/schemas/runner_output.schema.json \
  path/to/runner_output.json
```

## Error classification

`error_classification` indicates where a failure originated:
- `user_error`: check failures or command errors
- `repo_error`: git/diff or repository discovery failures
- `tool_error`: runner internal failures (e.g., serialization, filesystem errors)
