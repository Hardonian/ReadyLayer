# Readiness Engine Integration Guide

This guide explains how to integrate the Readiness Engine into other projects (Settler, AIAS, Keys).

## Quick Start

### 1. Install the Engine

```bash
# From the ReadyLayer repository
cd tools/readiness_engine
pip install -e .

# Or install from a published package (when available)
pip install readiness-engine
```

### 2. Basic Usage

```bash
# Run assessment
readiness-engine \
  --project-root /path/to/your/project \
  --output-dir ./readiness-output \
  --project-name your-project
```

### 3. CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Readiness Assessment
  run: |
    pip install readiness-engine
    readiness-engine \
      --project-root . \
      --output-dir ./readiness-output \
      --fail-on-blocker \
      --fail-on-high
```

## Customization

### Custom Severity Rules

Create a custom classifier:

```python
from readiness_engine.classifiers import SeverityClassifier
from readiness_engine.models import Finding, Severity

class CustomClassifier(SeverityClassifier):
    def classify(self, finding: Finding) -> None:
        # Apply default classification first
        super().classify(finding)
        
        # Custom rule: Treat all security findings as BLOCKER
        if finding.category == "security":
            finding.severity = Severity.BLOCKER
        
        # Custom rule: Deprecation warnings are LOW not MEDIUM
        if "deprecated" in finding.rule_id.lower():
            finding.severity = Severity.LOW
```

### Custom Parsers

Add support for custom tools:

```python
from readiness_engine.parsers import BaseParser
from readiness_engine.models import Finding, Category, Severity

class CustomToolParser(BaseParser):
    def parse(self, output: ToolOutput) -> List[Finding]:
        findings = []
        # Parse your tool's output format
        for line in output.raw_output.split('\n'):
            if 'ERROR' in line:
                finding = Finding(
                    rule_id="custom/error",
                    category=Category.INFRA,
                    severity=Severity.HIGH,
                    title=line,
                    description=line,
                    location="custom-tool",
                    tool="custom",
                )
                findings.append(finding)
        return findings
```

### Project-Specific Configuration

Create a `readiness.config.json`:

```json
{
  "project": "settler",
  "severity_overrides": {
    "@typescript-eslint/no-unused-vars": "LOW",
    "build/warnings-present": "LOW"
  },
  "skip_tools": ["playwright"],
  "critical_routes": [
    "onboarding",
    "setup",
    "dashboard"
  ]
}
```

## Project-Specific Integration

### Settler

Settler focuses on infrastructure-as-code validation:

```bash
readiness-engine \
  --project-root . \
  --skip-tools eslint,typescript \
  --output-dir ./readiness-output \
  --fail-on-blocker
```

**Customizations:**
- Skip frontend tools (Settler is backend-focused)
- Add Terraform/CloudFormation parsers
- Lower severity for documentation issues

### AIAS

AIAS requires strict type safety:

```bash
readiness-engine \
  --project-root . \
  --output-dir ./readiness-output \
  --fail-on-blocker \
  --fail-on-high
```

**Customizations:**
- All type errors are BLOCKER (default)
- Strict lint rules (no warnings allowed)
- Comprehensive E2E coverage required

### Keys

Keys focuses on security and performance:

```bash
readiness-engine \
  --project-root . \
  --output-dir ./readiness-output \
  --fail-on-blocker
```

**Customizations:**
- Custom security scanner parser
- Performance regression tests
- Cryptographic validation checks

## Output Consumption

### Read the JSON Report

```python
import json

with open('readiness-output/readiness.json') as f:
    report = json.load(f)

if not report['ready']:
    print(f"Blockers: {report['metrics']['blocker_count']}")
    for finding in report['findings']:
        if finding['severity'] == 'BLOCKER':
            print(f"  - {finding['title']}")
```

### Use in PR Checks

```python
# .github/scripts/check-readiness.py
import json
import sys

with open('readiness-output/readiness.json') as f:
    report = json.load(f)

# Post PR comment with results
# Fail if not ready
sys.exit(0 if report['ready'] else 1)
```

## Troubleshooting

### Tool Not Found

If a tool isn't available in your project:

```bash
readiness-engine --skip-tools playwright,build
```

### Timeout Issues

Increase timeout in custom engine:

```python
from readiness_engine.engine import ReadinessEngine

class CustomEngine(ReadinessEngine):
    def run_tool(self, tool_name: str, command: List[str]) -> ToolOutput:
        # Increase timeout to 10 minutes
        return super().run_tool_with_timeout(tool_name, command, timeout=600)
```

### Large Evidence Bundles

If evidence.zip is too large:

```python
from readiness_engine.bundler import EvidenceBundler

class SizeLimitedBundler(EvidenceBundler):
    def create_bundle(self, verdict, output_path):
        # Only include first 10 screenshots
        limited_findings = []
        screenshot_count = 0
        
        for finding in verdict.findings:
            limited_evidence = []
            for ev in finding.evidence:
                if ev.type == 'screenshot':
                    if screenshot_count < 10:
                        limited_evidence.append(ev)
                        screenshot_count += 1
                else:
                    limited_evidence.append(ev)
            
            finding.evidence = limited_evidence
            limited_findings.append(finding)
        
        verdict.findings = limited_findings
        super().create_bundle(verdict, output_path)
```

## Support

For issues or questions:
- Check the [README](./README.md)
- Review examples in `examples/`
- File an issue in the ReadyLayer repository
