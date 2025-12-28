# ReadyLayer — Configuration Examples

## Overview

ReadyLayer uses YAML configuration files (`.readylayer.yml`) for repo-level and org-level settings. This document provides comprehensive configuration examples for all features.

---

## Repository Configuration (`.readylayer.yml`)

### Minimal Configuration
```yaml
# .readylayer.yml
review:
  enabled: true

test:
  enabled: true

docs:
  enabled: true
```

---

## Review Guard Configuration

### Basic Review Config
```yaml
review:
  enabled: true
  fail_on_critical: true
  fail_on_high: false
  fail_on_medium: false
  fail_on_low: false
```

### Advanced Review Config
```yaml
review:
  enabled: true
  
  # Block PR on critical/high issues
  fail_on_critical: true
  fail_on_high: true
  fail_on_medium: false
  fail_on_low: false
  
  # Rule configuration
  rules:
    # Enable/disable specific rules
    - id: security.sql-injection
      enabled: true
      severity: critical
    
    - id: security.secrets
      enabled: true
      severity: critical
    
    - id: quality.high-complexity
      enabled: true
      severity: high
      threshold: 15  # Custom threshold
    
    - id: style.missing-docstring
      enabled: false  # Disabled
    
    # AI-specific rules
    - id: ai.hallucination
      enabled: true
      severity: high
  
  # Severity overrides (override default severity)
  severity_overrides:
    security.sql-injection: critical
    quality.high-complexity: medium  # Lower severity for this repo
  
  # Exclude paths from review
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/*.test.ts"
    - "**/*.spec.ts"
    - "**/migrations/**"
  
  # Include only specific paths
  included_paths:
    - "src/**"
    - "lib/**"
  
  # Language-specific config
  languages:
    typescript:
      enabled: true
      rules: ["security", "quality"]
    python:
      enabled: true
      rules: ["security", "quality", "style"]
    java:
      enabled: false  # Skip Java files
```

---

## Test Engine Configuration

### Basic Test Config
```yaml
test:
  enabled: true
  framework: "jest"  # Auto-detect if not specified
  coverage_threshold: 80
```

### Advanced Test Config
```yaml
test:
  enabled: true
  
  # Framework (auto-detect if not specified)
  framework: "jest"  # jest, mocha, vitest, pytest, unittest, junit, etc.
  
  # Test placement
  placement: "co-located"  # co-located, separate, mirror, custom
  test_dir: "tests"  # If placement: separate
  pattern: "__tests__/{path}.test.ts"  # If placement: custom
  create_missing_dirs: true
  
  # AI detection
  ai_detection:
    methods:
      - "commit_message"  # Check commit messages
      - "author"  # Check commit author
      - "pattern"  # Pattern analysis (LLM)
    confidence_threshold: 0.7  # 0-1
    require_multiple_methods: false
  
  # Coverage enforcement
  coverage:
    threshold: 80  # Percentage (0-100)
    metric: "lines"  # lines, branches, functions
    enforce_on: "pr"  # pr, merge, both
    fail_on_below: true
  
  # Test generation
  generation:
    include_edge_cases: true
    include_error_cases: true
    match_existing_style: true
    max_tests_per_file: 20
  
  # Exclude paths
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"  # Don't generate tests for test files
    - "**/fixtures/**"
  
  # Framework-specific config
  frameworks:
    jest:
      config_file: "jest.config.js"
      test_match: ["**/*.test.ts", "**/*.spec.ts"]
    pytest:
      config_file: "pytest.ini"
      test_paths: ["tests/"]
```

---

## Doc Sync Configuration

### Basic Docs Config
```yaml
docs:
  enabled: true
  update_strategy: "pr"  # commit, pr, artifact
```

### Advanced Docs Config
```yaml
docs:
  enabled: true
  
  # Framework (auto-detect if not specified)
  framework: "express"  # express, fastify, flask, django, spring-boot
  
  # OpenAPI spec
  openapi:
    version: "3.1.0"  # 3.0, 3.1
    output_path: "docs/openapi.yaml"
    enhance_with_llm: true
    include_examples: true
  
  # Markdown documentation
  markdown:
    enabled: true
    output_path: "docs/api.md"
    template: "default"  # default, custom
    custom_template: "templates/api.md"  # If template: custom
  
  # Update strategy
  update_strategy: "pr"  # commit, pr, artifact
  branch: "main"  # Branch to commit/PR against
  commit_message: "docs: update API spec"  # Custom commit message
  
  # Artifact storage
  storage:
    type: "github_releases"  # github_releases, s3, registry, webhook
    repo: "acme/api-docs"  # If type: github_releases
    # Or for S3:
    # type: "s3"
    # bucket: "api-docs"
    # path: "openapi.yaml"
    # region: "us-east-1"
    # Or for webhook:
    # type: "webhook"
    # url: "https://example.com/webhook"
  
  # Drift prevention
  drift_prevention:
    enabled: true
    action: "auto_update"  # auto_update, alert, block
    check_on: "pr"  # pr, merge, both
  
  # Exclude paths
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"
    - "**/internal/**"
  
  # Include only specific paths
  included_paths:
    - "src/api/**"
    - "src/routes/**"
```

---

## Organization Configuration

### Org-Level Defaults
```yaml
# Org-level config (applies to all repos)
org:
  review:
    default_rules: ["security", "quality"]
    fail_on_critical: true
    fail_on_high: false
  
  test:
    default_framework: "jest"
    default_coverage_threshold: 80
  
  docs:
    default_update_strategy: "pr"
  
  # Billing
  billing:
    plan: "growth"  # starter, growth, scale
    billing_email: "billing@acme.com"
  
  # Notifications
  notifications:
    slack:
      enabled: true
      channel: "#engineering"
    email:
      enabled: true
      recipients: ["team@acme.com"]
```

---

## Complete Example

### Full Configuration
```yaml
# .readylayer.yml
# ReadyLayer Configuration

# Review Guard
review:
  enabled: true
  fail_on_critical: true
  fail_on_high: false
  fail_on_medium: false
  fail_on_low: false
  
  rules:
    - id: security.sql-injection
      enabled: true
      severity: critical
    - id: security.secrets
      enabled: true
      severity: critical
    - id: quality.high-complexity
      enabled: true
      severity: high
      threshold: 15
    - id: style.missing-docstring
      enabled: false
  
  severity_overrides:
    quality.high-complexity: medium
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"

# Test Engine
test:
  enabled: true
  framework: "jest"
  placement: "co-located"
  
  ai_detection:
    methods: ["commit_message", "author", "pattern"]
    confidence_threshold: 0.7
  
  coverage:
    threshold: 80
    metric: "lines"
    enforce_on: "pr"
    fail_on_below: true
  
  generation:
    include_edge_cases: true
    include_error_cases: true
    match_existing_style: true
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"

# Doc Sync
docs:
  enabled: true
  framework: "express"
  update_strategy: "pr"
  
  openapi:
    version: "3.1.0"
    output_path: "docs/openapi.yaml"
    enhance_with_llm: true
  
  markdown:
    enabled: true
    output_path: "docs/api.md"
  
  drift_prevention:
    enabled: true
    action: "auto_update"
    check_on: "pr"
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"
```

---

## Language-Specific Examples

### TypeScript/JavaScript (Express)
```yaml
review:
  enabled: true
  languages:
    typescript:
      enabled: true
      rules: ["security", "quality"]

test:
  enabled: true
  framework: "jest"
  placement: "co-located"

docs:
  enabled: true
  framework: "express"
```

### Python (Flask)
```yaml
review:
  enabled: true
  languages:
    python:
      enabled: true
      rules: ["security", "quality", "style"]

test:
  enabled: true
  framework: "pytest"
  placement: "separate"
  test_dir: "tests"

docs:
  enabled: true
  framework: "flask"
```

### Java (Spring Boot)
```yaml
review:
  enabled: true
  languages:
    java:
      enabled: true
      rules: ["security", "quality"]

test:
  enabled: true
  framework: "junit"
  placement: "mirror"

docs:
  enabled: true
  framework: "spring-boot"
```

---

## CI Integration Examples

### GitHub Actions
```yaml
# .github/workflows/readylayer.yml
name: ReadyLayer

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          fail-on-high: false
```

### GitLab CI
```yaml
# .gitlab-ci.yml
readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
  only:
    - merge_requests
```

---

## Environment Variables

### Required
```bash
READYLAYER_API_KEY=your_api_key_here
```

### Optional
```bash
READYLAYER_API_URL=https://api.readylayer.com/v1
READYLAYER_CONFIG_PATH=.readylayer.yml
READYLAYER_DEBUG=false
```

---

## Validation

### Config Validation
ReadyLayer validates configuration on:
1. **Repo setup:** When repo is first configured
2. **Config changes:** When `.readylayer.yml` is updated
3. **Runtime:** Before each review/test/doc generation

### Validation Errors
```yaml
# Invalid: missing required field
review:
  enabled: true
  # Missing fail_on_critical

# Invalid: invalid value
test:
  framework: "invalid_framework"  # Must be: jest, mocha, pytest, etc.

# Invalid: conflicting settings
review:
  excluded_paths: ["**/*.ts"]
  included_paths: ["src/**/*.ts"]  # Conflicts with excluded_paths
```

---

## Best Practices

1. **Start simple:** Begin with minimal config, add complexity as needed
2. **Use org defaults:** Set org-level defaults, override per repo
3. **Exclude vendor code:** Always exclude `vendor/`, `node_modules/`, etc.
4. **Test config:** Test config changes in a test repo first
5. **Version control:** Commit `.readylayer.yml` to repo
6. **Document overrides:** Document why you override defaults
7. **Review regularly:** Review config quarterly, adjust thresholds

---

## Migration Guide

### From v1 to v2
```yaml
# v1 (deprecated)
review:
  block_on_critical: true  # Deprecated

# v2 (current)
review:
  fail_on_critical: true  # Use fail_on_critical instead
```

---

## Support

- **Documentation:** https://docs.readylayer.com/config
- **Examples:** https://github.com/readylayer/examples
- **Support:** support@readylayer.com
