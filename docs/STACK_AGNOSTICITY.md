# Stack Agnosticity

**Last Updated:** 2026-01-24
**Purpose:** Define ReadyLayer's commitment to multi-stack, multi-platform, multi-environment support

---

## Philosophy

**ReadyLayer is governance infrastructure, not a platform play.**

We intentionally do not lock users into:
- Specific git providers
- Specific CI/CD systems
- Specific cloud vendors
- Specific programming languages
- Specific test frameworks
- Specific IDEs

**Why?** Governance tooling must adapt to **your** workflow, not force you to adopt **ours**.

---

## What ReadyLayer Does NOT Assume

### ❌ Git Provider

**We do NOT assume GitHub.**

✅ **Supported:**
- GitHub (first-class support)
- GitLab (first-class support)
- Bitbucket (first-class support)
- Any git provider with webhooks (extensible)

**How:**
- Abstract git operations behind `services/git-provider/` interface
- Provider-specific adapters in `services/git-provider/adapters/`
- Configuration via `.readylayer/policy.yml` to specify provider

**Adding a new provider:**
```typescript
// services/git-provider/adapters/my-provider.ts
export class MyProviderAdapter implements GitProviderAdapter {
  async fetchPullRequest(id: string): Promise<PullRequest> { ... }
  async postComment(pr: string, comment: string): Promise<void> { ... }
  // ...
}
```

---

### ❌ CI/CD System

**We do NOT assume GitHub Actions.**

✅ **Supported:**
- GitHub Actions (reference implementation)
- GitLab CI (native support)
- Bitbucket Pipelines (native support)
- Jenkins (Docker executor)
- CircleCI (Docker executor)
- Travis CI (Docker executor)
- Any CI system with Docker support

**How:**
- CLI tool (`readylayer scan`) works anywhere
- Docker image runs on any container platform
- No GitHub Actions-specific logic in core engines

**Portability proof:**
```bash
# GitHub Actions
- uses: readylayer/readylayer-action@v1

# GitLab CI
script:
  - docker run readylayer/readylayer scan

# Jenkins
docker.image('readylayer/readylayer').inside {
  sh 'readylayer scan'
}
```

---

### ❌ Cloud Provider

**We do NOT assume AWS, GCP, Azure, or Vercel.**

✅ **Deployment Options:**
- Self-hosted (Docker on any infrastructure)
- Kubernetes (any cloud or on-premise)
- Serverless (AWS Lambda, GCP Cloud Run, Azure Functions)
- Bare metal
- Local development (no cloud required)

**How:**
- Database: PostgreSQL (runs anywhere)
- Cache: Redis (optional, runs anywhere)
- Storage: Local filesystem or S3-compatible (configurable)
- No vendor-specific APIs in core logic

**Anti-pattern we avoid:**
```typescript
// ❌ BAD: Vendor lock-in
import { S3 } from 'aws-sdk';
const s3 = new S3();

// ✅ GOOD: Abstraction
import { StorageProvider } from '@/lib/storage';
const storage = StorageProvider.create(config.storageType);
```

---

### ❌ Programming Language

**We do NOT assume JavaScript/TypeScript only.**

✅ **Language Support:**
- **Current:** JavaScript, TypeScript (via AST parsing)
- **Roadmap Q3 2026:** Python, Go, Rust
- **Extensible:** Plugin system for any language

**How:**
- Language detection via file extensions
- Language-specific rules in `services/review-guard/rules/{language}/`
- Test framework detection is language-aware
- Policy rules are language-specific

**Language-specific scanning:**
```yaml
# .readylayer/policy.yml
review_guard:
  rules:
    javascript:
      - no-eval
      - no-xss
    python:
      - no-exec
      - no-sql-injection
    go:
      - no-unsafe-pointer
```

---

### ❌ Test Framework

**We do NOT assume Jest or Vitest.**

✅ **Framework Support:**
- **JavaScript/TypeScript:** Jest, Vitest, Mocha, Jasmine, Ava
- **Python:** pytest, unittest, nose
- **Go:** go test
- **Rust:** cargo test
- **Extensible:** Auto-detection via configuration files

**How:**
- Framework detection in `services/test-engine/detectors/`
- Coverage parsing adapters for each framework
- Configuration-based framework selection

**Framework detection:**
```typescript
// services/test-engine/detectors/framework-detector.ts
export function detectFramework(projectPath: string): TestFramework {
  if (fs.existsSync('vitest.config.ts')) return 'vitest';
  if (fs.existsSync('jest.config.js')) return 'jest';
  if (fs.existsSync('pytest.ini')) return 'pytest';
  // ...
}
```

---

### ❌ IDE or Editor

**We do NOT assume VS Code.**

✅ **Editor Support:**
- **Current:** CLI works in any editor
- **Planned:** VS Code extension (Q1 2026)
- **Planned:** IntelliJ plugin (Q2 2026)
- **Planned:** Vim plugin (Q2 2026)
- **Always:** CLI as universal interface

**How:**
- Core logic is editor-agnostic
- Extensions are thin wrappers around CLI
- Language Server Protocol (LSP) for future integration

**Universal CLI:**
```bash
# Works in any editor
readylayer scan --path ./src
readylayer validate-policy --file .readylayer/policy.yml
```

---

### ❌ Operating System

**We do NOT assume Linux.**

✅ **OS Support:**
- Linux (primary target)
- macOS (fully supported)
- Windows (via WSL or Docker)
- Any OS with Docker support

**How:**
- Cross-platform file path handling
- No OS-specific shell commands
- Docker for portability
- Node.js for cross-platform runtime

---

### ❌ Authentication Provider

**We do NOT assume GitHub OAuth only.**

✅ **Auth Options:**
- **Self-hosted:** GitHub OAuth, GitLab OAuth, Bitbucket OAuth
- **Extensible:** SAML, LDAP, Okta, Azure AD (via plugins)
- **Local dev:** No auth required (in-memory mode)

**How:**
- Authentication abstracted in `lib/auth/`
- Provider-specific adapters
- Configurable via environment variables

```bash
# GitHub OAuth
AUTH_PROVIDER=github
GITHUB_CLIENT_ID=...

# GitLab OAuth
AUTH_PROVIDER=gitlab
GITLAB_CLIENT_ID=...

# SAML (enterprise)
AUTH_PROVIDER=saml
SAML_ENTRY_POINT=...
```

---

### ❌ Database Vendor

**We do NOT assume PostgreSQL is required.**

✅ **Database Options:**
- **Production:** PostgreSQL (recommended)
- **Development:** SQLite (in-memory, no setup)
- **Extensible:** Any Prisma-supported database (MySQL, SQL Server, CockroachDB)

**How:**
- Prisma ORM abstracts database layer
- Migrations work across databases
- Local dev uses SQLite automatically

```bash
# PostgreSQL (production)
DATABASE_URL=postgresql://user:pass@localhost:5432/readylayer

# SQLite (dev)
DATABASE_URL=file:./dev.db

# MySQL (alternative)
DATABASE_URL=mysql://user:pass@localhost:3306/readylayer
```

---

## What ReadyLayer DOES Require

### ✅ Minimum Requirements

**Runtime:**
- Node.js 20+ (for CLI and self-hosted)
- OR Docker (for containerized deployment)

**Storage:**
- Git repository (any provider)
- Filesystem access (for scanning)
- Optional: PostgreSQL (for persistence)
- Optional: Redis (for job queue)

**Network:**
- HTTPS for webhooks (if using webhook integration)
- Outbound internet for LLM calls (if using AI features)

**That's it.** No other dependencies.

---

## Extension Points

### How to Add Support for New Platforms

ReadyLayer is designed to be extended without modifying core code.

#### 1. Adding a New Git Provider

```typescript
// services/git-provider/adapters/my-git-provider.ts
import { GitProviderAdapter } from '../types';

export class MyGitProviderAdapter implements GitProviderAdapter {
  async fetchPullRequest(id: string): Promise<PullRequest> {
    // Call your git provider's API
  }

  async postComment(prId: string, comment: string): Promise<void> {
    // Post comment via API
  }

  // ... implement other methods
}
```

#### 2. Adding a New Test Framework

```typescript
// services/test-engine/adapters/my-framework.ts
import { TestFrameworkAdapter } from '../types';

export class MyFrameworkAdapter implements TestFrameworkAdapter {
  async runTests(config: TestConfig): Promise<TestResults> {
    // Execute tests for your framework
  }

  async parseCoverage(coveragePath: string): Promise<Coverage> {
    // Parse coverage report
  }
}
```

#### 3. Adding a New Language

```yaml
# .readylayer/plugins/my-language.yml
language: kotlin
file_extensions: [.kt, .kts]
rules:
  - id: no-unsafe-cast
    severity: high
    pattern: "as!"
    message: "Unsafe cast detected"
```

---

## Anti-Patterns We Avoid

### ❌ GitHub-Specific Logic in Core

**Bad:**
```typescript
// ❌ Don't do this
if (provider === 'github') {
  const octokit = new Octokit();
  return octokit.pulls.get({ ... });
}
```

**Good:**
```typescript
// ✅ Do this instead
const gitProvider = GitProviderFactory.create(config.provider);
return gitProvider.fetchPullRequest(id);
```

---

### ❌ Hardcoded CI/CD Commands

**Bad:**
```typescript
// ❌ Don't do this
const ciCommand = 'gh workflow run ci.yml';
```

**Good:**
```typescript
// ✅ Do this instead
const ciCommand = config.ciProvider.getWorkflowCommand('ci');
```

---

### ❌ Cloud-Specific APIs

**Bad:**
```typescript
// ❌ Don't do this
import { S3 } from 'aws-sdk';
const file = await s3.getObject({ Bucket, Key }).promise();
```

**Good:**
```typescript
// ✅ Do this instead
import { storage } from '@/lib/storage';
const file = await storage.get(key);
```

---

## Testing Stack Agnosticity

### Verification Matrix

We test ReadyLayer on:

| Dimension | Configurations Tested |
|-----------|----------------------|
| **Git Providers** | GitHub, GitLab, Bitbucket |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins (Docker) |
| **Databases** | PostgreSQL, SQLite, MySQL |
| **Operating Systems** | Ubuntu, macOS, Windows (WSL) |
| **Languages** | TypeScript, JavaScript, Python (roadmap) |
| **Test Frameworks** | Vitest, Jest, pytest (roadmap) |

**Goal:** 100% compatibility across all combinations.

---

## Roadmap: Expanding Agnosticity

### Q1 2026
- ✅ GitHub, GitLab, Bitbucket parity
- ✅ Multi-database support (PostgreSQL, SQLite, MySQL)
- ✅ Docker-first deployment

### Q2 2026
- 🔄 Jenkins native plugin
- 🔄 CircleCI orb
- 🔄 Travis CI integration

### Q3 2026
- 🔄 Python language support
- 🔄 Go language support
- 🔄 Rust language support

### Q4 2026
- 🔄 Kubernetes Operator
- 🔄 Terraform provider
- 🔄 CloudFormation templates

---

## Community Contributions

**Want to add support for a new platform?**

1. Check if an adapter already exists
2. File an RFC with your proposal
3. Implement the adapter following the interface
4. Add tests for the new platform
5. Submit a PR

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

---

## FAQs

### Why not just support GitHub?

**Answer:** Governance tooling is infrastructure. Infrastructure must be portable. Vendor lock-in is antithetical to open source.

### How do you maintain compatibility across platforms?

**Answer:** Abstraction layers, interface-based design, and comprehensive testing.

### What if I use a platform you don't support yet?

**Answer:** File a feature request or contribute an adapter. We prioritize based on community demand.

### Can I use ReadyLayer without any cloud services?

**Answer:** Yes! Self-hosted mode works entirely on-premise with no external dependencies.

---

## Related Documents

- [Why Open Source](./WHY_OPEN_SOURCE.md)
- [OSS vs Enterprise Boundary](./OSS_VS_ENTERPRISE_BOUNDARY.md)
- [Architecture Documentation](./architecture/)

---

<div align="center">

**ReadyLayer is portable by design.**

No vendor lock-in. No platform assumptions. Your workflow, your choice.

</div>
