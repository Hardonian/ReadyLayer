# ReadyLayer — CI/CD Integration Examples

## Overview

ReadyLayer integrates with CI/CD pipelines to enforce quality gates, run tests, and update status checks. This document provides copy-paste ready examples for GitHub Actions, GitLab CI, and other CI systems.

---

## GitHub Actions

### Example 1: Review Only
```yaml
# .github/workflows/readylayer-review.yml
name: ReadyLayer Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          repo-id: ${{ github.repository }}
          fail-on-critical: true
          fail-on-high: false
```

### Example 2: Review + Coverage
```yaml
# .github/workflows/readylayer-review-coverage.yml
name: ReadyLayer Review and Coverage

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review-and-coverage:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=lcov
      
      - name: ReadyLayer Review and Coverage
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          coverage-threshold: 80
          coverage-report: coverage/lcov.info
```

### Example 3: Review + Test Generation
```yaml
# .github/workflows/readylayer-review-tests.yml
name: ReadyLayer Review and Test Generation

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review-and-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: ReadyLayer Review and Generate Tests
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          generate-tests: true
          test-framework: jest
      
      - name: Run generated tests
        run: npm test
```

### Example 4: Full Pipeline (Review + Tests + Coverage)
```yaml
# .github/workflows/readylayer-full.yml
name: ReadyLayer Full Pipeline

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          fail-on-high: false
  
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage --coverageReporters=lcov
      
      - name: ReadyLayer Coverage Check
        uses: readylayer/action-coverage@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          threshold: 80
          coverage-report: coverage/lcov.info
          fail-on-below: true
```

### Example 5: Python Project
```yaml
# .github/workflows/readylayer-python.yml
name: ReadyLayer Python

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
  
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests with coverage
        run: pytest --cov=. --cov-report=xml
      
      - name: ReadyLayer Coverage Check
        uses: readylayer/action-coverage@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          threshold: 80
          coverage-report: coverage.xml
          fail-on-below: true
```

---

## GitLab CI

### Example 1: Review Only
```yaml
# .gitlab-ci.yml
stages:
  - review

readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
  only:
    - merge_requests
  variables:
    READYLAYER_API_KEY: $READYLAYER_API_KEY
```

### Example 2: Review + Coverage
```yaml
# .gitlab-ci.yml
stages:
  - test
  - review

test:
  image: node:18
  stage: test
  script:
    - npm ci
    - npm test -- --coverage --coverageReporters=lcov
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/lcov.info

readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical --coverage-threshold 80 --coverage-report coverage/lcov.info
  dependencies:
    - test
  only:
    - merge_requests
  variables:
    READYLAYER_API_KEY: $READYLAYER_API_KEY
```

### Example 3: Python Project
```yaml
# .gitlab-ci.yml
stages:
  - test
  - review

test:
  image: python:3.11
  stage: test
  script:
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
    - pytest --cov=. --cov-report=xml
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    paths:
      - coverage.xml

readylayer-review:
  image: python:3.11
  stage: review
  script:
    - pip install readylayer-cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical --coverage-threshold 80 --coverage-report coverage.xml
  dependencies:
    - test
  only:
    - merge_requests
  variables:
    READYLAYER_API_KEY: $READYLAYER_API_KEY
```

---

## CircleCI

### Example 1: Review + Coverage
```yaml
# .circleci/config.yml
version: 2.1

jobs:
  review:
    docker:
      - image: node:18
    steps:
      - checkout
      - run:
          name: Install ReadyLayer CLI
          command: npm install -g @readylayer/cli
      - run:
          name: ReadyLayer Review
          command: readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
  
  test:
    docker:
      - image: node:18
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Run tests with coverage
          command: npm test -- --coverage --coverageReporters=lcov
      - run:
          name: ReadyLayer Coverage Check
          command: readylayer coverage --api-key $READYLAYER_API_KEY --threshold 80 --coverage-report coverage/lcov.info --fail-on-below
      - store_artifacts:
          path: coverage/lcov.info

workflows:
  version: 2
  review-and-test:
    jobs:
      - review
      - test
```

---

## Jenkins

### Example 1: Review + Coverage (Jenkinsfile)
```groovy
// Jenkinsfile
pipeline {
  agent any
  
  environment {
    READYLAYER_API_KEY = credentials('readylayer-api-key')
  }
  
  stages {
    stage('Review') {
      steps {
        sh 'npm install -g @readylayer/cli'
        sh 'readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical'
      }
    }
    
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm test -- --coverage --coverageReporters=lcov'
      }
    }
    
    stage('Coverage Check') {
      steps {
        sh 'readylayer coverage --api-key $READYLAYER_API_KEY --threshold 80 --coverage-report coverage/lcov.info --fail-on-below'
      }
    }
  }
  
  post {
    always {
      archiveArtifacts artifacts: 'coverage/lcov.info', fingerprint: true
    }
  }
}
```

---

## Azure DevOps

### Example 1: Review + Coverage (azure-pipelines.yml)
```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  pull_requests:
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Review
    jobs:
      - job: Review
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: |
              npm install -g @readylayer/cli
              readylayer review --api-key $(READYLAYER_API_KEY) --fail-on-critical
            env:
              READYLAYER_API_KEY: $(READYLAYER_API_KEY)
  
  - stage: Test
    jobs:
      - job: Test
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm ci
          - script: npm test -- --coverage --coverageReporters=lcov
          - script: |
              readylayer coverage --api-key $(READYLAYER_API_KEY) --threshold 80 --coverage-report coverage/lcov.info --fail-on-below
            env:
              READYLAYER_API_KEY: $(READYLAYER_API_KEY)
          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: 'coverage/lcov.info'
```

---

## Bitbucket Pipelines

### Example 1: Review + Coverage
```yaml
# bitbucket-pipelines.yml
image: node:18

pipelines:
  pull-requests:
    '**':
      - step:
          name: Review
          script:
            - npm install -g @readylayer/cli
            - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
      - step:
          name: Test
          script:
            - npm ci
            - npm test -- --coverage --coverageReporters=lcov
            - readylayer coverage --api-key $READYLAYER_API_KEY --threshold 80 --coverage-report coverage/lcov.info --fail-on-below
          artifacts:
            - coverage/lcov.info
```

---

## Common Patterns

### Conditional Execution (Only on PRs)
```yaml
# GitHub Actions
on:
  pull_request:
    types: [opened, synchronize]

# GitLab CI
only:
  - merge_requests
```

### Skip on Draft PRs
```yaml
# GitHub Actions
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    if: github.event.pull_request.draft == false
    # ...
```

### Parallel Execution
```yaml
# GitHub Actions
jobs:
  review:
    # ...
  test:
    # ...
  # Both run in parallel
```

### Caching
```yaml
# GitHub Actions
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
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

## Best Practices

1. **Fail fast:** Fail CI on critical issues, don't block on warnings
2. **Cache results:** Cache review results to speed up CI
3. **Parallel execution:** Run review and tests in parallel
4. **Conditional execution:** Only run on PRs, skip on drafts
5. **Error handling:** Handle network errors, API failures gracefully
6. **Monitoring:** Track CI performance, error rates
7. **Secrets management:** Store API keys in CI secrets, never in code

---

## Troubleshooting

### Common Issues

**Issue:** Review fails with "Unauthorized"
- **Solution:** Check API key is set correctly in secrets

**Issue:** Coverage check fails
- **Solution:** Ensure coverage report is generated and path is correct

**Issue:** Tests not generated
- **Solution:** Check AI detection config, ensure files are AI-touched

**Issue:** CI slow
- **Solution:** Enable caching, run review and tests in parallel

---

## Support

- **Documentation:** https://docs.readylayer.com/ci
- **Examples:** https://github.com/readylayer/examples
- **Support:** support@readylayer.com
