# First Governed PR in 10 Minutes

**Goal:** Go from zero to a governed pull request in under 10 minutes

**Stack:** Works with any git provider, any language, any CI/CD

---

## Prerequisites

- Git repository (GitHub, GitLab, or Bitbucket)
- Terminal access
- 10 minutes

**Optional:**
- Docker (for self-hosted mode)
- Node.js 20+ (for local CLI)

---

## Option A: GitHub Action (Self-Hosted)

**Time: 5 minutes**

**Note:** Pre-built GitHub Action coming Q2 2026. For now, use Docker-based workflow.

### Step 1: Add GitHub Action (2 minutes)

Create `.github/workflows/readylayer.yml`:

```yaml
name: ReadyLayer Governance

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run ReadyLayer (Docker)
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            ghcr.io/hardonian/readylayer:latest \
            scan --path /workspace --policy /workspace/.readylayer/policy.yml
```

Commit and push:

```bash
git add .github/workflows/readylayer.yml
git commit -m "feat: add ReadyLayer governance"
git push
```

### Step 2: Create Policy File (2 minutes)

Create policy directory and file manually:

```bash
mkdir -p .readylayer

cat > .readylayer/policy.yml << 'EOF'
version: 1

# Security scanning
review_guard:
  enabled: true
  block_on_critical: true
  rules:
    - owasp-top-10
    - secrets-detection

# Test coverage
test_engine:
  enabled: true
  minimum_coverage: 80
  allow_coverage_decrease: false

# Documentation validation
doc_sync:
  enabled: false  # Optional for quick start
EOF
```

**Note:** `readylayer init` creates CLI config (`.readylayer.json`), not policy file. Create policy manually as shown above.

Commit and push:

```bash
git add .readylayer/policy.yml
git commit -m "feat: add ReadyLayer policy"
git push
```

### Step 3: Create Test PR (1 minute)

Create a branch with intentionally bad code:

```bash
git checkout -b test-readylayer

# Create a file with SQL injection
cat > test-security.js << 'EOF'
// This code has a SQL injection vulnerability
function getUser(userId) {
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return db.query(query);
}
EOF

git add test-security.js
git commit -m "test: add vulnerable code"
git push -u origin test-readylayer
```

Create PR on GitHub: https://github.com/YOUR_ORG/YOUR_REPO/compare/main...test-readylayer

### Step 4: Watch Governance in Action

ReadyLayer will:
1. ✅ Scan for security issues
2. ❌ **Block PR** with feedback:

```
❌ BLOCKED: Critical security issues detected

Security Issues (1 blocking):
1. [CRITICAL] SQL injection risk at test-security.js:3
   - User input directly in query string
   - Recommendation: Use parameterized queries

Remediation:
```javascript
function getUser(userId) {
  const query = 'SELECT * FROM users WHERE id = ?';
  return db.query(query, [userId]);
}
```
```

**Total time: ~3 minutes**

---

## Option B: GitLab CI (Stack-Neutral)

**Time: 5 minutes**

**Note:** Docker image available for self-hosted deployments. Build from source or use pre-built image.

### Step 1: Add GitLab CI Config (2 minutes)

Create `.gitlab-ci.yml`:

```yaml
stages:
  - governance

readylayer:
  stage: governance
  image: ghcr.io/hardonian/readylayer:latest
  script:
    - readylayer scan --path . --policy .readylayer/policy.yml
  only:
    - merge_requests
```

**Alternative (build from source):**

```yaml
readylayer:
  stage: governance
  image: node:20
  script:
    - npm install -g readylayer-cli
    - readylayer review $(git diff --name-only HEAD~1)
  only:
    - merge_requests
```

### Step 2: Create Policy File (1 minute)

Same as GitHub Action (Step 2 above).

### Step 3: Create Test Merge Request (2 minutes)

```bash
git checkout -b test-readylayer

# Create vulnerable code
cat > api/routes.py << 'EOF'
# SQL injection vulnerability
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
EOF

git add api/routes.py
git commit -m "test: add vulnerable code"
git push -u origin test-readylayer
```

Create MR on GitLab: Project → Merge Requests → New merge request

**Total time: ~5 minutes**

---

## Option C: Docker (Any CI/CD)

**Time: 10 minutes (includes build from source)**

### Step 1: Build or Pull Docker Image (3 minutes)

**Option 1: Build from source (recommended for now):**

```bash
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
docker build -t readylayer:local .
```

**Option 2: Pull pre-built image (if available):**

```bash
docker pull ghcr.io/hardonian/readylayer:latest
```

### Step 2: Create Policy File (1 minute)

Same as above.

### Step 3: Run Locally (2 minutes)

**Full repository scan (Docker):**

```bash
# Using locally built image
docker run --rm \
  -v $(pwd):/workspace \
  readylayer:local \
  scan --path /workspace --policy /workspace/.readylayer/policy.yml
```

**Single file review (CLI):**

```bash
# Install CLI
npm install -g readylayer-cli

# Review specific file
readylayer review src/index.js --repository YOUR_REPO_ID
```

**Note:** CLI `review` command reviews single files. Full repository `scan` requires Docker mode.

### Step 4: Add to CI/CD (3 minutes)

**Jenkins:**

```groovy
pipeline {
  agent any
  stages {
    stage('Governance') {
      steps {
        script {
          docker.image('readylayer/readylayer:latest').inside {
            sh 'readylayer scan --path . --policy .readylayer/policy.yml'
          }
        }
      }
    }
  }
}
```

**CircleCI:**

```yaml
version: 2.1
jobs:
  governance:
    docker:
      - image: readylayer/readylayer:latest
    steps:
      - checkout
      - run: readylayer scan --path . --policy .readylayer/policy.yml

workflows:
  version: 2
  governance:
    jobs:
      - governance
```

**Bitbucket Pipelines:**

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: ReadyLayer Governance
          image: readylayer/readylayer:latest
          script:
            - readylayer scan --path . --policy .readylayer/policy.yml
```

**Total time: ~7 minutes**

---

## Quick Policy Templates

### Minimal (Security Only)

```yaml
version: 1

review_guard:
  enabled: true
  block_on_critical: true
  rules:
    - secrets-detection
    - sql-injection
    - xss

test_engine:
  enabled: false

doc_sync:
  enabled: false
```

### Standard (Security + Tests)

```yaml
version: 1

review_guard:
  enabled: true
  block_on_critical: true
  rules:
    - owasp-top-10
    - secrets-detection

test_engine:
  enabled: true
  minimum_coverage: 80
  enforce_incremental: true

doc_sync:
  enabled: false
```

### Strict (Everything)

```yaml
version: 1

review_guard:
  enabled: true
  block_on_critical: true
  block_on_high: true
  rules:
    - owasp-top-10
    - secrets-detection
    - dependency-vulnerabilities

test_engine:
  enabled: true
  minimum_coverage: 85
  allow_coverage_decrease: false
  enforce_incremental: true

doc_sync:
  enabled: true
  documentation_required: true
  block_on_drift: true
```

---

## Common Issues & Quick Fixes

### Issue: "Policy file not found"

**Fix:**

```bash
# Create policy directory and file manually
mkdir -p .readylayer

cat > .readylayer/policy.yml << 'EOF'
version: 1
review_guard:
  enabled: true
  rules:
    - owasp-top-10
    - secrets-detection
EOF
```

**Note:** `readylayer init` creates CLI config (`.readylayer.json`), not policy file (`.readylayer/policy.yml`).

### Issue: "No test framework detected"

**Fix:**

Add to policy:

```yaml
test_engine:
  framework: jest  # or vitest, pytest, go, etc.
```

Or disable test checks:

```yaml
test_engine:
  enabled: false
```

### Issue: "Security scan blocking valid code"

**Fix:**

Add waiver:

```yaml
review_guard:
  waivers:
    - issue_id: sql-injection-line-42
      reason: "Using parameterized query library"
      expires: 2026-12-31
```

### Issue: "Coverage below threshold"

**Fix (short-term):**

Lower threshold:

```yaml
test_engine:
  minimum_coverage: 70  # Down from 80
```

**Fix (correct):**

Add tests:

```bash
npm test -- --coverage
# See what's uncovered, add tests
```

---

## Next Steps After First PR

### 1. Customize Policy

```yaml
# Add custom rules
custom_rules:
  - id: no-console-log
    pattern: "console.log"
    severity: medium
    message: "Use logger instead"
    paths: ["src/**/*.ts"]
```

### 2. Set Up Self-Hosting (Optional)

```bash
# For full audit trail and no external dependencies
docker-compose up -d

# See docs/DEPLOYMENT-GUIDE.md
```

### 3. Add LLM Enhancement (Optional)

```yaml
# .env
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

LLM provides:
- Test generation suggestions
- Code explanations
- Security improvement recommendations

**Not required for core governance.**

### 4. Invite Team

Share policy file with team:

```bash
# Team reviews and approves policy
git add .readylayer/policy.yml
git commit -m "docs: add governance policy"
git push
```

### 5. Monitor & Iterate

Check governance metrics:

```bash
readylayer stats --org YOUR_ORG

# Example output:
# PRs scanned: 127
# PRs blocked: 12 (9%)
# Security issues: 18 (14 resolved, 4 waived)
# Coverage: 82% average
```

---

## Verification Checklist

After setup, verify:

- [ ] Policy file committed (`.readylayer/policy.yml`)
- [ ] CI/CD configured (GitHub Action / GitLab CI / Jenkins)
- [ ] Test PR created
- [ ] ReadyLayer ran and provided feedback
- [ ] Security issues detected (or "all clear" message)
- [ ] PR blocked (if vulnerable code) or approved (if clean)

---

## Examples by Language

### JavaScript/TypeScript

**Vulnerable code:**

```javascript
// SQL injection
const query = `SELECT * FROM users WHERE id = ${req.params.id}`;

// XSS
document.innerHTML = userInput;

// Hardcoded secret
const apiKey = 'sk-proj-abcdef123456';
```

**Fixed code:**

```javascript
// Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [req.params.id]);

// Sanitized
element.textContent = userInput;

// Environment variable
const apiKey = process.env.API_KEY;
```

### Python

**Vulnerable code:**

```python
# SQL injection
query = f"SELECT * FROM users WHERE id = {user_id}"

# Command injection
os.system(f"ping {user_input}")

# Hardcoded secret
API_KEY = "sk-abc123"
```

**Fixed code:**

```python
# Parameterized query
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))

# Subprocess with args
subprocess.run(["ping", user_input])

# Environment variable
API_KEY = os.environ.get("API_KEY")
```

### Go

**Vulnerable code:**

```go
// SQL injection
query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", userID)

// Path traversal
filepath := "/uploads/" + userInput
```

**Fixed code:**

```go
// Parameterized query
query := "SELECT * FROM users WHERE id = ?"
db.Query(query, userID)

// Path sanitization
filepath := filepath.Clean(path.Join("/uploads", userInput))
```

---

## Minimal Example: Complete Workflow

**1. Initialize repository:**

```bash
mkdir my-project
cd my-project
git init
```

**2. Add policy:**

```bash
readylayer init  # Creates .readylayer/policy.yml
```

**3. Add CI:**

```yaml
# .github/workflows/readylayer.yml
name: Governance
on: [pull_request]
jobs:
  readylayer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: readylayer/readylayer-action@v1
```

**4. Commit:**

```bash
git add .
git commit -m "feat: add ReadyLayer governance"
git push
```

**5. Create test PR:**

```bash
git checkout -b test
echo "const query = \`SELECT * FROM users WHERE id = \${id}\`;" > test.js
git add test.js
git commit -m "test: vulnerable code"
git push -u origin test
```

**6. Open PR and watch ReadyLayer block it.**

**Total time: < 10 minutes**

---

## Stack-Neutral Summary

ReadyLayer works with:

| Category | Support |
|----------|---------|
| **Git providers** | GitHub, GitLab, Bitbucket, any git host |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitbucket Pipelines, any Docker-compatible CI |
| **Languages** | JavaScript, TypeScript, Python, Go, Rust, Java, C# (extensible) |
| **Test frameworks** | Jest, Vitest, pytest, go test, cargo test, JUnit (auto-detected) |
| **Deployment** | Cloud, on-premise, local, Docker, Kubernetes, serverless |

**No vendor lock-in. No platform assumptions.**

---

## Getting Help

- **Documentation:** https://github.com/Hardonian/ReadyLayer/tree/main/docs
- **Issues:** https://github.com/Hardonian/ReadyLayer/issues
- **Examples:** https://github.com/Hardonian/ReadyLayer/tree/main/examples

---

<div align="center">

**First governed PR in < 10 minutes.**

Security, testing, and documentation governance with zero lock-in.

</div>
