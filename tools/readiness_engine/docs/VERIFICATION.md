# Readiness Engine Verification Guide

This document describes how to verify the Readiness Engine is working correctly.

## Prerequisites

```bash
cd tools/readiness_engine
pip install -e ".[dev]"
```

## Test 1: Passing Run

Verify the engine runs successfully with no issues:

```bash
# Navigate to a clean project
cd /path/to/clean-project

# Run engine
readiness-engine \
  --project-root . \
  --output-dir ./test-output \
  --skip-tools eslint,typescript,build,vitest,playwright

# Verify exit code 0
echo $?  # Should print 0

# Check outputs exist
ls test-output/
# Should show: readiness.json, readiness.md, findings.csv, evidence.zip

# Check JSON structure
cat test-output/readiness.json | jq '.ready'  # Should be true
cat test-output/readiness.json | jq '.metrics.total_findings'  # Should be 0
```

## Test 2: Intentional Failure

Create a failing scenario and verify detection:

### Step 1: Create a Type Error

```bash
# Create a file with a type error
echo "const x: string = 123;" > /tmp/test-error.ts
```

### Step 2: Run Engine on Project with Known Issues

```bash
cd /path/to/readylayer

# Run only type check
readiness-engine \
  --project-root . \
  --output-dir ./test-failure-output \
  --skip-tools eslint,build,vitest,playwright

# Should exit with code 1 (blockers found)
echo $?  # Should print 1

# Check findings
cat ./test-failure-output/readiness.json | jq '.metrics.blocker_count'
# Should be > 0
```

### Step 3: Verify Classification

```bash
# Check that type errors are classified as BLOCKER
cat ./test-failure-output/readiness.json | jq '.findings[] | select(.severity == "BLOCKER") | .category'
# Should show "type"

# Check that ESLint errors are HIGH
cat ./test-failure-output/readiness.json | jq '.findings[] | select(.severity == "HIGH" and .tool == "eslint")'
```

## Test 3: Visual Regression Detection

### Step 1: Intentionally Break a Visual Test

```bash
# Modify a component to change its appearance
# Example: Change a color in a component
```

### Step 2: Run Visual Tests

```bash
npm run test:visual
# Tests should fail due to visual diff
```

### Step 3: Verify Engine Detects It

```bash
readiness-engine \
  --project-root . \
  --output-dir ./visual-test-output \
  --skip-tools eslint,typescript,build,vitest

# Check for visual findings
cat ./visual-test-output/readiness.json | jq '.findings[] | select(.category == "ui")'

# Evidence should include screenshots
cat ./visual-test-output/readiness.json | jq '.findings[].evidence[] | select(.type == "screenshot")'
```

## Test 4: CI Integration

### Local CI Simulation

```bash
# Run the full CI workflow locally
act -j readiness-assessment

# Or manually simulate:
npm run lint 2>&1 | tee lint-output.txt
npm run type-check 2>&1 | tee typecheck-output.txt
npm run build 2>&1 | tee build-output.txt
npm test 2>&1 | tee test-output.txt

# Run engine
readiness-engine \
  --project-root . \
  --output-dir ./readiness-output

# Verify artifacts
ls -la readiness-output/
```

## Test 5: Evidence Bundle

### Verify ZIP Contents

```bash
# Unzip evidence
unzip -l readiness-output/evidence.zip

# Should contain:
# - Screenshots (if visual tests failed)
# - Traces (if Playwright tests ran)
# - report-summary.json

# Extract and verify
unzip readiness-output/evidence.zip -d /tmp/evidence-test/
cat /tmp/evidence-test/report-summary.json
```

## Test 6: CSV Export

### Verify CSV Format

```bash
# Check CSV headers
cat readiness-output/findings.csv | head -1
# Should be: severity,category,rule_id,title,location,line,column,tool,remediation

# Verify sorting (BLOCKERS first)
cat readiness-output/findings.csv | tail -n +2 | cut -d',' -f1 | sort -u
# Should show BLOCKER before HIGH, etc.
```

## Test 7: Markdown Report

### Verify Markdown Structure

```bash
# Check sections exist
grep -E "^# " readiness-output/readiness.md  # Should have title
grep -E "^## " readiness-output/readiness.md  # Should have sections
grep -E "^### " readiness-output/readiness.md  # Should have findings

# Verify verdict is clear
grep -E "(READY FOR PRODUCTION|NOT READY)" readiness-output/readiness.md
```

## Test 8: Severity Classification

### Manual Verification

Create a test to verify classification rules:

```python
from readiness_engine.models import Finding, Category, Severity
from readiness_engine.classifiers import SeverityClassifier

classifier = SeverityClassifier()

# Test 1: Type error should be BLOCKER
type_error = Finding(
    rule_id="TS7006",
    category=Category.TYPE,
    severity=Severity.HIGH,  # Initial
    title="Test",
    description="Test",
    location="test.ts",
    tool="typescript",
)
classifier.classify(type_error)
assert type_error.severity == Severity.BLOCKER, "Type error should be BLOCKER"

# Test 2: Visual on critical route should be HIGH
visual_critical = Finding(
    rule_id="playwright/visual-regression",
    category=Category.UI,
    severity=Severity.MEDIUM,
    title="Visual regression",
    description="Test",
    location="homepage-loaded",
    tool="playwright",
)
classifier.classify(visual_critical)
assert visual_critical.severity == Severity.HIGH, "Visual on homepage should be HIGH"

print("All classification tests passed!")
```

## Continuous Verification

Add to your CI:

```yaml
- name: Verify Readiness Engine
  run: |
    # Verify outputs exist
    test -f readiness-output/readiness.json
    test -f readiness-output/readiness.md
    test -f readiness-output/findings.csv
    test -f readiness-output/evidence.zip

    # Verify JSON is valid
    jq '.' readiness-output/readiness.json > /dev/null

    # Verify structure
    jq -e '.version' readiness-output/readiness.json
    jq -e '.timestamp' readiness-output/readiness.json
    jq -e '.metrics' readiness-output/readiness.json
```

## Debugging

### Enable Verbose Output

```bash
readiness-engine -v --project-root . --output-dir ./debug
```

### Check Tool Outputs

```bash
# Inspect what the engine sees
cat lint-output.txt
cat typecheck-output.txt
```

### Validate Parsers

```python
from readiness_engine.parsers import ESLintParser
from readiness_engine.models import ToolOutput

parser = ESLintParser()
output = ToolOutput(
    tool="eslint",
    raw_output=open('lint-output.txt').read(),
    exit_code=1,
)
findings = parser.parse(output)
print(f"Found {len(findings)} findings")
for f in findings[:5]:
    print(f"  - {f.severity.value}: {f.title}")
```

## Success Criteria

The Readiness Engine is working correctly when:

1. ✅ All output files are generated
2. ✅ JSON is valid and complete
3. ✅ Markdown is human-readable
4. ✅ CSV can be opened in spreadsheet
5. ✅ Evidence bundle contains relevant files
6. ✅ Exit code reflects readiness (0 = ready, 1 = not ready)
7. ✅ Severity classification is accurate
8. ✅ CI gates properly on blockers/high severity
9. ✅ Tool outputs are correctly parsed
10. ✅ Findings have appropriate evidence attached
