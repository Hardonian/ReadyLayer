# Readiness Engine

AI Code Readiness Aggregator for the ReadyLayer platform.

Judges whether a codebase is production-ready using evidence, invariants, and auditable artifacts.

## Overview

The Readiness Engine is a Python-based tool that:

- Consumes outputs from existing tooling (TypeScript, ESLint, Playwright, build, visual tests)
- Normalizes them into a single structured readiness verdict
- Emits machine- and human-readable evidence bundles
- Gates CI based on invariant violations

## Installation

```bash
cd tools/readiness_engine
pip install -e ".[dev]"
```

Or for production:

```bash
pip install readiness-engine
```

## Usage

### Command Line

```bash
# Run full assessment
readiness-engine --project-root . --output-dir ./readiness-output

# Skip specific tools
readiness-engine --skip-tools playwight,build

# Don't fail on high severity (only blockers)
readiness-engine --no-fail-on-high
```

### As a Module

```bash
python -m readiness_engine --project-root . --output-dir ./output
```

### Programmatic API

```python
from pathlib import Path
from readiness_engine import ReadinessEngine

engine = ReadinessEngine("my-project", Path("."))
verdict = engine.assess_readiness()

if verdict.ready:
    print("Ready for production!")
else:
    print(f"Not ready: {verdict.metrics.blocker_count} blockers")
```

## Severity Rules

### BLOCKER
- Build failure
- TypeScript type errors
- Missing modules
- Route hard-500 errors

### HIGH
- Visual regression on critical routes (homepage, signin, dashboard, billing)
- E2E test failures
- Console errors
- ESLint errors

### MEDIUM
- Build warnings
- Non-critical visual regressions
- Lint warnings

### LOW
- Cosmetic issues
- Suggestions

## Output Files

The engine generates:

- `readiness.json` - Machine-readable full report
- `readiness.md` - Human-readable summary
- `findings.csv` - Triage spreadsheet
- `evidence.zip` - Bundle with screenshots, traces, logs

## CI Integration

The engine is designed to integrate with CI pipelines:

```yaml
- name: Run Readiness Engine
  run: |
    cd tools/readiness_engine
    pip install -e .
    readiness-engine \
      --project-root ../.. \
      --output-dir ../../readiness-output \
      --fail-on-blocker \
      --fail-on-high
```

Exit codes:
- `0` - Ready for production
- `1` - Blockers or high severity issues found (when configured)

## Reusability

This engine is designed to be reusable by other projects:

1. **Settler** - Can use the same engine with custom severity rules
2. **AIAS** - Can integrate the engine into its assessment pipeline
3. **Keys** - Can use the CLI or API to gate releases

To adapt for another project:

1. Install the package
2. Create a custom severity classifier if needed
3. Configure tool skip list for project-specific needs
4. Integrate into CI workflow

## Architecture

```
┌─────────────────────────────────────────┐
│           ReadinessEngine               │
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Parsers │ │Severity │ │Formatters│  │
│  │         │ │Classifier│ │          │  │
│  │• ESLint │ │         │ │• JSON    │  │
│  │• TypeScript│        │ │• Markdown│  │
│  │• Build  │ │         │ │• CSV     │  │
│  │• Playwright         │ │          │  │
│  │• Vitest │ │         │ │          │  │
│  └─────────┘ └─────────┘ └──────────┘  │
├─────────────────────────────────────────┤
│           EvidenceBundler               │
└─────────────────────────────────────────┘
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type check
mypy src/readiness_engine

# Lint
ruff src/readiness_engine
black src/readiness_engine
```

## License

MIT
