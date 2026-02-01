# Readiness Intelligence

**Predictive Code Risk & Change Intelligence System** for ReadyLayer

Evolve ReadyLayer from a "pass/fail readiness judge" into a predictive system that anticipates failures before they happen.

## Features

### Phase 1: Historical Intelligence
- Ingest readiness.json artifacts from past runs
- Correlate failures to files, directories, authors, dependencies
- Compute failure frequency, regression density, mean-time-to-fix, flake probability

### Phase 2: Change Impact Analysis
- Predict which invariants are at risk from PR diffs
- Select only relevant tests + visual routes
- Estimate "readiness delta" BEFORE running CI

### Phase 3: Readiness Scorecard
- Produce readiness_scorecard.json and readiness_scorecard.md
- Current readiness score with trend vs last 10 runs
- Predicted risk areas with confidence intervals

### Phase 4: CI Optimization
- Low-risk PRs run reduced test sets
- High-risk PRs run full + stress suites
- All decisions are explainable and logged

## Installation

```bash
cd tools/readiness_intel
pip install -e ".[dev]"
# or
pip install readiness-intel
```

## Quick Start

### 1. Ingest Historical Data

```bash
# Ingest from directory of readiness artifacts
readiness-intel ingest ./readiness-artifacts --output dataset.json

# Or ingest from git history
readiness-intel ingest ./readiness-artifacts \
  --repo-path ../../ \
  --since-days 30 \
  --output dataset.json
```

### 2. Generate Scorecard

```bash
readiness-intel scorecard dataset.json \
  --readiness readiness.json \
  --output-json scorecard.json \
  --output-md scorecard.md
```

### 3. Analyze Change Impact

```bash
readiness-intel analyze dataset.json \
  --repo-path ../../ \
  --commit-sha abc123 \
  --branch feature-branch \
  --author developer@example.com
```

### 4. Optimize CI

```bash
readiness-intel optimize change_impact.json \
  --output-dir ./ci-config \
  --github-output $GITHUB_OUTPUT
```

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Analyze Change Impact
  run: |
    readiness-intel ingest ./artifacts --output dataset.json
    readiness-intel analyze dataset.json \
      --repo-path . \
      --commit-sha ${{ github.sha }} \
      --branch ${{ github.ref_name }} \
      --output change_impact.json
    readiness-intel optimize change_impact.json \
      --github-output $GITHUB_OUTPUT

- name: Run Tests (Optimized)
  run: |
    if [ "${{ steps.analyze.outputs.risk_level }}" = "CRITICAL" ]; then
      npm run test:full
    elif [ "${{ steps.analyze.outputs.risk_level }}" = "LOW" ]; then
      npm run test:reduced
    else
      npm run test:standard
    fi
```

## Architecture

```
readiness_intel/
├── ingestion/          # Artifact loading and normalization
│   └── loader.py       # ReadinessArtifactLoader, ArtifactIngestionPipeline
├── analysis/           # Core analytics
│   ├── historical.py   # HistoricalAnalyzer - failure metrics
│   ├── impact.py       # ChangeImpactAnalyzer - PR impact prediction
│   └── scorecard.py    # ScorecardGenerator - readiness reports
├── ci/                 # CI optimization
│   └── optimizer.py    # TestSelector, CIOptimizer
├── models.py           # Pydantic data models
└── cli.py              # Command-line interface
```

## Data Models

### HistoricalFinding
A readiness finding enriched with historical context:
- `rule_id`: The rule/check identifier
- `category`: type, lint, build, ui, infra, test, security
- `severity`: BLOCKER, HIGH, MEDIUM, LOW
- `location`: File path or test identifier
- `timestamp`, `commit_sha`, `branch`, `author`: Context

### FileRiskProfile
Risk profile for a specific file:
- `failure_frequency`: Failures per run
- `flaky_score`: Probability of test flakiness (0-1)
- `instability_trend`: improving, stable, degrading
- `top_issues`: Most common rule violations

### ChangeImpactAnalysis
Complete PR impact prediction:
- `overall_risk`: CRITICAL, HIGH, MEDIUM, LOW
- `predicted_readiness_delta`: Expected score change
- `invariant_risks`: At-risk invariants
- `recommended_test_strategy`: Test tier recommendation

### ReadinessScorecard
Comprehensive readiness report:
- `current_readiness_score`: 0-100
- `trend_direction`: improving, stable, degrading
- `predicted_risk_areas`: High-risk areas
- `confidence_interval`: Statistical bounds

## Metrics Computed

- **Failure Frequency**: How often a file fails across runs
- **Regression Density**: Failures per file in a directory
- **Mean Time to Fix**: Average hours to resolve issues
- **Flake Probability**: Likelihood of inconsistent test results
- **Instability Trend**: Whether file stability is improving/degrading
- **Risk Score**: Composite 0-1 risk metric

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src/readiness_intel

# Linting
ruff check src/readiness_intel
black src/readiness_intel
```

## License

Apache 2.0
