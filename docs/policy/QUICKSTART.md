# ReadyLayer Policy Quickstart

This guide shows how to generate deterministic policy decisions and SARIF reports locally using the Rust CLIs.

## Prerequisites

- Rust toolchain installed (stable).
- Node.js 20.x for wrapper scripts.

## Build the CLIs

```bash
cargo build --release -p readylayer-policy -p readylayer-sarif
```

## Evaluate policy facts

```bash
pnpm readylayer:policy -- --facts facts.json --rules crates/readylayer-policy/resources/default-policy.yaml --out decision.json --explain
```

- Add `--strict` to return non-zero when the decision is `block`.
- `decision.json` conforms to `contracts/policy_decision.schema.json`.

## Generate SARIF + summary

```bash
pnpm readylayer:sarif -- --input findings.json --sarif out.sarif --summary summary.json
```

- `findings.json` must match `contracts/findings.schema.json`.
- `summary.json` matches `contracts/findings_summary.schema.json`.

## Manual verification UI

Open `/policy-verification` in the public site and upload `facts.json` and `decision.json` to validate the schemas and inspect decisions offline.
