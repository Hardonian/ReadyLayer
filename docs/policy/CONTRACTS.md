# Policy contracts and determinism

ReadyLayer uses schema-first contracts to ensure policy evaluation is deterministic and auditable.

## Schemas

- `contracts/policy_facts.schema.json`
  - Normalized facts input to the policy evaluator.
  - Includes `schema_version` and optional metadata such as repo, diff summary, check results, findings, and risk signals.
- `contracts/policy_decision.schema.json`
  - Deterministic output from the evaluator.
  - Includes `policy_version`, `decision`, stable `reasons`, required actions, evidence hashes, and a deterministic statement.
- `contracts/findings.schema.json`
  - Normalized findings input for SARIF generation.
- `contracts/findings_summary.schema.json`
  - Compact summary output for UI display.

## Schema versioning rules

- `schema_version` is required for all contracts.
- Minor-compatible changes (adding optional fields) increment the patch version.
- Backwards-incompatible changes increment the major version and must ship with migration notes.

## Ordering and stability

All lists are expected to be sorted before evaluation or emission:

- Findings: by severity, category, file, line, rule id, message.
- Check results: by check id.
- Diff summary languages and changed files: lexicographic order.
- Reasons and required actions: lexicographic order.

Policy decisions must be reproducible from identical facts and rules.
