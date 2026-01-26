# Determinism guarantees

ReadyLayer's Rust policy evaluator and SARIF generator are designed to be deterministic, portable, and auditable.

## Deterministic inputs

- Facts and findings are normalized with stable sorting.
- Rules are normalized with stable ordering and sorted required actions.
- JSON output uses stable field ordering and SHA-256 hashes of inputs and rules.

## Evidence hashes

Policy decisions include SHA-256 hashes of the facts and policy rules used for evaluation. This allows external auditors to recompute hashes and verify integrity without relying on ReadyLayer services.

## No side effects

The Rust evaluator and SARIF generator perform no network calls and only read/write the files you pass via CLI flags.

## Compatibility

The TypeScript UI can operate without the Rust binaries by allowing manual import of facts and decisions. When binaries are available, the wrapper scripts validate outputs against schemas.
